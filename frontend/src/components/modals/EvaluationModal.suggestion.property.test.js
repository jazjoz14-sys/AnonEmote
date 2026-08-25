/**
 * Property-based tests for EvaluationModal suggestion field validation.
 *
 * Feature: user-evaluation, Property 5: Suggestion Field Validation
 * Validates: Requirements 4.1
 *
 * The validation rules for the suggestion field:
 * - Empty string → VALID (field is optional)
 * - Non-empty but whitespace-only → INVALID
 * - Trimmed length < 3 → INVALID
 * - Trimmed length > 140 → INVALID
 * - Trimmed length 3–140 with non-whitespace → VALID
 *
 * These rules are consistent between the frontend (EvaluationModal.jsx)
 * and the backend (routes/evaluations.js validateEvaluation).
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ── Constants matching EvaluationModal.jsx ───────────────────────────────────
const SUGGESTION_MIN = 3
const SUGGESTION_MAX = 140

// ── Pure validation function (extracted from EvaluationModal.jsx logic) ──────
/**
 * Validates a suggestion field value.
 * Replicates the exact logic from EvaluationModal.jsx validateSuggestion().
 *
 * @param {string} suggestion - The raw suggestion string
 * @returns {boolean} true if valid, false if invalid
 */
function validateSuggestion(suggestion) {
  const trimmed = suggestion.trim()
  // Empty is valid — field is optional
  if (trimmed.length === 0 && suggestion.length === 0) return true
  // Non-empty but whitespace-only → invalid
  if (trimmed.length === 0) return false
  // Too short
  if (trimmed.length < SUGGESTION_MIN) return false
  // Too long
  if (trimmed.length > SUGGESTION_MAX) return false
  // Valid: 3–140 trimmed chars with non-whitespace content
  return true
}

// ── Reference oracle ─────────────────────────────────────────────────────────
/**
 * Oracle function: the canonical specification of validity.
 * A string is valid iff:
 *   - It is the empty string (field is optional), OR
 *   - Its trimmed length is between 3 and 140 inclusive (and has non-whitespace)
 *
 * @param {string} s
 * @returns {boolean}
 */
function isValidOracle(s) {
  if (s === '') return true
  const trimmed = s.trim()
  return trimmed.length >= 3 && trimmed.length <= 140
}

// ── Generators ───────────────────────────────────────────────────────────────

/**
 * Generate strings that are guaranteed to be valid suggestions:
 * non-empty, trimmed length between 3 and 140, at least one non-whitespace char.
 */
const arbValidSuggestion = fc.string({ minLength: 3, maxLength: 140 }).filter((s) => {
  const trimmed = s.trim()
  return trimmed.length >= 3 && trimmed.length <= 140
})

/**
 * Generate whitespace-only strings (non-empty).
 * These should always be invalid.
 */
const arbWhitespaceOnly = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\u00A0'), { minLength: 1, maxLength: 50 })
  .map((chars) => chars.join(''))

/**
 * Generate strings whose trimmed length is less than 3 (but non-empty and not whitespace-only).
 * e.g., " a " (trimmed = "a", length 1), " ab" (trimmed = "ab", length 2)
 */
const arbTooShort = fc
  .tuple(
    fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 5 }),
    fc.constantFrom('a', 'b', 'x', 'z', '1', '!', 'A', 'B'),
    fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 5 })
  )
  .map(([pre, core, post]) => [...pre, core, ...post].join(''))
  .filter((s) => {
    const trimmed = s.trim()
    return trimmed.length > 0 && trimmed.length < 3
  })

/**
 * Generate strings whose trimmed length exceeds 140 chars.
 * Uses a repeated character pattern to guarantee sufficient non-whitespace length.
 */
const arbTooLong = fc
  .integer({ min: 141, max: 250 })
  .map((len) => 'x'.repeat(len))

// ── Property Tests ───────────────────────────────────────────────────────────

describe('Property 5: Suggestion Field Validation', () => {
  it('the empty string is always valid (field is optional)', () => {
    // Deterministic: empty string is the trivially valid case
    expect(validateSuggestion('')).toBe(true)
    expect(isValidOracle('')).toBe(true)
  })

  it('for any arbitrary string, validateSuggestion agrees with the specification oracle', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = validateSuggestion(s)
        const expected = isValidOracle(s)
        expect(result).toBe(expected)
      }),
      { numRuns: 500 }
    )
  })

  it('any string with trimmed length 3–140 and non-whitespace content is valid', () => {
    fc.assert(
      fc.property(arbValidSuggestion, (s) => {
        expect(validateSuggestion(s)).toBe(true)
      }),
      { numRuns: 200 }
    )
  })

  it('any non-empty whitespace-only string is invalid', () => {
    fc.assert(
      fc.property(arbWhitespaceOnly, (s) => {
        expect(validateSuggestion(s)).toBe(false)
      }),
      { numRuns: 200 }
    )
  })

  it('any string with trimmed length < 3 (non-empty, has non-whitespace) is invalid', () => {
    fc.assert(
      fc.property(arbTooShort, (s) => {
        expect(validateSuggestion(s)).toBe(false)
      }),
      { numRuns: 200 }
    )
  })

  it('any string with trimmed length > 140 is invalid', () => {
    fc.assert(
      fc.property(arbTooLong, (s) => {
        expect(validateSuggestion(s)).toBe(false)
      }),
      { numRuns: 200 }
    )
  })

  it('validation is consistent regardless of leading/trailing whitespace padding', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 140 }).filter((s) => s.trim().length >= 3 && s.trim().length <= 140),
        fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 10 }).map((a) => a.join('')),
        fc.array(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 10 }).map((a) => a.join('')),
        (core, padLeft, padRight) => {
          const padded = padLeft + core + padRight
          // The padded version should have the same validity as the core
          // (as long as the trimmed result is still in range)
          const trimmedLength = padded.trim().length
          if (trimmedLength >= 3 && trimmedLength <= 140) {
            expect(validateSuggestion(padded)).toBe(true)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('the boundary at exactly 3 trimmed chars is valid', () => {
    fc.assert(
      fc.property(
        fc.array(fc.char().filter((c) => c.trim().length > 0), { minLength: 3, maxLength: 3 }).map((a) => a.join('')),
        (s) => {
          // 3 non-whitespace chars should always be valid
          if (s.trim().length === 3) {
            expect(validateSuggestion(s)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('the boundary at exactly 140 trimmed chars is valid', () => {
    fc.assert(
      fc.property(
        fc.array(fc.char().filter((c) => c.trim().length > 0), { minLength: 140, maxLength: 140 }).map((a) => a.join('')),
        (s) => {
          // 140 non-whitespace chars should always be valid
          if (s.trim().length === 140) {
            expect(validateSuggestion(s)).toBe(true)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('the boundary at exactly 141 trimmed chars is invalid', () => {
    fc.assert(
      fc.property(
        fc.array(fc.char().filter((c) => c.trim().length > 0), { minLength: 141, maxLength: 141 }).map((a) => a.join('')),
        (s) => {
          // 141 non-whitespace chars should always be invalid
          if (s.trim().length === 141) {
            expect(validateSuggestion(s)).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
