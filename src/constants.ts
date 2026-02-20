import type { MultiplierType, TileData } from './types';

export const BG_TILE_BAG: Record<string, { count: number; pts: number }> = {
    'А': { count: 9, pts: 1 },
    'О': { count: 9, pts: 1 },
    'Е': { count: 8, pts: 1 },
    'И': { count: 8, pts: 1 },
    'Т': { count: 5, pts: 1 },
    'Н': { count: 4, pts: 1 },
    'П': { count: 4, pts: 1 },
    'Р': { count: 4, pts: 1 },
    'С': { count: 4, pts: 1 },
    'В': { count: 4, pts: 2 },
    'Д': { count: 4, pts: 2 },
    'М': { count: 4, pts: 2 },
    'Б': { count: 3, pts: 2 },
    'К': { count: 3, pts: 2 },
    'Л': { count: 3, pts: 2 },
    'Г': { count: 3, pts: 3 },
    'Ъ': { count: 2, pts: 3 },
    'Ж': { count: 2, pts: 4 },
    'З': { count: 2, pts: 4 },
    'У': { count: 3, pts: 5 },
    'Ч': { count: 2, pts: 5 },
    'Я': { count: 2, pts: 5 },
    'Й': { count: 1, pts: 5 },
    'Х': { count: 1, pts: 5 },
    'Ц': { count: 1, pts: 8 },
    'Ш': { count: 1, pts: 8 },
    'Ю': { count: 1, pts: 8 },
    'Ф': { count: 1, pts: 10 },
    'Щ': { count: 1, pts: 10 },
    'Ь': { count: 1, pts: 10 },
};

// Standard Scrabble-style 15x15 board layout (symmetric)
// ТД = Triple Word, ДД = Double Word, ТБ = Triple Letter, ДБ = Double Letter
export const BOARD_LAYOUT: MultiplierType[][] = (() => {
    const b: MultiplierType[][] = Array.from({ length: 15 }, () => Array(15).fill(null));

    // Triple Word (ТД) — red squares
    const tw: [number, number][] = [
        [0, 0], [0, 7], [0, 14],
        [7, 0], [7, 14],
        [14, 0], [14, 7], [14, 14],
    ];

    // Double Word (ДД) — pink squares (including center star)
    const dw: [number, number][] = [
        [1, 1], [2, 2], [3, 3], [4, 4],
        [1, 13], [2, 12], [3, 11], [4, 10],
        [13, 1], [12, 2], [11, 3], [10, 4],
        [13, 13], [12, 12], [11, 11], [10, 10],
        [7, 7], // center star — acts as Double Word
    ];

    // Triple Letter (ТБ) — dark blue squares
    const tl: [number, number][] = [
        [1, 5], [1, 9],
        [5, 1], [5, 5], [5, 9], [5, 13],
        [9, 1], [9, 5], [9, 9], [9, 13],
        [13, 5], [13, 9],
    ];

    // Double Letter (ДБ) — light blue squares
    const dl: [number, number][] = [
        [0, 3], [0, 11],
        [2, 6], [2, 8],
        [3, 0], [3, 7], [3, 14],
        [6, 2], [6, 6], [6, 8], [6, 12],
        [7, 3], [7, 11],
        [8, 2], [8, 6], [8, 8], [8, 12],
        [11, 0], [11, 7], [11, 14],
        [12, 6], [12, 8],
        [14, 3], [14, 11],
    ];

    tw.forEach(([r, c]) => (b[r][c] = 'ТД'));
    dw.forEach(([r, c]) => (b[r][c] = 'ДД'));
    tl.forEach(([r, c]) => (b[r][c] = 'ТБ'));
    dl.forEach(([r, c]) => (b[r][c] = 'ДБ'));

    return b;
})();

export const RACK_SIZE = 7;
export const TIMER_SECONDS = 105; // 1:45
export const CENTER = 7; // center cell index (0-based)

/** Create the full tile bag as an array of TileData, shuffled */
export function createTileBag(): TileData[] {
    const tiles: TileData[] = [];
    let id = 0;
    for (const [letter, { count, pts }] of Object.entries(BG_TILE_BAG)) {
        for (let i = 0; i < count; i++) {
            tiles.push({ id: `tile-${id++}`, letter, points: pts });
        }
    }
    return shuffleArray(tiles);
}

export function shuffleArray<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
