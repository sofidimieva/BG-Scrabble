import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import { useGameState } from './hooks/useGameState';
import { useWordValidator } from './hooks/useWordValidator';
import { useTimer } from './hooks/useTimer';
import { WebSocketChannel, useMultiplayerChannel, type MultiplayerMessage } from './hooks/useMultiplayer';
import { calculateScore, getNewlyPlacedTiles } from './utils/scoringEngine';
import { RACK_SIZE } from './constants';
import type { TileData } from './types';

import LobbyScreen from './components/LobbyScreen';
import GameScoreboard from './components/GameScoreboard';
// import StatusBar from './components/StatusBar';
import GameBoard from './components/GameBoard';
import TileRack from './components/TileRack';


interface GameConfig {
  gameCode: string;
  isHost: boolean;
  myName: string;
  opponentName: string;
  timerSeconds: number;
  // Guest-only: passed from WaitingScreen after receiving START_GAME
  guestRack?: TileData[];
  hostTileBag?: TileData[];
}

type Screen = 'lobby' | 'waiting' | 'game';

// ─── Persistent channel (lives outside React) ────────────────────
const wsChannel = new WebSocketChannel();

// ─── Game Screen ──────────────────────────────────────────────────
function GameScreen({ config, onExit }: { config: GameConfig; onExit: () => void }) {
  const {
    state,
    placeTile,
    removeTileFromBoard,
    recallTiles,
    shuffleRack,
    submitWord,
    exchangeTiles,
    reorderRack,
    syncBoard,
    setCustomTimer,
    initializeFromHost,
  } = useGameState();

  const validate = useWordValidator();
  const mp = useMultiplayerChannel(wsChannel);
  const [activeTile, setActiveTile] = useState<TileData | null>(null);
  const [ghostTile, setGhostTile] = useState<TileData | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [opponentName, setOpponentName] = useState(config.opponentName);
  const [opponentScore, setOpponentScore] = useState(0);
  const [waitingForOpponent, setWaitingForOpponent] = useState(config.isHost);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const initDoneRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [myMoves, setMyMoves] = useState<{ words: string[]; score: number }[]>([]);
  const [opponentMoves, setOpponentMoves] = useState<{ words: string[]; score: number }[]>([]);

  const handleMyTimeUp = useCallback(() => {
    if (gameOver) return;
    setGameOver(true);
    setWinner(opponentName);
    mp.sendMessage({
      type: 'TIME_UP',
      loserName: config.myName,
      myScore: state.playerScore,
      opponentScore: opponentScore,
    });
  }, [gameOver, opponentName, config.myName, state.playerScore, opponentScore, mp]);

  const handleOpponentTimeUp = useCallback(() => {
    // Opponent's timer ran out on my screen — this means I won
    if (gameOver) return;
    setGameOver(true);
    setWinner(config.myName);
    mp.sendMessage({
      type: 'TIME_UP',
      loserName: opponentName,
      myScore: state.playerScore,
      opponentScore: opponentScore,
    });
  }, [gameOver, config.myName, opponentName, state.playerScore, opponentScore, mp]);

  const {
    myTimeLeft,
    opponentTimeLeft,
    setOpponentTime,
    formatTime,
  } = useTimer(handleMyTimeUp, handleOpponentTimeUp, isMyTurn, !waitingForOpponent && !gameOver, config.timerSeconds);

  // Set custom timer
  useEffect(() => {
    setCustomTimer(config.timerSeconds);
  }, [config.timerSeconds, setCustomTimer]);

  // Guest: initialize from host data passed via config (since START_GAME was consumed by WaitingScreen)
  useEffect(() => {
    if (!config.isHost && config.guestRack && config.hostTileBag && !initDoneRef.current) {
      initDoneRef.current = true;
      initializeFromHost(config.guestRack, config.hostTileBag);
      setCustomTimer(config.timerSeconds);
      setIsMyTurn(false);
    }
  }, [config.isHost, config.guestRack, config.hostTileBag, config.timerSeconds, initializeFromHost, setCustomTimer]);

  // Host: explicitly start the game after guest connects
  const handleStartGameClick = useCallback(() => {
    if (!config.isHost || initDoneRef.current) return;
    initDoneRef.current = true;
    setOpponentName(mp.opponentName);
    setWaitingForOpponent(false);
    setIsMyTurn(true);

    mp.sendMessage({
      type: 'START_GAME',
      hostName: config.myName,
      guestName: mp.opponentName,
      tileBag: state.tileBag,
      hostRack: state.playerRack,
      guestRack: state.robotRack,
      timerSeconds: config.timerSeconds,
    });
  }, [config.isHost, config.myName, mp, state.tileBag, state.playerRack, state.robotRack, config.timerSeconds]);

  // Listen for game messages
  useEffect(() => {
    mp.onMessage((msg: MultiplayerMessage) => {
      switch (msg.type) {
        case 'START_GAME':
          if (!config.isHost) {
            setOpponentName(msg.hostName);
            initializeFromHost(msg.guestRack, msg.tileBag);
            setCustomTimer(msg.timerSeconds);
            setIsMyTurn(false);
          }
          break;

        case 'SUBMIT_MOVE':
          syncBoard(msg.board, msg.tileBag, msg.tilesRemaining);
          setOpponentScore((prev) => prev + msg.score);
          setOpponentTime(msg.timeLeft);
          setOpponentMoves(prev => [...prev, { words: msg.words, score: msg.score }]);
          setIsMyTurn(true);
          setMessage(`Опонент: ${msg.words.join(', ')} — +${msg.score} точки`);
          setTimeout(() => setMessage(null), 3000);
          break;

        case 'PASS':
          setOpponentTime(msg.timeLeft);
          setIsMyTurn(true);
          setMessage('Опонентът пасува');
          setTimeout(() => setMessage(null), 2000);
          break;

        case 'TIME_UP':
          setGameOver(true);
          if (msg.loserName === config.myName) {
            setWinner(opponentName);
          } else {
            setWinner(config.myName);
          }
          break;

        case 'LEAVE':
          setMessage('Опонентът напусна играта');
          setTimeout(() => { onExit(); }, 2000);
          break;
      }
    });
  }, [config.isHost, config.myName, opponentName, mp, syncBoard, initializeFromHost, setCustomTimer, onExit]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 10 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    if (!isMyTurn || gameOver) return;
    const tile = event.active.data.current?.tile as TileData | undefined;
    if (tile) { setActiveTile(tile); setGhostTile(tile); }
  }, [isMyTurn, gameOver]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    if (!isMyTurn || gameOver) return;
    const tile = event.active.data.current?.tile as TileData | undefined;
    if (tile) setGhostTile(tile);
  }, [isMyTurn, gameOver]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTile(null);
      setGhostTile(null);
      if (!isMyTurn || gameOver) return;

      const { active, over } = event;
      if (!over) return;

      const activeSrc = active.data.current?.source as string | undefined;
      const tile = active.data.current?.tile as TileData | undefined;

      // Dropping onto a board cell
      if (over.id.toString().startsWith('cell-')) {
        const overData = over.data.current as { row: number; col: number } | undefined;
        if (!overData || !tile) return;
        if (activeSrc === 'board') {
          for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
              if (state.boardGrid[r][c].tile?.id === tile.id && state.boardGrid[r][c].isNew) {
                removeTileFromBoard(r, c);
                break;
              }
            }
          }
        }
        placeTile(tile.id, overData.row, overData.col);
        setMessage(null);
        return;
      }

      // Dropping from board back to rack (including the rack droppable area)
      if (activeSrc === 'board' && (over.data.current?.source === 'rack' || over.id === 'tile-rack')) {
        if (!tile) return;
        for (let r = 0; r < 15; r++) {
          for (let c = 0; c < 15; c++) {
            if (state.boardGrid[r][c].tile?.id === tile.id && state.boardGrid[r][c].isNew) {
              removeTileFromBoard(r, c);
              setMessage(null);
              return;
            }
          }
        }
      }

      // Reordering in rack
      if (activeSrc === 'rack' && over.data.current?.sortable) {
        if (active.id !== over.id) {
          reorderRack(active.id.toString(), over.id.toString());
        }
      }
    },
    [isMyTurn, gameOver, placeTile, removeTileFromBoard, reorderRack, state.boardGrid]
  );

  const handlePlay = useCallback(() => {
    if (!isMyTurn || gameOver) return;
    const result = validate(state.boardGrid);
    if (!result.valid) {
      setMessage(result.error || 'Невалиден ход');
      return;
    }

    const placed = getNewlyPlacedTiles(state.boardGrid);
    const score = calculateScore(state.boardGrid, placed);
    const formedWords = result.words || [];

    // Compute post-draw state BEFORE dispatching to avoid stale state
    const tilesToDraw = RACK_SIZE - state.playerRack.length;
    const newBag = [...state.tileBag];
    const drawnTiles = newBag.splice(0, tilesToDraw);
    const newRack = [...state.playerRack, ...drawnTiles];

    submitWord(score, drawnTiles, newBag);

    // Add to my move history
    setMyMoves(prev => [...prev, { words: formedWords, score }]);

    const committedBoard = state.boardGrid.map((row) =>
      row.map((cell) => cell.isNew ? { ...cell, isNew: false } : { ...cell }));

    mp.sendMessage({
      type: 'SUBMIT_MOVE',
      board: committedBoard,
      score,
      newRack: newRack,
      tileBag: newBag,
      tilesRemaining: newBag.length,
      timeLeft: myTimeLeft,
      words: formedWords,
    });

    setIsMyTurn(false);
    setMessage(`✔ ${formedWords.join(', получаваш ')}  +${score} точки!`);
    setTimeout(() => setMessage(null), 3000);
  }, [isMyTurn, gameOver, state.boardGrid, state.playerRack, state.tileBag, validate, submitWord, myTimeLeft, mp]);

  const handlePass = useCallback(() => {
    if (!isMyTurn || gameOver) return;
    recallTiles();
    mp.sendMessage({ type: 'PASS', timeLeft: myTimeLeft });
    setIsMyTurn(false);
    setMessage('Пропуснат ход');
    setTimeout(() => setMessage(null), 2000);
  }, [isMyTurn, gameOver, recallTiles, myTimeLeft, mp]);

  const handleExchange = useCallback(() => {
    if (!isMyTurn || gameOver) return;
    const tileIds = state.playerRack.map((t) => t.id);
    if (tileIds.length > 0) {
      recallTiles();
      exchangeTiles(tileIds);
      setMessage('Плочките бяха сменени');
      setTimeout(() => setMessage(null), 2000);
      // Exchange does NOT pass turn — player keeps their turn with new tiles
    }
  }, [isMyTurn, gameOver, state.playerRack, recallTiles, exchangeTiles]);

  const handleShuffle = useCallback(() => {
    if (!isMyTurn || gameOver) return;
    shuffleRack();
  }, [isMyTurn, gameOver, shuffleRack]);

  const handleRecall = useCallback(() => {
    if (!isMyTurn || gameOver) return;
    recallTiles();
    setMessage(null);
  }, [isMyTurn, gameOver, recallTiles]);

  const handleExit = useCallback(() => {
    mp.sendMessage({ type: 'LEAVE' });
    wsChannel.close();
    onExit();
  }, [mp, onExit]);

  const hasNewTiles = useMemo(() => {
    return state.boardGrid.some((row) => row.some((cell) => cell.isNew));
  }, [state.boardGrid]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-background-light text-[#0d191c] font-display min-h-screen flex flex-col">
        <GameScoreboard
          playerName={config.myName}
          opponentName={opponentName || 'Опонент'}
          playerScore={state.playerScore}
          opponentScore={opponentScore}
          myTimeLeft={myTimeLeft}
          opponentTimeLeft={opponentTimeLeft}
          formatTime={formatTime}
          isMyTurn={isMyTurn}
          gameCode={config.gameCode}
          onExit={handleExit}
        />

        {/* <StatusBar
          tilesRemaining={state.tilesRemaining}
          lastMoveScore={state.lastMoveScore}
        /> */}

        {/* Host waiting overlay */}
        {waitingForOpponent && (
          <div className="mx-4 mb-2 bg-white rounded-xl shadow-lg p-6 border border-[#e7f1f4] text-center">
            {mp.opponentConnected ? (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-3">
                  <span className="material-symbols-outlined text-green-600 text-3xl">person_check</span>
                </div>
                <h3 className="text-lg font-bold text-[#0d191c] mb-1">{mp.opponentName} се присъедини!</h3>
                <p className="text-sm text-[#498e9c] mb-4">Натисни бутона за да започнеш играта</p>
                <button
                  onClick={handleStartGameClick}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-black text-lg shadow-lg shadow-primary/30 hover:brightness-110 transition-all mb-3"
                >
                  <span className="material-symbols-outlined">play_arrow</span>
                  ЗАПОЧНИ ИГРАТА
                </button>
              </>
            ) : (
              <>
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/15 rounded-full mb-3">
                  <span className="material-symbols-outlined text-primary text-3xl">share</span>
                </div>
                <h3 className="text-lg font-bold text-[#0d191c] mb-1">Чакаме опонент...</h3>
                <p className="text-sm text-[#498e9c] mb-4">Сподели кода с приятеля си</p>

                <div className="bg-slate-50 rounded-xl p-3 mb-3">
                  <p className="text-xs font-bold text-[#498e9c] uppercase tracking-wider mb-1.5">Код на играта</p>
                  <div className="flex items-center justify-center gap-1.5">
                    {config.gameCode.split('').map((char, i) => (
                      <div key={i} className="w-9 h-11 bg-white rounded-lg shadow-sm border-2 border-primary/30 flex items-center justify-center">
                        <span className="text-xl font-black text-primary">{char}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(config.gameCode).catch(() => { });
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-sm hover:bg-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  {copied ? 'Копирано!' : 'Копирай кода'}
                </button>

                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-[#498e9c]">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                  <span>Очакваме играч...</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="mx-4 mb-2 bg-white rounded-xl shadow-lg p-6 border-2 border-primary text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/15 rounded-full mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontSize: '2.5rem' }}>
                {winner === config.myName ? 'emoji_events' : 'sentiment_dissatisfied'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#0d191c] mb-2">
              {winner === config.myName ? 'Победа!' : 'Край на играта'}
            </h2>
            <p className="text-sm text-[#498e9c] mb-6">
              {winner === config.myName
                ? 'Брavo! Спечели играта!'
                : `Времето изтече. ${winner} спечели!`
              }
            </p>

            <div className="space-y-2 mb-6">
              <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${winner === config.myName ? 'bg-primary/20 border-2 border-primary' : 'bg-slate-50'
                }`}>
                <span className="font-bold">{config.myName}</span>
                <span className="text-2xl font-black">{state.playerScore}</span>
              </div>
              <div className={`flex items-center justify-between px-4 py-3 rounded-lg ${winner === opponentName ? 'bg-primary/20 border-2 border-primary' : 'bg-slate-50'
                }`}>
                <span className="font-bold">{opponentName}</span>
                <span className="text-2xl font-black">{opponentScore}</span>
              </div>
            </div>

            <button
              onClick={handleExit}
              className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-white rounded-xl font-black text-lg shadow-lg shadow-primary/30 hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined">home</span>
              КЪМ LOBBY
            </button>
          </div>
        )}

        {/* Message bar and turn indicator */}
        {!waitingForOpponent && !gameOver && (
          <div className="px-3 py-1 flex-shrink-0">
            {message ? (
              <div className="px-3 py-1.5 bg-primary/20 text-primary text-xs font-bold text-center rounded-lg animate-[tile-pop_0.3s_ease-out]">
                {message}
              </div>
            ) : !isMyTurn ? (
              <div className="flex items-center justify-center gap-2 text-xs text-[#498e9c] font-bold">
                <div className="flex gap-0.5">
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <div className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
                Ходът на {opponentName || 'опонента'}...
              </div>
            ) : null}
          </div>
        )}

        {/* Only show game elements when not waiting for opponent */}
        {!waitingForOpponent && (
          <>
            {/* 3-column layout: my words | board | opponent words */}
            <div className="flex-1 flex min-h-0">
              {/* My word history - left panel — hidden on mobile */}
              <div className="hidden sm:flex w-28 flex-col p-1 overflow-hidden">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wider text-center mb-1 flex-shrink-0">{config.myName}</p>
                <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
                  {myMoves.map((move, i) => (
                    <div key={i} className="flex items-center justify-between px-1.5 py-0.5 bg-primary/10 rounded text-[10px]">
                      <span className="font-bold text-[#0d191c] truncate">{move.words.join(', ')}</span>
                      <span className="font-black text-primary ml-1 flex-shrink-0">+{move.score}</span>
                    </div>
                  ))}
                  {myMoves.length === 0 && (
                    <p className="text-[9px] text-slate-400 text-center italic mt-2">Няма ходове</p>
                  )}
                </div>
              </div>

              {/* Game Board - center */}
              <GameBoard board={state.boardGrid} ghostTile={isMyTurn ? ghostTile : null} />

              {/* Opponent word history - right panel — hidden on mobile */}
              <div className="hidden sm:flex w-28 flex-col p-1 overflow-hidden">
                <p className="text-[10px] font-bold text-[#498e9c] uppercase tracking-wider text-center mb-1 flex-shrink-0">{opponentName || 'Опонент'}</p>
                <div className="flex-1 overflow-y-auto space-y-0.5 scrollbar-thin">
                  {opponentMoves.map((move, i) => (
                    <div key={i} className="flex items-center justify-between px-1.5 py-0.5 bg-slate-100 rounded text-[10px]">
                      <span className="font-bold text-[#0d191c] truncate">{move.words.join(', ')}</span>
                      <span className="font-black text-[#498e9c] ml-1 flex-shrink-0">+{move.score}</span>
                    </div>
                  ))}
                  {opponentMoves.length === 0 && (
                    <p className="text-[9px] text-slate-400 text-center italic mt-2">Няма ходове</p>
                  )}
                </div>
              </div>
            </div>

            <footer className="bg-white pt-2 pb-3 px-3 rounded-t-xl shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
              {/* ИГРАЙ — full width above rack */}
              <button
                onClick={handlePlay}
                disabled={!hasNewTiles || !isMyTurn || gameOver}
                className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl font-black text-sm mb-2 shadow-md transition-all ${hasNewTiles && isMyTurn && !gameOver
                  ? 'bg-primary text-white shadow-primary/30 hover:brightness-110 active:scale-[0.98]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  }`}
              >
                <span className="material-symbols-outlined text-base">send</span>
                ИГРАЙ
              </button>

              {/* Rack */}
              <TileRack tiles={state.playerRack} />

              {/* Action buttons row — below rack */}
              <div className="flex gap-2">
                <button
                  onClick={handlePass}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-[10px] hover:bg-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">skip_next</span>
                  ПАС
                </button>
                <button
                  onClick={handleExchange}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-[10px] hover:bg-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">published_with_changes</span>
                  СМЯНА
                </button>
                <button
                  onClick={handleShuffle}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-[10px] hover:bg-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">shuffle</span>
                  РАЗБЪРКАЙ
                </button>
                <button
                  onClick={handleRecall}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-[10px] hover:bg-slate-200 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">undo</span>
                  ВЪРНИ
                </button>
              </div>
            </footer>
          </>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTile ? (
          <div className="size-12 bg-[#fde68a] rounded-lg shadow-xl border-b-4 border-slate-300 flex flex-col items-center justify-center drag-overlay-tile">
            <p className="text-xl font-bold leading-none">{activeTile.letter}</p>
            <p className="text-[0.6rem] self-end pr-1.5 font-bold">{activeTile.points}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Waiting Screen (Guest) ───────────────────────────────────────
function WaitingScreen({ config, onGameStart, onExit }: {
  config: GameConfig;
  onGameStart: (updatedConfig: GameConfig) => void;
  onExit: () => void;
}) {
  const mp = useMultiplayerChannel(wsChannel);
  const startedRef = useRef(false);

  useEffect(() => {
    mp.onMessage((msg: MultiplayerMessage) => {
      if (msg.type === 'START_GAME' && !startedRef.current) {
        startedRef.current = true;
        onGameStart({
          ...config,
          opponentName: msg.hostName,
          timerSeconds: msg.timerSeconds,
          guestRack: msg.guestRack,
          hostTileBag: msg.tileBag,
        });
      }
    });
  }, [mp, config, onGameStart]);

  return (
    <div className="bg-background-light font-display min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-80 h-80 bg-primary/8 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-white rounded-xl shadow-lg p-6 border border-[#e7f1f4] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/15 rounded-full mb-4">
            <span className="material-symbols-outlined text-primary" style={{ fontSize: '2rem' }}>hourglass_top</span>
          </div>
          <h2 className="text-xl font-bold text-[#0d191c] mb-2">В стаята си!</h2>
          <p className="text-sm text-[#498e9c] mb-4">Ти се присъедини като <strong>{config.myName}</strong></p>

          <div className="bg-slate-50 rounded-xl p-4 mb-4">
            <p className="text-xs font-bold text-[#498e9c] uppercase tracking-wider mb-2">Код на играта</p>
            <p className="text-2xl font-black text-primary tracking-wider">{config.gameCode}</p>
          </div>

          {mp.error && (
            <div className="flex items-center gap-2 justify-center px-3 py-2 bg-red-50 rounded-lg border border-red-200 mb-4">
              <span className="material-symbols-outlined text-red-600 text-lg">error</span>
              <span className="font-bold text-red-700 text-sm">{mp.error}</span>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-sm text-[#498e9c] mb-4">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
            <span>Чакаме домакина да започне...</span>
          </div>

          <button
            onClick={() => { wsChannel.close(); onExit(); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-100 rounded-lg text-[#498e9c] font-bold text-sm hover:bg-slate-200 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Назад
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────
function App() {

  const [screen, setScreen] = useState<Screen>('lobby');
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null);

  const handleStartGame = useCallback((config: GameConfig) => {
    // Open WebSocket channel ONCE here — it persists across all screens
    wsChannel.open(config.gameCode, config.isHost, config.myName);
    setGameConfig(config);
    if (config.isHost) {
      setScreen('game');
    } else {
      setScreen('waiting');
    }
  }, []);

  const handleGuestGameStart = useCallback((updatedConfig: GameConfig) => {
    setGameConfig(updatedConfig);
    setScreen('game');
  }, []);

  const handleExit = useCallback(() => {
    wsChannel.close();
    setScreen('lobby');
    setGameConfig(null);
  }, []);



  if (screen === 'lobby') {
    return <LobbyScreen onStartGame={handleStartGame} />;
  }

  if (screen === 'waiting' && gameConfig) {
    return <WaitingScreen config={gameConfig} onGameStart={handleGuestGameStart} onExit={handleExit} />;
  }

  if (screen === 'game' && gameConfig) {
    return <GameScreen config={gameConfig} onExit={handleExit} />;
  }

  return <LobbyScreen onStartGame={handleStartGame} />;
}

export default App;
