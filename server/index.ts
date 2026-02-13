import { WebSocketServer, WebSocket } from 'ws';

// ─── Types ────────────────────────────────────────────────────────
interface Room {
    host: WebSocket | null;
    guest: WebSocket | null;
}

// ─── Room Manager ─────────────────────────────────────────────────
const rooms = new Map<string, Room>();

function getOrCreateRoom(code: string): Room {
    if (!rooms.has(code)) {
        rooms.set(code, { host: null, guest: null });
        console.log(`[Room] Created room: ${code}`);
    }
    return rooms.get(code)!;
}

function removeRoom(code: string) {
    rooms.delete(code);
    console.log(`[Room] Removed room: ${code}`);
}

function getOpponent(room: Room, ws: WebSocket): WebSocket | null {
    if (room.host === ws) return room.guest;
    if (room.guest === ws) return room.host;
    return null;
}

function getRoomForSocket(ws: WebSocket): { code: string; room: Room } | null {
    for (const [code, room] of rooms.entries()) {
        if (room.host === ws || room.guest === ws) {
            return { code, room };
        }
    }
    return null;
}

// ─── WebSocket Server ─────────────────────────────────────────────
const PORT = 3001;
const wss = new WebSocketServer({ port: PORT });

console.log(`🎮 Scrabble WebSocket server running on ws://localhost:${PORT}`);

wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected');

    ws.on('message', (raw: Buffer) => {
        let msg: any;
        try {
            msg = JSON.parse(raw.toString());
        } catch {
            return;
        }

        switch (msg.type) {
            case 'CREATE_ROOM': {
                const code = msg.gameCode as string;
                const room = getOrCreateRoom(code);
                room.host = ws;
                console.log(`[Room] Host joined room: ${code}`);
                // Confirm to host
                ws.send(JSON.stringify({ type: 'ROOM_CREATED', gameCode: code }));
                break;
            }

            case 'JOIN': {
                const code = msg.gameCode as string;
                const room = rooms.get(code);
                if (!room) {
                    ws.send(JSON.stringify({ type: 'ERROR', error: 'Стаята не съществува' }));
                    return;
                }
                if (room.guest !== null) {
                    ws.send(JSON.stringify({ type: 'ERROR', error: 'Стаята е пълна' }));
                    return;
                }
                room.guest = ws;
                console.log(`[Room] Guest joined room: ${code} as ${msg.playerName}`);

                // Tell host that guest joined
                if (room.host && room.host.readyState === WebSocket.OPEN) {
                    room.host.send(JSON.stringify({
                        type: 'PLAYER_JOINED',
                        playerName: msg.playerName,
                    }));
                }

                // Tell guest they connected successfully
                ws.send(JSON.stringify({ type: 'JOINED', gameCode: code }));
                break;
            }

            // All game messages: relay to the other player in the room
            case 'START_GAME':
            case 'SUBMIT_MOVE':
            case 'PASS':
            case 'TIME_UP':
            case 'LEAVE': {
                const entry = getRoomForSocket(ws);
                if (!entry) return;

                const opponent = getOpponent(entry.room, ws);
                if (opponent && opponent.readyState === WebSocket.OPEN) {
                    opponent.send(JSON.stringify(msg));
                }

                if (msg.type === 'LEAVE') {
                    // Clean up the room
                    removeRoom(entry.code);
                }
                break;
            }
        }
    });

    ws.on('close', () => {
        console.log('[WS] Client disconnected');
        const entry = getRoomForSocket(ws);
        if (!entry) return;

        const opponent = getOpponent(entry.room, ws);
        if (opponent && opponent.readyState === WebSocket.OPEN) {
            opponent.send(JSON.stringify({ type: 'LEAVE' }));
        }
        removeRoom(entry.code);
    });
});
