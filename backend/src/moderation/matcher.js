/**
 * Aho-Corasick matching engine for the multilingual word filter.
 *
 * Wraps the `ahocorasick` npm package and provides:
 * - buildAutomaton(terms) — construct the automaton from a term array
 * - searchAll(automaton, text) — find all MatchResult objects in text
 * - hasWordBoundary(text, match) — validate single-word matches sit at word boundaries
 *
 * @module moderation/matcher
 */

import AhoCorasick from 'ahocorasick';

/**
 * @typedef {Object} MatchResult
 * @property {string} term - The matched term
 * @property {number} start - Start index in the normalized text
 * @property {number} end - End index in the normalized text (exclusive)
 * @property {string} source - 'built-in' | 'admin'
 */

/**
 * Build an Aho-Corasick automaton from a list of terms.
 *
 * Terms are deduplicated before construction to avoid redundant state
 * transitions. Empty arrays produce a valid automaton that matches nothing.
 *
 * @param {string[]} terms - Array of lowercase terms to match
 * @returns {AhoCorasick|null} The compiled automaton, or null if terms is empty
 */
export function buildAutomaton(terms) {
  if (!terms || terms.length === 0) {
    return null;
  }

  // Deduplicate and filter out empty strings
  const unique = [...new Set(terms.filter(t => t.length > 0))];

  if (unique.length === 0) {
    return null;
  }

  return new AhoCorasick(unique);
}

/**
 * Search for all pattern matches in normalized text.
 *
 * The ahocorasick package's search() returns [[endIndex, [matchedPatterns]], ...]
 * where endIndex is the 0-based index of the LAST character of the match.
 * We convert this to MatchResult[] with start/end (end is exclusive, like String.slice).
 *
 * @param {AhoCorasick|null} automaton - Pre-built automaton from buildAutomaton()
 * @param {string} text - Normalized text to search
 * @param {string} [source='built-in'] - Source label for all matches ('built-in' | 'admin')
 * @returns {MatchResult[]} All matches found in the text
 */
export function searchAll(automaton, text, source = 'built-in') {
  // Empty text or null automaton → empty array, no error
  if (!text || !automaton) {
    return [];
  }

  const rawResults = automaton.search(text);
  const matches = [];

  for (const [endIndex, matchedTerms] of rawResults) {
    for (const term of matchedTerms) {
      const start = endIndex - term.length + 1;
      matches.push({
        term,
        start,
        end: endIndex + 1, // exclusive end index (like String.slice)
        source
      });
    }
  }

  return matches;
}

/**
 * Validate that a single-word match has word boundaries on both sides.
 *
 * A word boundary is defined as:
 * - The start/end of the string
 * - A whitespace character (\s)
 * - A punctuation character (\p{P} — Unicode punctuation category)
 *
 * Multi-word terms (containing spaces) skip boundary validation entirely
 * because surrounding whitespace provides natural boundaries.
 *
 * This prevents partial-word false positives:
 * - "ass" should NOT match inside "class", "assassin", "grass"
 * - "rape" should NOT match inside "grape", "drape"
 * - "ho" should NOT match inside "honest", "hope"
 *
 * @param {string} text - The full normalized text
 * @param {MatchResult} match - The match to validate
 * @returns {boolean} true if the match is at a word boundary (or is multi-word)
 */
export function hasWordBoundary(text, match) {
  // Multi-word terms (containing spaces) skip boundary validation
  if (match.term.includes(' ')) {
    return true;
  }

  const { start, end } = match;

  // Check character before the match
  const before = start === 0 || /[\s\p{P}]/u.test(text[start - 1]);

  // Check character after the match (end is exclusive)
  const after = end === text.length || /[\s\p{P}]/u.test(text[end]);

  return before && after;
}
