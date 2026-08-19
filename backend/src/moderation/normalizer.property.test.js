/**
 * Normalizer Property-Based Tests
 *
 * Uses fast-check to verify universal properties of the normalize function
 * across generated inputs with various evasion techniques.
 */

import * as fc from 'fast-check'
import { normalize } from './engine.js'
import { injectRepetitions, injectZeroWidth } from '../../tests/helpers.js'

describe('Feature: qa-testing-error-handling, Property 11: Normalizer repetition reduction', () => {
  /**
   * Property 11: Normalizer repetition reduction
   * Validates: Requirements 2.2
   *
   * For all text inputs with 3 or more consecutive identical characters,
   * the normalizer SHALL reduce repetition to at most 2 consecutive identical characters.
   */
  it('should reduce 3+ consecutive identical characters to at most 2', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).map((text) => injectRepetitions(text)),
        (input) => {
          const result = normalize(input)
          // After normalization, no character should appear more than 2 times consecutively
          const hasExcessiveRepetition = /(.)\1{2,}/.test(result)
          return !hasExcessiveRepetition
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Feature: qa-testing-error-handling, Property 13: Normalizer whitespace normalization', () => {
  /**
   * Property 13: Normalizer whitespace normalization
   * **Validates: Requirements 2.4**
   *
   * For all arbitrary string inputs, the normalizer SHALL produce output with:
   * 1. No leading whitespace
   * 2. No trailing whitespace
   * 3. No consecutive internal spaces (more than 1 space in a row)
   */
  it('should produce output with no leading/trailing whitespace and no consecutive spaces', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const output = normalize(input)

        if (output === '') {
          // Empty output is always valid
          return true
        }

        // No leading whitespace
        expect(output).toBe(output.trimStart())

        // No trailing whitespace
        expect(output).toBe(output.trimEnd())

        // No consecutive spaces (two or more spaces in a row)
        expect(output).not.toMatch(/  /)
      }),
      { numRuns: 100 }
    )
  })
})

describe('Feature: qa-testing-error-handling, Property 12: Normalizer zero-width character removal', () => {
  /**
   * Property 12: Normalizer zero-width character removal
   * Validates: Requirements 2.3
   *
   * For any input string with zero-width characters (U+200B, U+200C, U+200D, U+FEFF)
   * injected at random positions, after normalize(), the output contains none of those codepoints.
   */
  const ZERO_WIDTH_CHARS = ['\u200B', '\u200C', '\u200D', '\uFEFF']

  it('should remove all zero-width characters from any input', () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 50 }), (input) => {
        // Inject zero-width characters at random positions
        const withZeroWidth = injectZeroWidth(input)

        // Normalize the text
        const result = normalize(withZeroWidth)

        // Assert: none of the zero-width codepoints remain in the output
        for (const zwc of ZERO_WIDTH_CHARS) {
          if (result.includes(zwc)) {
            return false
          }
        }
        return true
      }),
      { numRuns: 100 }
    )
  })
})
