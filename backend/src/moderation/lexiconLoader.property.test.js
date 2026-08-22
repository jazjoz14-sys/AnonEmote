/**
 * Lexicon Loader Property-Based Tests
 *
 * Uses fast-check to verify universal properties of the lexicon loader
 * and term validation across generated inputs.
 *
 * Properties tested:
 *  - Property 8: Lexicon file validation rejects invalid schemas
 *  - Property 10: Emotional expression safe-list exclusion
 *  - Property 11: Single-word terms respect length constraint
 */
import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { validateLexiconFile, loadBuiltInLexicons } from './lexiconLoader.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LEXICONS_DIR = join(__dirname, 'lexicons')

// ── Property 8: Lexicon file validation rejects invalid schemas ─────────────
describe('Feature: multilingual-word-filter, Property 8: Lexicon file validation rejects invalid schemas', () => {
  /**
   * Validates: Requirements 6.5, 6.6
   *
   * For any JSON that does not have both a `version` string field and a `terms`
   * array of strings, `validateLexiconFile` should return `valid: false`.
   */

  it('rejects objects missing the "version" field', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
        (terms) => {
          // Object has `terms` but no `version`
          const parsed = { terms }
          const result = validateLexiconFile(parsed, 'test-missing-version.json')
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects objects missing the "terms" field', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (version) => {
          // Object has `version` but no `terms`
          const parsed = { version }
          const result = validateLexiconFile(parsed, 'test-missing-terms.json')
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects objects where "version" is not a string', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.constant(undefined),
          fc.array(fc.string())
        ),
        fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
        (invalidVersion, terms) => {
          const parsed = { version: invalidVersion, terms }
          const result = validateLexiconFile(parsed, 'test-bad-version.json')
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects objects where "terms" is not an array', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.constant(null),
          fc.record({ nested: fc.string() })
        ),
        (version, invalidTerms) => {
          const parsed = { version, terms: invalidTerms }
          const result = validateLexiconFile(parsed, 'test-bad-terms.json')
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects objects where "terms" array contains non-string elements', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 10 }),
        fc.array(
          fc.oneof(fc.integer(), fc.boolean(), fc.constant(null), fc.array(fc.integer())),
          { minLength: 1, maxLength: 5 }
        ),
        (version, invalidTermElements) => {
          const parsed = { version, terms: invalidTermElements }
          const result = validateLexiconFile(parsed, 'test-bad-term-elements.json')
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects non-object values (arrays, primitives, null)', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.string(),
          fc.integer(),
          fc.boolean(),
          fc.array(fc.string())
        ),
        (parsed) => {
          const result = validateLexiconFile(parsed, 'test-non-object.json')
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rejects objects with empty string "version"', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
        (terms) => {
          const parsed = { version: '', terms }
          const result = validateLexiconFile(parsed, 'test-empty-version.json')
          expect(result.valid).toBe(false)
          expect(result.errors.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('accepts valid objects with version string and all-string terms array', () => {
    // Generate version strings that contain at least one non-whitespace character
    // (the validator treats whitespace-only versions as invalid/empty)
    const nonEmptyVersion = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => s.trim().length > 0)
    fc.assert(
      fc.property(
        nonEmptyVersion,
        fc.array(fc.string(), { minLength: 0, maxLength: 10 }),
        (version, terms) => {
          const parsed = { version, terms }
          const result = validateLexiconFile(parsed, 'test-valid.json')
          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
          expect(result.terms).toEqual(terms)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 10: Emotional expression safe-list exclusion ───────────────────
describe('Feature: multilingual-word-filter, Property 10: Emotional expression safe-list exclusion', () => {
  /**
   * Validates: Requirements 1.3, 2.4, 3.3
   *
   * For every term in the explicit exclusion lists, verify that term does NOT
   * appear in any toxic or crisis lexicon file.
   */

  // Excluded English emotional expressions (Req 1.3)
  const EXCLUDED_ENGLISH = [
    'depressed', 'depression', 'hurt', 'pain', 'painful',
    'angry', 'anger', 'hate', 'sad', 'cry', 'crying',
    'suffer', 'suffering', 'anxious', 'anxiety', 'scared',
    'afraid', 'lonely', 'hopeless', 'helpless', 'worthless',
    'miserable', 'frustrated', 'exhausted', 'overwhelmed',
    'broken', 'numb', 'empty', 'lost',
  ]

  // Excluded Filipino emotional expressions (Req 2.4)
  const EXCLUDED_FILIPINO = [
    'nakakapagod', 'pagod na ako', 'ang hirap', 'ang sakit',
    'nahihirapan ako', 'malungkot ako', 'naiiyak ako',
    'stressed ako', 'burned out na ako', 'sobrang bigat',
  ]

  // Excluded Bikolano emotional expressions (Req 3.3)
  const EXCLUDED_BIKOLANO = [
    'masakit', 'kapagalan', 'kasubago', 'mamundo', 'makulog',
  ]

  const ALL_EXCLUDED = [...EXCLUDED_ENGLISH, ...EXCLUDED_FILIPINO, ...EXCLUDED_BIKOLANO]

  // Load actual lexicon data from files
  const toxicFiles = ['en-toxic.json', 'tl-toxic.json', 'bcl-toxic.json']
  const crisisFiles = ['all-crisis.json']
  const allBlockedFiles = [...toxicFiles, ...crisisFiles]

  /** Collect all terms from toxic and crisis files */
  function loadBlockedTerms() {
    const allTerms = new Set()
    for (const filename of allBlockedFiles) {
      try {
        const raw = readFileSync(join(LEXICONS_DIR, filename), 'utf-8')
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed.terms)) {
          for (const term of parsed.terms) {
            allTerms.add(term)
          }
        }
      } catch {
        // File may not exist in test environments
      }
    }
    return allTerms
  }

  const blockedTerms = loadBlockedTerms()

  it('no excluded emotional expression appears in any toxic or crisis lexicon file', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...ALL_EXCLUDED),
        (excludedTerm) => {
          expect(blockedTerms.has(excludedTerm)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 11: Single-word terms respect length constraint ────────────────
describe('Feature: multilingual-word-filter, Property 11: Single-word terms respect length constraint', () => {
  /**
   * Validates: Requirements 1.4
   *
   * For all English toxic terms in en-toxic.json, verify each is lowercase
   * and ≤50 characters.
   */

  // Load en-toxic.json terms
  let enToxicTerms = []
  try {
    const raw = readFileSync(join(LEXICONS_DIR, 'en-toxic.json'), 'utf-8')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed.terms)) {
      enToxicTerms = parsed.terms
    }
  } catch {
    // Graceful fallback if file not available
  }

  it('every English toxic term is lowercase and ≤50 characters', () => {
    // Only run if we have terms loaded
    expect(enToxicTerms.length).toBeGreaterThan(0)

    fc.assert(
      fc.property(
        fc.constantFrom(...enToxicTerms),
        (term) => {
          // Term must be lowercase
          expect(term).toBe(term.toLowerCase())
          // Term must be ≤50 characters
          expect(term.length).toBeLessThanOrEqual(50)
        }
      ),
      { numRuns: 100 }
    )
  })
})
