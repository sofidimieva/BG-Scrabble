export interface TileData {
    id: string;
    letter: string;
    points: number;
}

export type MultiplierType = 'ТД' | 'ДД' | 'ТБ' | 'ДБ' | null;

export interface CellData {
    row: number;
    col: number;
    multiplier: MultiplierType;
    tile: TileData | null;
    isNew: boolean; // placed this turn, not yet committed
}

export interface GameState {
    boardGrid: CellData[][];
    tileBag: TileData[];
    playerRack: TileData[];
    robotRack: TileData[];
    playerScore: number;
    robotScore: number;
    turnHistory: TurnRecord[];
    currentTurn: 'player' | 'robot';
    tilesRemaining: number;
    lastMoveScore: number;
    timeLeft: number; // seconds
}

export interface TurnRecord {
    player: 'player' | 'robot';
    word: string;
    score: number;
}

export type GameAction =
    | { type: 'PLACE_TILE'; tileId: string; row: number; col: number }
    | { type: 'REMOVE_TILE_FROM_BOARD'; row: number; col: number }
    | { type: 'RECALL_TILES' }
    | { type: 'SHUFFLE_RACK' }
    | { type: 'SUBMIT_WORD'; score: number }
    | { type: 'PASS_TURN' }
    | { type: 'EXCHANGE_TILES'; tileIds: string[] }
    | { type: 'DRAW_TILES' }
    | { type: 'TICK_TIMER' }
    | { type: 'RESET_TIMER' }
    | { type: 'REORDER_RACK'; activeId: string; overId: string };
