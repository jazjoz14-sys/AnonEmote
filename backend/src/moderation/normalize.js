/**
 * AnonEmote — 10-Step Text Normalization Pipeline
 *
 * Transforms evasion-encoded text into matchable plaintext for the moderation
 * engine's keyword matching. Designed to defeat Filipino-specific evasion
 * patterns (dot-separation, spacing tricks, character substitution) common
 * in Filipino social media.
 *
 * Pipeline order (fixed — Req 5.5):
 *   1. NFKD decomposition
 *   2. Combining marks removal (U+0300–U+036F)
 *   3. Homoglyph replacement (Cyrillic, Greek, fullwidth)
 *   4. Lowercase conversion
 *   5. Leet-speak substitution
 *   6. Dot-separator stripping
 *   7. Space-between-characters collapsing
 *   8. Repeated character reduction (3+ → 2)
 *   9. Zero-width character removal
 *  10. Whitespace normalization + trim
 *
 * @module normalize
 */

// ── Homoglyph Mapping Table ──────────────────────────────────────────────────
// Cyrillic and Greek characters that visually resemble Latin equivalents,
// plus fullwidth Latin (generated programmatically below).

/** @type {Record<string, string>} */
const HOMOGLYPHS = {
  // Cyrillic → Latin
  '\u0430': 'a', // а
  '\u0435': 'e', // е
  '\u043E': 'o', // о
  '\u0440': 'p', // р
  '\u0441': 'c', // с
  '\u0443': 'y', // у
  '\u0410': 'A', // А
  '\u0415': 'E', // Е
  '\u041E': 'O', // О
  '\u0420': 'P', // Р
  '\u0421': 'C', // С
  '\u0423': 'Y', // У
  // Greek → Latin
  '\u03B1': 'a', // α
  '\u03B5': 'e', // ε
  '\u03BF': 'o', // ο
}

// Fullwidth Latin → ASCII (Ａ-Ｚ → A-Z, ａ-ｚ → a-z, ０-９ → 0-9)
for (let i = 0; i < 26; i++) {
  HOMOGLYPHS[String.fromCharCode(0xFF21 + i)] = String.fromCharCode(0x41 + i) // Ａ-Ｚ → A-Z
  HOMOGLYPHS[String.fromCharCode(0xFF41 + i)] = String.fromCharCode(0x61 + i) // ａ-ｚ → a-z
}
for (let i = 0; i < 10; i++) {
  HOMOGLYPHS[String.fromCharCode(0xFF10 + i)] = String.fromCharCode(0x30 + i) // ０-９ → 0-9
}

// Build a regex that matches any homoglyph character in one pass
const HOMOGLYPH_REGEX = new RegExp('[' + Object.keys(HOMOGLYPHS).join('') + ']', 'g')

// ── Leet-speak Mapping ───────────────────────────────────────────────────────
// Extended from the existing engine.js logic

/** @type {Array<[RegExp, string]>} */
const LEET_RULES = [
  [/[@4∆^]/g, 'a'],
  [/[3€£]/g, 'e'],
  [/[1!|ⅰ]/g, 'i'],
  [/[0øÓ°]/g, 'o'],
  [/[$5§]/g, 's'],
  [/[7+†]/g, 't'],
  [/[µ]/g, 'u'],
  [/[¥]/g, 'y'],
]

// ── Dot-separator Pattern ────────────────────────────────────────────────────
// Matches: one character + dot repeated 2+ times + final character
// e.g., "p.u.t.a" → captures individual chars separated by dots
// Pattern: (\w)\.((?:\w\.){1,})\w but we use a broader approach to handle
// edge cases and Unicode letters.
const DOT_SEPARATOR_REGEX = /(?<=^|[^a-z0-9\u00C0-\u024F])([a-z0-9\u00C0-\u024F])(?:\.([a-z0-9\u00C0-\u024F])){1,}(?=$|[^a-z0-9\u00C0-\u024F])/gi

// ── Space-collapse Pattern ───────────────────────────────────────────────────
// Matches: 2 to 10 single characters each separated by one or more spaces
// e.g., "p u t a" → "puta", "t a n g i n a" → "tangina"
const SPACE_COLLAPSE_REGEX = /(?<=^|\s)([a-z0-9\u00C0-\u024F])(?:\s+([a-z0-9\u00C0-\u024F])){1,9}(?=$|\s)/gi

// ── Zero-width Characters ────────────────────────────────────────────────────
const ZERO_WIDTH_REGEX = /[\u200B-\u200F\u2028-\u202F\u2060-\u2069\uFEFF\u00AD]/g

// ── Combining Diacritical Marks ──────────────────────────────────────────────
const COMBINING_MARKS_REGEX = /[\u0300-\u036F]/g

// ── Repeated Character Reduction ─────────────────────────────────────────────
const REPEATED_CHAR_REGEX = /(.)\1{2,}/g

/**
 * Step 3: Replace Unicode homoglyphs with their Latin visual equivalents.
 *
 * Handles Cyrillic (а→a, е→e, о→o, р→p, с→c, у→y), Greek (α→a, ε→e, ο→o),
 * and fullwidth Latin (Ａ→A through Ｚ→Z, ａ→a through ｚ→z, ０→0 through ９→9).
 *
 * @param {string} text - Input text (after NFKD + diacritics removal)
 * @returns {string} Text with homoglyphs replaced
 */
export function removeHomoglyphs(text) {
  return text.replace(HOMOGLYPH_REGEX, (ch) => HOMOGLYPHS[ch] || ch)
}

