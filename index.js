import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// ─── Room Manager ─────────────────────────────────────────────────
const rooms = new Map();
function getOrCreateRoom(code) {
    if (!rooms.has(code)) {
        rooms.set(code, { host: null, guest: null });
        console.log(`[Room] Created room: ${code}`);
    }
    return rooms.get(code);
}
function removeRoom(code) {
    rooms.delete(code);
    console.log(`[Room] Removed room: ${code}`);
}
function getOpponent(room, ws) {
    if (room.host === ws)
        return room.guest;
    if (room.guest === ws)
        return room.host;
    return null;
}
function getRoomForSocket(ws) {
    for (const [code, room] of rooms.entries()) {
        if (room.host === ws || room.guest === ws) {
            return { code, room };
        }
    }
    return null;
}
// ─── MIME types ───────────────────────────────────────────────────
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};
// ─── HTTP Server (serves static files) ───────────────────────────
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
const DIST_PATH = join(__dirname, '..', 'dist');
const httpServer = createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url || '/index.html';
    // Remove query strings
    filePath = filePath.split('?')[0];
    const fullPath = join(DIST_PATH, filePath);
    // Security: prevent directory traversal
    if (!fullPath.startsWith(DIST_PATH)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    if (existsSync(fullPath)) {
        const ext = extname(fullPath);
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        try {
            const content = readFileSync(fullPath);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
        catch (err) {
            res.writeHead(500);
            res.end('Internal Server Error');
        }
    }
    else {
        // For client-side routing, serve index.html for unknown routes
        const indexPath = join(DIST_PATH, 'index.html');
        if (existsSync(indexPath)) {
            const content = readFileSync(indexPath);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
        }
        else {
            res.writeHead(404);
            res.end('Not Found');
        }
    }
});
// ─── WebSocket Server (attached to HTTP server) ───────────────────
const wss = new WebSocketServer({ server: httpServer });
console.log(`🎮 Scrabble server running on http://localhost:${PORT}`);
wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.on('message', (raw) => {
        let msg;
        try {
            msg = JSON.parse(raw.toString());
        }
        catch {
            return;
        }
        switch (msg.type) {
            case 'CREATE_ROOM': {
                const code = msg.gameCode;
                const room = getOrCreateRoom(code);
                room.host = ws;
                console.log(`[Room] Host joined room: ${code}`);
                // Confirm to host
                ws.send(JSON.stringify({ type: 'ROOM_CREATED', gameCode: code }));
                break;
            }
            case 'JOIN': {
                const code = msg.gameCode;
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
                if (!entry)
                    return;
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
        if (!entry)
            return;
        const opponent = getOpponent(entry.room, ws);
        if (opponent && opponent.readyState === WebSocket.OPEN) {
            opponent.send(JSON.stringify({ type: 'LEAVE' }));
        }
        removeRoom(entry.code);
    });
});
// ─── Start Server ─────────────────────────────────────────────────
httpServer.listen(PORT, () => {
    console.log(`✅ Server ready on port ${PORT}`);
});
