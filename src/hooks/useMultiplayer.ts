import { useEffect, useRef, useCallback, useState } from 'react';
import type { CellData, TileData } from '../types';

/**
 * Message types for WebSocket multiplayer sync.
 */
export type MultiplayerMessage =
    | { type: 'CREATE_ROOM'; gameCode: string }
    | { type: 'ROOM_CREATED'; gameCode: string }
    | { type: 'JOIN'; gameCode: string; playerName: string }
    | { type: 'JOINED'; gameCode: string }
    | { type: 'PLAYER_JOINED'; playerName: string }
    | { type: 'ERROR'; error: string }
    | { type: 'START_GAME'; hostName: string; guestName: string; tileBag: TileData[]; hostRack: TileData[]; guestRack: TileData[]; timerSeconds: number }
    | { type: 'SUBMIT_MOVE'; board: CellData[][]; score: number; newRack: TileData[]; tileBag: TileData[]; tilesRemaining: number }
    | { type: 'PASS' }
    | { type: 'TIME_UP'; loserName: string; myScore: number; opponentScore: number }
    | { type: 'LEAVE' };

// ─── Server URL ───────────────────────────────────────────────────
const WS_URL = `ws://${window.location.hostname}:3001`;

/**
 * Persistent WebSocket channel manager.
 * Lives at the App level and survives screen transitions.
 */
export class WebSocketChannel {
    private ws: WebSocket | null = null;
    private handlers: Set<(msg: MultiplayerMessage) => void> = new Set();
    private _gameCode = '';
    private _isHost = false;
    private _myName = '';
    private _ready = false;
    private pendingMessages: MultiplayerMessage[] = [];

    get gameCode() { return this._gameCode; }
    get isHost() { return this._isHost; }
    get myName() { return this._myName; }
    get isOpen() { return this._ready; }

    open(gameCode: string, isHost: boolean, myName: string) {
        this.close();
        this._gameCode = gameCode;
        this._isHost = isHost;
        this._myName = myName;

        this.ws = new WebSocket(WS_URL);

        this.ws.onopen = () => {
            this._ready = true;
            console.log('[WS] Connected to server');

            // Send initial room message
            if (isHost) {
                this.send({ type: 'CREATE_ROOM', gameCode });
            } else {
                this.send({ type: 'JOIN', gameCode, playerName: myName });
            }

            // Flush any pending messages
            for (const msg of this.pendingMessages) {
                this.ws?.send(JSON.stringify(msg));
            }
            this.pendingMessages = [];
        };

        this.ws.onmessage = (event: MessageEvent) => {
            let msg: MultiplayerMessage;
            try {
                msg = JSON.parse(event.data);
            } catch {
                return;
            }
            // Notify all registered handlers
            this.handlers.forEach(h => h(msg));
        };

        this.ws.onclose = () => {
            this._ready = false;
            console.log('[WS] Disconnected from server');
        };

        this.ws.onerror = (err) => {
            console.error('[WS] Error:', err);
        };
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this._ready = false;
        this.handlers.clear();
        this.pendingMessages = [];
    }

    send(msg: MultiplayerMessage) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg));
        } else {
            // Queue messages until connected
            this.pendingMessages.push(msg);
        }
    }

    addHandler(handler: (msg: MultiplayerMessage) => void) {
        this.handlers.add(handler);
        return () => { this.handlers.delete(handler); };
    }
}

/**
 * React hook that wraps the persistent WebSocket channel for use in components.
 */
export function useMultiplayerChannel(channel: WebSocketChannel) {
    const [opponentName, setOpponentName] = useState('');
    const [opponentConnected, setOpponentConnected] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const customHandlerRef = useRef<((msg: MultiplayerMessage) => void) | null>(null);

    useEffect(() => {
        const handler = (msg: MultiplayerMessage) => {
            switch (msg.type) {
                case 'PLAYER_JOINED':
                    setOpponentName(msg.playerName);
                    setOpponentConnected(true);
                    break;

                case 'JOINED':
                    // Guest confirmed in room
                    setOpponentConnected(true);
                    break;

                case 'ERROR':
                    setError(msg.error);
                    break;

                case 'START_GAME':
                    setGameStarted(true);
                    customHandlerRef.current?.(msg);
                    break;

                case 'SUBMIT_MOVE':
                case 'PASS':
                case 'LEAVE':
                    customHandlerRef.current?.(msg);
                    break;

                // ROOM_CREATED is informational
                case 'ROOM_CREATED':
                    break;
            }
        };

        const removeHandler = channel.addHandler(handler);
        return removeHandler;
    }, [channel]);

    const sendMessage = useCallback((msg: MultiplayerMessage) => {
        channel.send(msg);
    }, [channel]);

    const onMessage = useCallback((handler: (msg: MultiplayerMessage) => void) => {
        customHandlerRef.current = handler;
    }, []);

    return {
        opponentName,
        opponentConnected,
        gameStarted,
        error,
        sendMessage,
        onMessage,
    };
}
