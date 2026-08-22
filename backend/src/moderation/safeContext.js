/**
 * Safe-context engine for the multilingual word filter.
 *
 * Handles phrase-level safe-context matching and override logic to prevent
 * false positives on emotional expression. When a toxic term appears inside
 * a known safe-context phrase (e.g., "I hate this feeling" contains "hate"),
 * the toxic match is suppressed.
 *
 * Override logic:
 * 1. Before toxic matching, scan text against the safe-context automaton
 * 2. Record all safe-context phrase positions as "protected spans"
 * 3. After toxic matching, for each toxic hit:
 *    a. If the toxic term falls entirely within a protected span → suppress
 *    b. If not suppressed → count as a valid toxic match
 * 4. After all toxic matching:
 *    a. ≥1 valid toxic match AND ≥3 distinct safe-context phrases → "review"
 *    b. ≥1 valid toxic match AND <3 safe-context phrases → "toxic"
 *    c. 0 valid toxic matches → continue to next layer
 *
 * @module moderation/safeContext
 */

import { searchAll } from './matcher.js';

/**
 * @typedef {Object} SafeContextMatch
 * @property {string} phrase - The matched safe-context phrase
 * @property {number} start - Start index in the normalized text
 * @property {number} end - End index in the normalized text (exclusive)
 */

/**
 * Find all safe-context phrase matches in the text.
 *
 * Uses the pre-built safe-context Aho-Corasick automaton to find all
 * occurrences of safe-context phrases within the normalized text. Each
 * match represents a "protected span" where toxic term matches should
 * be suppressed.
 *
 * @param {string} normalizedText - Text that has already been normalized
 * @param {import('ahocorasick')|null} safeContextAutomaton - Pre-built automaton from buildAutomaton()
 * @returns {SafeContextMatch[]} All safe-context phrase matches found in the text
 */
export function findSafeContextMatches(normalizedText, safeContextAutomaton) {
  // Null automaton or empty text → no safe-context matches
  if (!normalizedText || !safeContextAutomaton) {
    return [];
  }

  // Use the shared searchAll from matcher.js to find all safe-context phrases
  const rawMatches = searchAll(safeContextAutomaton, normalizedText, 'safe-context');

  // Convert MatchResult[] to SafeContextMatch[] (rename 'term' → 'phrase')
  return rawMatches.map(match => ({
    phrase: match.term,
    start: match.start,
    end: match.end
  }));
}

/**
 * Determine if a toxic match is contained within a safe-context phrase span.
 *
 * A toxic match is "covered" (and should be suppressed) if its entire range
 * [start, end) falls within at least one safe-context span [safeStart, safeEnd).
 *
 * Formally: toxicMatch.start >= safeSpan.start AND toxicMatch.end <= safeSpan.end
 *
 * @param {{ term: string, start: number, end: number, source: string }} toxicMatch - The toxic match to validate
 * @param {Array<{ start: number, end: number }>} safeSpans - Protected spans from findSafeContextMatches()
 * @returns {boolean} true if the toxic match is entirely covered by a safe-context span
 */
export function isCoveredBySafeContext(toxicMatch, safeSpans) {
  // No safe spans → nothing can be covered
  if (!safeSpans || safeSpans.length === 0) {
    return false;
  }

  // Check if the toxic match falls entirely within any safe-context span
  return safeSpans.some(span =>
    toxicMatch.start >= span.start && toxicMatch.end <= span.end
  );
}
