/**
 * Safe-Context Engine Property-Based Tests
 *
 * Uses fast-check to verify universal properties of the safe-context module
 * that prevents false positives on emotional expression text.
 *
 * Properties tested:
 * - Property 4: Safe-context phrases prevent false positives
 * - Property 6: Allow-list never overrides crisis (separation of concerns)
 *
 * @module moderation/safeContext.property.test
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

import { findSafeContextMatches, isCoveredBySafeContext } from './safeContext.js'
import { buildAutomaton, searchAll } from './matcher.js'

// ── Load actual lexicon files ────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const lexiconsDir = resolve(__dirname, 'lexicons')

/**
 * Read and parse a lexicon JSON file, returning its terms array.
 * @param {string} filename
 * @returns {string[]}
 */
function loadTerms(filename) {
  const raw = readFileSync(resolve(lexiconsDir, filename), 'utf-8')
  const parsed = JSON.parse(raw)
  return parsed.terms || []
}

// Load all safe-context phrases from all three languages
const enSafeContext = loadTerms('en-safe-context.json')
const tlSafeContext = loadTerms('tl-safe-context.json')
const bclSafeContext = loadTerms('bcl-safe-context.json')
const allSafeContextPhrases = [...enSafeContext, ...tlSafeContext, ...bclSafeContext]

// Load toxic terms from all languages
const enToxic = loadTerms('en-toxic.json')
const tlToxic = loadTerms('tl-toxic.json')
const bclToxic = loadTerms('bcl-toxic.json')
const allToxicTerms = [...enToxic, ...tlToxic, ...bclToxic]

// Load crisis terms
const allCrisisTerms = loadTerms('all-crisis.json')

// Build the safe-context automaton from all phrases
const safeContextAutomaton = buildAutomaton(allSafeContextPhrases)

// ── Helper: find toxic terms that are substrings of a given phrase ────────────

/**
 * Find all toxic terms that appear as substrings within a safe-context phrase.
 * @param {string} phrase - The safe-context phrase to scan
 * @returns {Array<{term: string, start: number, end: number}>} Toxic terms found as substrings
 */
function findToxicSubstringsInPhrase(phrase) {
  const results = []
  for (const term of allToxicTerms) {
    const idx = phrase.indexOf(term)
    if (idx !== -1) {
      results.push({ term, start: idx, end: idx + term.length })
    }
  }
  return results
}

/**
 * Filter safe-context phrases that actually contain at least one toxic substring.
 * This is used as the pool for Property 4 testing.
 */
const phrasesWithToxicSubstrings = allSafeContextPhrases.filter(
  phrase => findToxicSubstringsInPhrase(phrase).length > 0
)

// ── Property 4: Safe-context phrases prevent false positives ─────────────────

