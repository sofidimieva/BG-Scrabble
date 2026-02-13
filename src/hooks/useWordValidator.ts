import { useCallback } from 'react';
import type { CellData } from '../types';
import { CENTER } from '../constants';
import { isValidWord } from '../data/dictionary';

/**
 * Word validator hook — checks placement rules AND dictionary validity.
 */
export function useWordValidator() {
    const validate = useCallback((board: CellData[][]): { valid: boolean; error?: string; words?: string[] } => {
        // Find all newly placed tiles
        const newTiles: { row: number; col: number }[] = [];
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if (board[r][c].tile && board[r][c].isNew) {
                    newTiles.push({ row: r, col: c });
                }
            }
        }

        if (newTiles.length === 0) {
            return { valid: false, error: 'Не сте поставили плочки' };
        }

        // Check single row or column
        const rows = new Set(newTiles.map((t) => t.row));
        const cols = new Set(newTiles.map((t) => t.col));
        const isHorizontal = rows.size === 1;
        const isVertical = cols.size === 1;

        if (!isHorizontal && !isVertical) {
            return { valid: false, error: 'Плочките трябва да са на един ред или колона' };
        }

        // Check no gaps
        if (isHorizontal) {
            const row = newTiles[0].row;
            const minCol = Math.min(...newTiles.map((t) => t.col));
            const maxCol = Math.max(...newTiles.map((t) => t.col));
            for (let c = minCol; c <= maxCol; c++) {
                if (!board[row][c].tile) {
                    return { valid: false, error: 'Има празнини между плочките' };
                }
            }
        } else {
            const col = newTiles[0].col;
            const minRow = Math.min(...newTiles.map((t) => t.row));
            const maxRow = Math.max(...newTiles.map((t) => t.row));
            for (let r = minRow; r <= maxRow; r++) {
                if (!board[r][col].tile) {
                    return { valid: false, error: 'Има празнини между плочките' };
                }
            }
        }

        // Check connectivity
        const hasCenterTile = board[CENTER][CENTER].tile !== null && !board[CENTER][CENTER].isNew;
        const firstMove = !hasCenterTile;

        if (firstMove) {
            const coversCenter = newTiles.some((t) => t.row === CENTER && t.col === CENTER);
            if (!coversCenter) {
                return { valid: false, error: 'Първият ход трябва да минава през центъра' };
            }
        } else {
            const isConnected = newTiles.some((t) => {
                const neighbors = [
                    [t.row - 1, t.col],
                    [t.row + 1, t.col],
                    [t.row, t.col - 1],
                    [t.row, t.col + 1],
                ];
                return neighbors.some(([nr, nc]) => {
                    if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15) return false;
                    const cell = board[nr][nc];
                    return cell.tile && !cell.isNew;
                });
            });

            if (!isConnected) {
                return { valid: false, error: 'Думата трябва да е свързана със съществуваща' };
            }
        }

        // Extract all formed words and validate against dictionary
        const allWords = extractAllWords(board, newTiles, isHorizontal);

        if (allWords.length === 0) {
            return { valid: false, error: 'Думата трябва да е поне 2 букви' };
        }

        for (const word of allWords) {
            if (word.length < 2) continue;
            if (!isValidWord(word)) {
                return { valid: false, error: `"${word}" не е в речника` };
            }
        }

        return { valid: true, words: allWords.filter(w => w.length >= 2) };
    }, []);

    return validate;
}

/**
 * Extract all words formed by the new placement.
 */
function extractAllWords(
    board: CellData[][],
    newTiles: { row: number; col: number }[],
    isHorizontal: boolean
): string[] {
    const words: string[] = [];

    // Main word
    const mainWord = getWordAt(board, newTiles[0].row, newTiles[0].col, isHorizontal);
    if (mainWord.length >= 2) {
        words.push(mainWord);
    }

    // Cross words for each placed tile
    for (const tile of newTiles) {
        const crossWord = getWordAt(board, tile.row, tile.col, !isHorizontal);
        if (crossWord.length >= 2) {
            words.push(crossWord);
        }
    }

    return words;
}

function getWordAt(board: CellData[][], row: number, col: number, horizontal: boolean): string {
    const dr = horizontal ? 0 : -1;
    const dc = horizontal ? -1 : 0;

    // Go backwards to find start
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c].tile) {
        r += dr;
        c += dc;
    }
    r -= dr;
    c -= dc;

    // Collect word going forward
    const fdr = horizontal ? 0 : 1;
    const fdc = horizontal ? 1 : 0;
    let word = '';
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c].tile) {
        word += board[r][c].tile!.letter;
        r += fdr;
        c += fdc;
    }

    return word;
}
