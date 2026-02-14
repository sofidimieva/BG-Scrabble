/**
 * Process Bulgarian Dictionary
 * 
 * This script cleans and filters the Bulgarian word list to create
 * a high-quality dictionary for Scrabble word validation.
 * 
 * Filters applied:
 * - Remove empty lines
 * - Remove single-letter words
 * - Remove 2-letter combinations (most are invalid)
 * - Remove words with excessive repeated characters
 * - Remove words with non-Cyrillic characters
 * - Keep words 3+ characters (Scrabble minimum)
 * - Remove duplicates
 * - Sort alphabetically
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '..', 'all-cyrillic (1).txt');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'bg-dictionary.txt');

console.log('📖 Processing Bulgarian dictionary...\n');
console.log(`Input:  ${INPUT_FILE}`);
console.log(`Output: ${OUTPUT_FILE}\n`);

// Read the input file
const content = fs.readFileSync(INPUT_FILE, 'utf-8');
const lines = content.split('\n');

console.log(`Total lines in input: ${lines.length.toLocaleString()}`);

// Filter and clean
const validWords = new Set();
let filtered = {
    empty: 0,
    singleLetter: 0,
    twoLetter: 0,
    repeatedChars: 0,
    nonCyrillic: 0,
    duplicates: 0,
    valid: 0
};

// Bulgarian alphabet for validation
const bulgarianCyrillic = /^[а-яА-Я]+$/;

// Check if word has too many repeated characters (likely invalid)
function hasExcessiveRepeats(word) {
    // Check for 3+ consecutive identical characters
    if (/(.)\1{2,}/.test(word)) {
        return true;
    }

    // Check if word is mostly one character (like "ааааа")
    const charCounts = {};
    for (const char of word) {
        charCounts[char] = (charCounts[char] || 0) + 1;
    }
    const maxCount = Math.max(...Object.values(charCounts));
    if (maxCount / word.length > 0.6) {
        return true;
    }

    return false;
}

for (let line of lines) {
    // Trim whitespace
    const word = line.trim().toLowerCase();

    // Skip empty lines
    if (!word) {
        filtered.empty++;
        continue;
    }

    // Skip single letters
    if (word.length === 1) {
        filtered.singleLetter++;
        continue;
    }

    // Skip 2-letter combinations (most are invalid in Bulgarian Scrabble)
    if (word.length === 2) {
        filtered.twoLetter++;
        continue;
    }

    // Skip words with non-Cyrillic characters
    if (!bulgarianCyrillic.test(word)) {
        filtered.nonCyrillic++;
        continue;
    }

    // Skip words with excessive repeated characters
    if (hasExcessiveRepeats(word)) {
        filtered.repeatedChars++;
        continue;
    }

    // Skip if already seen (duplicate)
    if (validWords.has(word)) {
        filtered.duplicates++;
        continue;
    }

    // Add valid word
    validWords.add(word);
    filtered.valid++;
}

console.log('\n📊 Filtering results:');
console.log(`  Empty lines:       ${filtered.empty.toLocaleString()}`);
console.log(`  Single letters:    ${filtered.singleLetter.toLocaleString()}`);
console.log(`  Two-letter words:  ${filtered.twoLetter.toLocaleString()}`);
console.log(`  Repeated chars:    ${filtered.repeatedChars.toLocaleString()}`);
console.log(`  Non-Cyrillic:      ${filtered.nonCyrillic.toLocaleString()}`);
console.log(`  Duplicates:        ${filtered.duplicates.toLocaleString()}`);
console.log(`  Valid words:       ${filtered.valid.toLocaleString()}`);

// Sort alphabetically
const sortedWords = Array.from(validWords).sort((a, b) => a.localeCompare(b, 'bg'));

console.log(`\n✅ Final dictionary size: ${sortedWords.length.toLocaleString()} words`);

// Write to output file
const outputContent = sortedWords.join('\n');
fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf-8');

const outputSize = (fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2);
console.log(`📝 Written to: ${OUTPUT_FILE}`);
console.log(`💾 File size: ${outputSize} MB`);

// Show sample words
console.log('\n📝 Sample words (first 20):');
sortedWords.slice(0, 20).forEach((word, i) => {
    console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${word}`);
});

console.log('\n✨ Dictionary processing complete!');