/**
 * Step 6: Strip dot separators between single characters.
 *
 * Pattern: one character followed by a dot, repeated 2+ times, ending in a
 * final character (e.g., "p.u.t.a" → "puta", "g.a.g.o" → "gago").
 * Only triggers when adjacent characters are single (not part of a longer word).
 *
 * @param {string} text - Input text (after lowercase + leet-speak)
 * @returns {string} Text with dot-separated characters joined
 */
export function removeDotSeparators(text) {
  // Use a replacement function approach for robustness with Unicode
  return text.replace(
    /\b([a-z0-9\u00C0-\u024F])(?:\.([a-z0-9\u00C0-\u024F])){1,}\b/gi,
    (match) => match.replace(/\./g, '')
  )
}

/**
 * Step 7: Collapse sequences of single characters separated by spaces.
 *
 * Pattern: 2 to 10 single characters each separated by one or more whitespace
 * characters (e.g., "p u t a" → "puta", "t a n g i n a" → "tangina").
 *
 * @param {string} text - Input text (after dot-separator stripping)
 * @returns {string} Text with spaced-out characters collapsed
 */
export function collapseSpacedChars(text) {
  // Match sequences of single chars separated by whitespace.
  // We need to ensure each "token" between spaces is exactly 1 character long.
  return text.replace(
    /(?<=^|\s)([a-z0-9\u00C0-\u024F])((?:\s+[a-z0-9\u00C0-\u024F]){1,9})(?=\s|$)/gi,
    (match) => match.replace(/\s+/g, '')
  )
}

/**
 * Step 5: Apply leet-speak substitution rules.
 *
 * Converts common character substitutions back to their alphabetic equivalents
 * (e.g., "@" → "a", "3" → "e", "$" → "s", "7" → "t").
 *
 * @param {string} text - Input text (after lowercase conversion)
 * @returns {string} Text with leet-speak characters replaced
 */
export function leetSpeak(text) {
  let result = text
  for (const [pattern, replacement] of LEET_RULES) {
    result = result.replace(pattern, replacement)
  }
  return result
}

/**
 * Normalize text through the full 10-step pipeline to defeat evasion patterns.
 *
 * Steps applied in fixed order (Req 5.5):
 *   1. NFKD decomposition
 *   2. Combining marks removal (U+0300–U+036F)
 *   3. Homoglyph replacement (Cyrillic, Greek, fullwidth)
 *   4. Lowercase conversion
 *   5. Leet-speak substitution
 *   6. Dot-separator stripping
 *   7. Space-between-characters collapsing
 *   8. Repeated character reduction (3+ → 2)
 *   9. Zero-width character removal
 *  10. Whitespace normalization + trim
 *
 * Handles null/undefined/non-string → returns empty string.
 * Non-BMP characters (above U+FFFF) pass through unchanged (Req 5.7).
 *
 * @param {string|null|undefined} text - Raw input text (≤280 chars)
 * @returns {string} Normalized plaintext ready for keyword matching
 */
export function normalize(text) {
  // Handle null/undefined/non-string input
  if (text == null || typeof text !== 'string') {
    return ''
  }

  let result = text

  // Step 1: NFKD decomposition
  // Decomposes characters into base + combining marks (e.g., ñ → n + combining tilde)
  result = result.normalize('NFKD')

  // Step 2: Combining marks removal (U+0300–U+036F)
  // Strips accents/diacritics left from NFKD decomposition
  result = result.replace(COMBINING_MARKS_REGEX, '')

  // Step 3: Homoglyph replacement
  // Cyrillic а→a, Greek α→a, fullwidth Ａ→A, etc.
  result = removeHomoglyphs(result)

  // Step 4: Lowercase conversion
  result = result.toLowerCase()

  // Step 5: Leet-speak substitution
  // @→a, 3→e, $→s, 7→t, etc.
  result = leetSpeak(result)

  // Step 5b: Early zero-width character removal (pre-pass)
  // Zero-width characters must be stripped BEFORE dot-separator and space-collapse
  // steps (6 & 7), because invisible chars between word characters can trick those
  // regex patterns into treating multi-char words as single chars separated by spaces.
  // Step 9 performs a final cleanup for any zero-width chars that might appear from
  // other transformations, ensuring the pipeline remains idempotent.
  result = result.replace(ZERO_WIDTH_REGEX, '')

  // Step 6: Dot-separator stripping
  // "p.u.t.a" → "puta"
  result = removeDotSeparators(result)

  // Step 7: Space-between-characters collapsing
  // "p u t a" → "puta"
  result = collapseSpacedChars(result)

  // Step 8: Repeated character reduction (3+ → 2)
  // "puuuuta" → "puuta"
  result = result.replace(REPEATED_CHAR_REGEX, '$1$1')

  // Step 9: Zero-width character removal
  // Removes U+200B–U+200F, U+2028–U+202F, U+2060–U+2069, U+FEFF, U+00AD
  result = result.replace(ZERO_WIDTH_REGEX, '')

  // Step 9b: Re-apply repeated character reduction after zero-width removal.
  // Zero-width chars can separate identical characters (e.g., "a\u200Ba\u200Ba"),
  // and after removal they become consecutive (e.g., "aaa"). Without this second
  // pass the pipeline would not be idempotent (Property 2).
  result = result.replace(REPEATED_CHAR_REGEX, '$1$1')

  // Step 10: Whitespace normalization + trim
  // Multiple spaces → single space, trim leading/trailing
  result = result.replace(/\s+/g, ' ').trim()

  return result
}
