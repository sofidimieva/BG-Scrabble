import { useReducer, useCallback } from 'react';
import type { GameState, GameAction, CellData, TileData } from '../types';
import { BOARD_LAYOUT, RACK_SIZE, TIMER_SECONDS, createTileBag, shuffleArray } from '../constants';

function createInitialBoard(): CellData[][] {
    return BOARD_LAYOUT.map((row, r) =>
        row.map((multiplier, c) => ({
            row: r,
            col: c,
            multiplier,
            tile: null,
            isNew: false,
        }))
    );
}

function createInitialState(): GameState {
    const bag = createTileBag();
    const playerRack = bag.splice(0, RACK_SIZE);
    const robotRack = bag.splice(0, RACK_SIZE);

    return {
        boardGrid: createInitialBoard(),
        tileBag: bag,
        playerRack,
        robotRack,
        playerScore: 0,
        robotScore: 0,
        turnHistory: [],
        currentTurn: 'player',
        tilesRemaining: bag.length,
        lastMoveScore: 0,
        timeLeft: TIMER_SECONDS,
    };
}

type ExtendedAction = GameAction
    | { type: 'SYNC_BOARD'; board: CellData[][]; tileBag: TileData[]; tilesRemaining: number }
    | { type: 'INITIALIZE_FROM_HOST'; myRack: TileData[]; tileBag: TileData[] }
    | { type: 'SET_CUSTOM_TIMER'; seconds: number };

function gameReducer(state: GameState, action: ExtendedAction): GameState {
    switch (action.type) {
        case 'PLACE_TILE': {
            const { tileId, row, col } = action;
            const tileIndex = state.playerRack.findIndex((t) => t.id === tileId);
            if (tileIndex === -1) return state;
            if (state.boardGrid[row][col].tile) return state;

            const tile = state.playerRack[tileIndex];
            const newRack = [...state.playerRack];
            newRack.splice(tileIndex, 1);

            const newBoard = state.boardGrid.map((r) => r.map((c) => ({ ...c })));
            newBoard[row][col] = { ...newBoard[row][col], tile, isNew: true };

            return { ...state, boardGrid: newBoard, playerRack: newRack };
        }

        case 'REMOVE_TILE_FROM_BOARD': {
            const { row, col } = action;
            const cell = state.boardGrid[row][col];
            if (!cell.tile || !cell.isNew) return state;

            const tile = cell.tile;
            const newBoard = state.boardGrid.map((r) => r.map((c) => ({ ...c })));
            newBoard[row][col] = { ...newBoard[row][col], tile: null, isNew: false };

            return {
                ...state,
                boardGrid: newBoard,
                playerRack: [...state.playerRack, tile],
            };
        }

        case 'RECALL_TILES': {
            const newBoard = state.boardGrid.map((r) => r.map((c) => ({ ...c })));
            const recalledTiles: TileData[] = [];

            for (let r = 0; r < 15; r++) {
                for (let c = 0; c < 15; c++) {
                    if (newBoard[r][c].isNew && newBoard[r][c].tile) {
                        recalledTiles.push(newBoard[r][c].tile!);
                        newBoard[r][c] = { ...newBoard[r][c], tile: null, isNew: false };
                    }
                }
            }

            return {
                ...state,
                boardGrid: newBoard,
                playerRack: [...state.playerRack, ...recalledTiles],
            };
        }

        case 'SHUFFLE_RACK':
            return { ...state, playerRack: shuffleArray(state.playerRack) };

        case 'SUBMIT_WORD': {
            const { score, drawnTiles, newBag } = action;
            const newBoard = state.boardGrid.map((r) =>
                r.map((c) => (c.isNew ? { ...c, isNew: false } : { ...c }))
            );

            return {
                ...state,
                boardGrid: newBoard,
                playerScore: state.playerScore + score,
                playerRack: [...state.playerRack, ...drawnTiles],
                tileBag: newBag,
                tilesRemaining: newBag.length,
                lastMoveScore: score,
                turnHistory: [
                    ...state.turnHistory,
                    { player: 'player', word: '', score },
                ],
            };
        }

        case 'PASS_TURN':
            return { ...state, lastMoveScore: 0 };

        case 'EXCHANGE_TILES': {
            const { tileIds } = action;
            const tilesToExchange = state.playerRack.filter((t) => tileIds.includes(t.id));
            const remainingRack = state.playerRack.filter((t) => !tileIds.includes(t.id));

            const newBag = [...state.tileBag];
            const drawnTiles = newBag.splice(0, tilesToExchange.length);
            newBag.push(...tilesToExchange);
            const shuffledBag = shuffleArray(newBag);

            return {
                ...state,
                playerRack: [...remainingRack, ...drawnTiles],
                tileBag: shuffledBag,
                tilesRemaining: shuffledBag.length,
            };
        }

        case 'REORDER_RACK': {
            const { activeId, overId } = action;
            const oldIndex = state.playerRack.findIndex((t) => t.id === activeId);
            const newIndex = state.playerRack.findIndex((t) => t.id === overId);
            if (oldIndex === -1 || newIndex === -1) return state;

            const newRack = [...state.playerRack];
            const [moved] = newRack.splice(oldIndex, 1);
            newRack.splice(newIndex, 0, moved);

            return { ...state, playerRack: newRack };
        }

        case 'TICK_TIMER':
            return { ...state, timeLeft: Math.max(0, state.timeLeft - 1) };

        case 'RESET_TIMER':
            return { ...state, timeLeft: TIMER_SECONDS };

        // ─── Multiplayer actions ──────────────────────────────

        case 'SYNC_BOARD':
            return {
                ...state,
                boardGrid: action.board,
                tileBag: action.tileBag,
                tilesRemaining: action.tilesRemaining,
            };

        case 'INITIALIZE_FROM_HOST':
            return {
                ...state,
                playerRack: action.myRack,
                tileBag: action.tileBag,
                tilesRemaining: action.tileBag.length,
            };

        case 'SET_CUSTOM_TIMER':
            return { ...state, timeLeft: action.seconds };

        default:
            return state;
    }
}

