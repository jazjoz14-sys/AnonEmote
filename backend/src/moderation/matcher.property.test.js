/**
 * Matcher Property-Based Tests — Word-Boundary Detection
 *
 * Uses fast-check to verify that the hasWordBoundary function correctly
 * prevents partial-word false positives for single-word toxic terms.
 *
 * @module moderation/matcher.property.test
 */

import * as fc from 'fast-check'
import { describe, it, expect } from 'vitest'
import { buildAutomaton, searchAll, hasWordBoundary } from './matcher.js'

/**
 * Short toxic terms commonly embedded inside legitimate English words.
 * These are chosen because they frequently appear as substrings in
 * harmless words (e.g., "ass" in "class", "ho" in "honest").
 */
const TOXIC_TERMS = ['ass', 'ho', 'nig', 'fag', 'cum', 'tit', 'damn', 'die', 'rat']

/**
 * Arbitrary for generating a lowercase alphabetic string of at least 1 character.
 * Used to produce prefix/suffix padding around toxic terms.
 */
const alphaStr = (minLen = 1, maxLen = 6) =>
  fc.array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: minLen, maxLength: maxLen })
    .map(chars => chars.join(''))

describe('Feature: multilingual-word-filter, Property 5: Word-boundary detection prevents partial-word matches', () => {
  /**
   * Property 5: Word-boundary detection prevents partial-word matches
   * Validates: Requirements 9.4
   *
   * For any single-word toxic term and for any English word that contains
   * that term as a proper substring (not at a word boundary), the
   * hasWordBoundary function SHALL return false.
   */
  it('should return false when a toxic term is embedded inside a larger word (prefix + term + suffix)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TOXIC_TERMS),
        alphaStr(1, 5),
        alphaStr(1, 5),
        (term, prefix, suffix) => {
          // Build a word that contains the term as a proper substring
          // Both prefix and suffix are non-empty alphabetic — no word boundary
          const word = prefix + term + suffix
          const start = prefix.length
          const end = start + term.length

          /** @type {import('./matcher.js').MatchResult} */
          const match = { term, start, end, source: 'built-in' }

          // hasWordBoundary should return false — the term is embedded
          const result = hasWordBoundary(word, match)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when a toxic term has only a prefix (term at end of word)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TOXIC_TERMS),
        alphaStr(1, 5),
        (term, prefix) => {
          // Term at the end of a larger word — prefix is alphabetic (no boundary)
          const word = prefix + term
          const start = prefix.length
          const end = start + term.length

          /** @type {import('./matcher.js').MatchResult} */
          const match = { term, start, end, source: 'built-in' }

          // Before the term is alphabetic → no word boundary on the left
          const result = hasWordBoundary(word, match)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return false when a toxic term has only a suffix (term at start of word)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TOXIC_TERMS),
        alphaStr(1, 5),
        (term, suffix) => {
          // Term at the start of a larger word — suffix is alphabetic (no boundary)
          const word = term + suffix
          const start = 0
          const end = term.length

          /** @type {import('./matcher.js').MatchResult} */
          const match = { term, start, end, source: 'built-in' }

          // After the term is alphabetic → no word boundary on the right
          const result = hasWordBoundary(word, match)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Positive case: The same term surrounded by spaces or at string
   * boundaries should return true (valid word-boundary match).
   */
  it('should return true when a toxic term is at a word boundary (spaces or string edges)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TOXIC_TERMS),
        fc.constantFrom('', ' ', '.', ',', '!', '?', ';', ':'),
        fc.constantFrom('', ' ', '.', ',', '!', '?', ';', ':'),
        (term, beforeChar, afterChar) => {
          // Build text with the term surrounded by boundary characters
          const text = beforeChar + term + afterChar
          const start = beforeChar.length
          const end = start + term.length

          /** @type {import('./matcher.js').MatchResult} */
          const match = { term, start, end, source: 'built-in' }

          // hasWordBoundary should return true — surrounded by boundaries
          const result = hasWordBoundary(text, match)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * Supplementary: Multi-word terms always pass boundary validation,
   * regardless of surrounding context.
   */
  it('should return true for multi-word terms (containing spaces) regardless of context', () => {
    const multiWordTerms = ['kill yourself', 'you die', 'go away', 'shut up']

    fc.assert(
      fc.property(
        fc.constantFrom(...multiWordTerms),
        alphaStr(0, 4),
        alphaStr(0, 4),
        (term, prefix, suffix) => {
          const text = prefix + term + suffix
          const start = prefix.length
          const end = start + term.length

          /** @type {import('./matcher.js').MatchResult} */
          const match = { term, start, end, source: 'built-in' }

          // Multi-word terms skip boundary validation → always true
          const result = hasWordBoundary(text, match)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})