describe('Feature: multilingual-word-filter, Property 4: Safe-context phrases prevent false positives', () => {
  /**
   * Property 4: Safe-context phrases prevent false positives
   * Validates: Requirements 9.2
   *
   * For any text that consists entirely of a safe-context allow-list phrase
   * (and contains no other content), the toxic matching logic SHALL NOT
   * produce a valid toxic verdict, even if the phrase contains a toxic term
   * as a substring.
   *
   * Generator strategy:
   * - Pick a random safe-context phrase from the actual lexicon files
   * - Find toxic terms that appear as substrings within that phrase
   * - Run findSafeContextMatches on the phrase, get safe spans
   * - For each toxic term found in the phrase, create a MatchResult
   * - Verify the toxic match IS covered (isCoveredBySafeContext returns true)
   */
  it('toxic substrings within safe-context phrases are always covered by safe spans', () => {
    // Only test phrases that actually contain toxic substrings
    // If none exist, the test is vacuously true — but our lexicons DO have overlaps
    // (e.g., "i feel like shit" contains "shit", "this is bullshit" contains "shit"/"bull")
    if (phrasesWithToxicSubstrings.length === 0) {
      // No overlapping phrases — skip gracefully (should not happen with real lexicons)
      return
    }

    fc.assert(
      fc.property(
        fc.constantFrom(...phrasesWithToxicSubstrings),
        (phrase) => {
          // The text is exactly the safe-context phrase (no surrounding content)
          const text = phrase

          // Find safe-context matches — should find the phrase itself
          const safeMatches = findSafeContextMatches(text, safeContextAutomaton)

          // The phrase should be found as a safe-context match
          expect(safeMatches.length).toBeGreaterThanOrEqual(1)

          // Get all safe spans from the matches
          const safeSpans = safeMatches.map(m => ({ start: m.start, end: m.end }))

          // Find toxic terms that are substrings of this phrase
          const toxicSubstrings = findToxicSubstringsInPhrase(phrase)

          // Each toxic substring within the phrase should be covered by a safe span
          for (const toxic of toxicSubstrings) {
            /** @type {import('./matcher.js').MatchResult} */
            const toxicMatch = {
              term: toxic.term,
              start: toxic.start,
              end: toxic.end,
              source: 'built-in'
            }

            const covered = isCoveredBySafeContext(toxicMatch, safeSpans)
            expect(covered).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Supplementary: Safe-context matches are correctly positioned.
   *
   * For any safe-context phrase used as the complete text, findSafeContextMatches
   * should return at least one match whose span covers the entire text
   * (start === 0, end === text.length).
   */
  it('safe-context phrase as full text produces a match spanning the entire text', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allSafeContextPhrases),
        (phrase) => {
          const text = phrase
          const matches = findSafeContextMatches(text, safeContextAutomaton)

          // Should have at least one match
          expect(matches.length).toBeGreaterThanOrEqual(1)

          // At least one match should span the full text (the phrase itself)
          const fullSpan = matches.some(m => m.start === 0 && m.end === text.length)
          expect(fullSpan).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Supplementary: isCoveredBySafeContext returns false when there are no safe spans.
   *
   * For any toxic match, if the safe spans array is empty, coverage is always false.
   */
  it('toxic matches are never covered when safe spans are empty', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allToxicTerms.slice(0, 50)), // sample toxic terms
        fc.nat({ max: 100 }),
        (term, offset) => {
          /** @type {import('./matcher.js').MatchResult} */
          const toxicMatch = {
            term,
            start: offset,
            end: offset + term.length,
            source: 'built-in'
          }

          // No safe spans → never covered
          const covered = isCoveredBySafeContext(toxicMatch, [])
          expect(covered).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 6: Allow-list never overrides crisis (separation of concerns) ───

describe('Feature: multilingual-word-filter, Property 6: Allow-list never overrides crisis', () => {
  /**
   * Property 6: Allow-list never overrides crisis
   * Validates: Requirements 7.3, 7.5
   *
   * For any term that appears in both an allow-list (safe-context) and a
   * crisis list, the moderation engine SHALL return a crisis verdict.
   *
   * At the module level, this property tests separation of concerns:
   * - The safe-context module itself just reports whether spans overlap.
   *   It does NOT know about crisis priority.
   * - The engine checks crisis BEFORE applying safe-context suppression.
   * - So if we build a safe-context automaton that includes crisis terms,
   *   isCoveredBySafeContext CAN return true — proving the module doesn't
   *   itself block crisis. The engine enforces priority, not this module.
   *
   * This test verifies:
   * 1. findSafeContextMatches DOES find crisis terms in a safe-context automaton
   *    (the module doesn't filter them out)
   * 2. isCoveredBySafeContext CAN return true for crisis terms
   *    (the module has no crisis awareness — separation of concerns)
   * 3. This documents that the ENGINE must check crisis first
   */
  it('safe-context module does not block crisis terms — separation of concerns', () => {
    // Build a safe-context automaton that includes some crisis phrases
    // This simulates the scenario where a crisis phrase also appears in an allow-list
    const crisisSubset = allCrisisTerms.slice(0, 20)
    const combinedPhrases = [...allSafeContextPhrases, ...crisisSubset]
    const combinedAutomaton = buildAutomaton(combinedPhrases)

    fc.assert(
      fc.property(
        fc.constantFrom(...crisisSubset),
        (crisisTerm) => {
          // Use the crisis term as the text
          const text = crisisTerm

          // The safe-context module should find it in the combined automaton
          const safeMatches = findSafeContextMatches(text, combinedAutomaton)

          // The crisis term IS found as a "safe-context" match
          // (the module doesn't know the difference — it just matches phrases)
          expect(safeMatches.length).toBeGreaterThanOrEqual(1)

          // If we create a toxic match at the same position, it WOULD be covered
          const safeSpans = safeMatches.map(m => ({ start: m.start, end: m.end }))

          /** @type {import('./matcher.js').MatchResult} */
          const toxicMatch = {
            term: crisisTerm,
            start: 0,
            end: crisisTerm.length,
            source: 'built-in'
          }

          // isCoveredBySafeContext returns true — the MODULE doesn't block crisis
          // This proves the engine must check crisis BEFORE safe-context suppression
          const covered = isCoveredBySafeContext(toxicMatch, safeSpans)
          expect(covered).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Supplementary: Crisis terms in the actual safe-context automaton
   * are NOT found (because they're not in the safe-context lexicon).
   *
   * This verifies that our actual lexicon data keeps crisis and safe-context
   * separate — crisis terms should NOT appear in the safe-context phrase lists.
   */
  it('actual safe-context automaton does not contain crisis terms as full phrases', () => {
    // Use a subset of crisis terms for efficiency
    const crisisSubset = allCrisisTerms.filter(t => t.length >= 4).slice(0, 30)

    fc.assert(
      fc.property(
        fc.constantFrom(...crisisSubset),
        (crisisTerm) => {
          // Search for the crisis term as exact text in the real safe-context automaton
          const text = crisisTerm
          const matches = findSafeContextMatches(text, safeContextAutomaton)

          // Check that no match covers the FULL crisis term as a complete phrase
          // (Sub-phrase matches may exist if a safe-context phrase is a substring
          // of a crisis term, which is acceptable)
          const fullMatch = matches.some(
            m => m.start === 0 && m.end === text.length
          )

          // A crisis term should NOT be listed as a safe-context phrase
          expect(fullMatch).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})
