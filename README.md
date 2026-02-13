# 🇧🇬 BG Scrabble (Скрабъл)

A real-time multiplayer implementation of Scrabble (Bulgarian version) built with Modern Web Technologies.

![Game Screenshot](https://placehold.co/1200x630/e7f1f4/498e9c?text=BG+Scrabble)

---

## 🏗 Architecture Overview

This application uses a **Client-Heavy** architecture where the game logic resides almost entirely in the browser. The server acts as a lightweight message relay.

```mermaid
graph TD
    subgraph "Frontend (React Application)"
        UI[User Interface]
        Store[Game State Store<br/>(useGameState)]
        Rules[Scrabble Logic<br/>(Scoring, Validation)]
        WS_Client[WebSocket Client<br/>(useMultiplayer)]
        
        UI --> Store
        Store --> Rules
        Store <--> WS_Client
    end

    subgraph "Backend (Node.js)"
        WS_Server[WebSocket Server]
        RoomMgr[Room Manager]
        
        WS_Server --> RoomMgr
    end

    PlayerA[Player A] <--> UI
    WS_Client <== "WebSocket (JSON)" ==> WS_Server
```

### 1. Frontend ("The Brain")
- **Tech Stack**: React 19, TypeScript, Vite, TailwindCSS.
- **Responsibility**: 
  - Manages the entire game state (Board, Rack, Score).
  - Validates words and calculates scores using `scoringEngine.ts`.
  - Handles Drag-and-Drop interactions via `@dnd-kit`.
  - Sends "actions" (like `SUBMIT_MOVE`) to the opponent.

### 2. Backend ("The Pipe")
- **Tech Stack**: Node.js, `ws` library.
- **Responsibility**:
  - **Relay**: Receives a message from Player A and immediately forwards it to Player B.
  - **Room Management**: Groups sockets into rooms based on a 4-character Game Code.
  - **Agnostic**: The server *does not know* the rules of Scrabble. It blindly trusts the clients.

---

## 📂 Project Structure

- **`src/components/`**: UI components (GameBoard, TileRack, Scoreboard).
- **`src/hooks/`**: Custom hooks for logic separation.
  - `useGameState.ts`: The core "Redux-like" state machine.
  - `useMultiplayer.ts`: Handles WebSocket connection and events.
  - `useWordValidator.ts`: dictionary validation logic.
- **`server/`**: The Node.js WebSocket server entry point.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
```

### Running Locally
You need **two** terminals:

**Terminal 1 (Frontend)**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Terminal 2 (Backend)**
```bash
npm run server
# Runs on ws://localhost:3001
```

## 🌐 Deployment Plan

To deploy this application, you currently need two services:
1. **Frontend Host**: (e.g., Cloudflare Pages, Vercel) for the React app.
2. **Backend Host**: (e.g., Render, Railway) for the WebSocket server.

*Note: The frontend must be configured with `VITE_WS_URL` to point to your production backend.*
