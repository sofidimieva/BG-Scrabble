import nspell from 'nspell';
import dictionaryBg from 'dictionary-bg';

// ─── Hunspell Dictionary Singleton ────────────────────────────────
let spellChecker: ReturnType<typeof nspell> | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize the Bulgarian dictionary asynchronously.
 * This loads the .aff and .dic files from dictionary-bg.
 */
async function initializeDictionary(): Promise<void> {
    if (spellChecker) return; // Already initialized
    if (initPromise) return initPromise; // Already initializing

    initPromise = (async () => {
        try {
            const dict = await dictionaryBg;
            // Convert Uint8Array to Buffer for nspell compatibility
            spellChecker = nspell({
                aff: Buffer.from(dict.aff),
                dic: Buffer.from(dict.dic)
            });
            console.log('[Dictionary] Bulgarian dictionary loaded successfully');
        } catch (error) {
            console.error('[Dictionary] Failed to load dictionary:', error);
            throw error;
        }
    })();

    return initPromise;
}

/**
 * Check if a word exists in the dictionary.
 * Case-insensitive, converts to uppercase.
 */
export function isValidWord(word: string): boolean {
    if (!spellChecker) {
        console.warn('[Dictionary] Spell checker not initialized yet');
        return false;
    }
    return spellChecker.correct(word.toUpperCase());
}

/**
 * Initialize the dictionary on module load.
 * This ensures the dictionary is ready when the app starts.
 */
initializeDictionary();

/**
 * Export the initialization function for explicit use if needed.
 */
export { initializeDictionary };