export function useGameState() {
    const [state, dispatch] = useReducer(gameReducer, null, createInitialState);

    const placeTile = useCallback(
        (tileId: string, row: number, col: number) =>
            dispatch({ type: 'PLACE_TILE', tileId, row, col }),
        []
    );

    const removeTileFromBoard = useCallback(
        (row: number, col: number) =>
            dispatch({ type: 'REMOVE_TILE_FROM_BOARD', row, col }),
        []
    );

    const recallTiles = useCallback(() => dispatch({ type: 'RECALL_TILES' }), []);
    const shuffleRack = useCallback(() => dispatch({ type: 'SHUFFLE_RACK' }), []);

    const submitWord = useCallback(
        (score: number, drawnTiles: TileData[], newBag: TileData[]) =>
            dispatch({ type: 'SUBMIT_WORD', score, drawnTiles, newBag }),
        []
    );

    const passTurn = useCallback(() => dispatch({ type: 'PASS_TURN' }), []);

    const exchangeTiles = useCallback(
        (tileIds: string[]) => dispatch({ type: 'EXCHANGE_TILES', tileIds }),
        []
    );

    const reorderRack = useCallback(
        (activeId: string, overId: string) =>
            dispatch({ type: 'REORDER_RACK', activeId, overId }),
        []
    );

    const syncBoard = useCallback(
        (board: CellData[][], tileBag: TileData[], tilesRemaining: number) =>
            dispatch({ type: 'SYNC_BOARD', board, tileBag, tilesRemaining }),
        []
    );

    const initializeFromHost = useCallback(
        (myRack: TileData[], tileBag: TileData[]) =>
            dispatch({ type: 'INITIALIZE_FROM_HOST', myRack, tileBag }),
        []
    );

    const setCustomTimer = useCallback(
        (seconds: number) => dispatch({ type: 'SET_CUSTOM_TIMER', seconds }),
        []
    );

    return {
        state,
        placeTile,
        removeTileFromBoard,
        recallTiles,
        shuffleRack,
        submitWord,
        passTurn,
        exchangeTiles,
        reorderRack,
        syncBoard,
        initializeFromHost,
        setCustomTimer,
    };
}
