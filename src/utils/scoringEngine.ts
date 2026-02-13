import type { CellData, TileData } from '../types';

interface PlacedTile {
    row: number;
    col: number;
    tile: TileData;
}

/**
 * Calculate score for newly placed tiles, applying multipliers.
 * Finds all words formed by the new placement (main word + cross-words).
 */
export function calculateScore(
    board: CellData[][],
    placedTiles: PlacedTile[]
): number {
    if (placedTiles.length === 0) return 0;

    // Determine direction
    const rows = placedTiles.map((t) => t.row);
    const cols = placedTiles.map((t) => t.col);
    const isHorizontal = new Set(rows).size === 1;

    let totalScore = 0;

    // Get the main word
    const mainWord = getWord(board, placedTiles[0].row, placedTiles[0].col, isHorizontal);
    if (mainWord.length >= 2) {
        totalScore += scoreWord(board, mainWord, placedTiles);
    }

    // Get cross words for each placed tile
    for (const pt of placedTiles) {
        const crossWord = getWord(board, pt.row, pt.col, !isHorizontal);
        if (crossWord.length >= 2) {
            totalScore += scoreWord(board, crossWord, placedTiles);
        }
    }

    // Bonus for using all 7 tiles
    if (placedTiles.length === 7) {
        totalScore += 50;
    }

    return totalScore;
}

function getWord(
    board: CellData[][],
    row: number,
    col: number,
    horizontal: boolean
): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    const dr = horizontal ? 0 : -1;
    const dc = horizontal ? -1 : 0;

    // Go backwards to find start of word
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c].tile) {
        r += dr;
        c += dc;
    }
    // step forward to the first letter
    r -= dr;
    c -= dc;

    // Collect all cells in the word going forward
    const fdr = horizontal ? 0 : 1;
    const fdc = horizontal ? 1 : 0;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c].tile) {
        cells.push({ row: r, col: c });
        r += fdr;
        c += fdc;
    }

    return cells;
}

function scoreWord(
    board: CellData[][],
    wordCells: { row: number; col: number }[],
    placedTiles: PlacedTile[]
): number {
    let wordScore = 0;
    let wordMultiplier = 1;

    const placedSet = new Set(placedTiles.map((t) => `${t.row},${t.col}`));

    for (const { row, col } of wordCells) {
        const cell = board[row][col];
        const tile = cell.tile!;
        let letterScore = tile.points;
        const isNewlyPlaced = placedSet.has(`${row},${col}`);

        if (isNewlyPlaced && cell.multiplier) {
            switch (cell.multiplier) {
                case 'ДБ':
                    letterScore *= 2;
                    break;
                case 'ТБ':
                    letterScore *= 3;
                    break;
                case 'ДД':
                    wordMultiplier *= 2;
                    break;
                case 'ТД':
                    wordMultiplier *= 3;
                    break;
            }
        }

        wordScore += letterScore;
    }

    return wordScore * wordMultiplier;
}

/** Get all newly placed tiles on the board */
export function getNewlyPlacedTiles(board: CellData[][]): PlacedTile[] {
    const placed: PlacedTile[] = [];
    for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
            const cell = board[r][c];
            if (cell.tile && cell.isNew) {
                placed.push({ row: r, col: c, tile: cell.tile });
            }
        }
    }
    return placed;
}
