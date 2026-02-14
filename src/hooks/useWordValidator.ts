import { useCallback, useEffect, useState } from 'react';
import type { CellData } from '../types';

interface ValidationResult {
    valid: boolean;
    error?: string;
    words?: string[];
}

/**
 * Custom hook for validating Bulgarian words using a client-side dictionary.
 * 
 * Loads the Bulgarian word list on mount and provides instant O(1) word validation
 * using a Set data structure.
 */
export function useWordValidator() {
    const [dictionary, setDictionary] = useState<Set<string> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load dictionary on mount
    useEffect(() => {
        const loadDictionary = async () => {
            try {
                console.log('📖 Loading Bulgarian dictionary...');
                const response = await fetch('/bg-dictionary.txt');

                if (!response.ok) {
                    throw new Error(`Failed to load dictionary: ${response.statusText}`);
                }

                const text = await response.text();
                const words = text.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length > 0);
                const wordSet = new Set(words);

                setDictionary(wordSet);
                setLoading(false);
                console.log(`✅ Dictionary loaded: ${wordSet.size.toLocaleString()} words`);

                // Expose dictionary size for debugging
                (window as any).__DICT_SIZE__ = wordSet.size;
            } catch (err) {
                console.error('❌ Failed to load dictionary:', err);
                setError(err instanceof Error ? err.message : 'Unknown error');
                setLoading(false);
            }
        };

        loadDictionary();
    }, []);

    /**
     * Validate words formed on the board
     */
    const validate = useCallback((board: CellData[][]): ValidationResult => {
        // If dictionary is still loading, reject validation
        if (loading) {
            return { valid: false, error: 'Речникът все още се зарежда...' };
        }

        if (error || !dictionary) {
            return { valid: false, error: 'Грешка при зареждане на речника' };
        }

        // Get all newly placed tiles
        const newTiles: { row: number; col: number }[] = [];
        for (let r = 0; r < 15; r++) {
            for (let c = 0; c < 15; c++) {
                if (board[r][c].isNew && board[r][c].tile) {
                    newTiles.push({ row: r, col: c });
                }
            }
        }

        if (newTiles.length === 0) {
            return { valid: false, error: 'Моля, поставете плочки на дъската' };
        }

        // Check if tiles are in a single line (horizontal or vertical)
        const rows = newTiles.map(t => t.row);
        const cols = newTiles.map(t => t.col);
        const isHorizontal = new Set(rows).size === 1;
        const isVertical = new Set(cols).size === 1;

        if (!isHorizontal && !isVertical) {
            return { valid: false, error: 'Плочките трябва да са на една линия' };
        }

        // Check if tiles are contiguous (no gaps)
        if (isHorizontal) {
            const row = rows[0];
            const sortedCols = [...cols].sort((a, b) => a - b);
            for (let i = 0; i < sortedCols.length - 1; i++) {
                let hasGap = true;
                for (let c = sortedCols[i]; c <= sortedCols[i + 1]; c++) {
                    if (board[row][c].tile) {
                        hasGap = false;
                    }
                }
                if (hasGap) {
                    return { valid: false, error: 'Плочките трябва да са свързани' };
                }
            }
        } else {
            const col = cols[0];
            const sortedRows = [...rows].sort((a, b) => a - b);
            for (let i = 0; i < sortedRows.length - 1; i++) {
                let hasGap = true;
                for (let r = sortedRows[i]; r <= sortedRows[i + 1]; r++) {
                    if (board[r][col].tile) {
                        hasGap = false;
                    }
                }
                if (hasGap) {
                    return { valid: false, error: 'Плочките трябва да са свързани' };
                }
            }
        }

        // Extract all words formed
        const formedWords: string[] = [];

        // Main word
        const mainWord = extractWord(board, newTiles[0].row, newTiles[0].col, isHorizontal);
        if (mainWord.length >= 2) {
            formedWords.push(mainWord);
        }

        // Cross words (perpendicular to main word)
        for (const tile of newTiles) {
            const crossWord = extractWord(board, tile.row, tile.col, !isHorizontal);
            if (crossWord.length >= 2) {
                formedWords.push(crossWord);
            }
        }

        // Validate all formed words
        const invalidWords: string[] = [];
        for (const word of formedWords) {
            if (!dictionary.has(word.toLowerCase())) {
                invalidWords.push(word);
            }
        }

        if (invalidWords.length > 0) {
            return {
                valid: false,
                error: `Невалидна дума: ${invalidWords.join(', ')}`,
                words: formedWords
            };
        }

        return {
            valid: true,
            words: formedWords
        };
    }, [dictionary, loading, error]);

    return validate;
}

/**
 * Extract a word from the board starting at a given position
 */
function extractWord(board: CellData[][], row: number, col: number, horizontal: boolean): string {
    const dr = horizontal ? 0 : -1;
    const dc = horizontal ? -1 : 0;

    // Go backwards to find start of word
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c].tile) {
        r += dr;
        c += dc;
    }
    // Step forward to the first letter
    r -= dr;
    c -= dc;

    // Collect all letters going forward
    const letters: string[] = [];
    const fdr = horizontal ? 0 : 1;
    const fdc = horizontal ? 1 : 0;
    while (r >= 0 && r < 15 && c >= 0 && c < 15 && board[r][c].tile) {
        letters.push(board[r][c].tile!.letter);
        r += fdr;
        c += fdc;
    }

    return letters.join('').toLowerCase();
}
