/**
 * Lexicon Term Normalization Property-Based Tests
 *
 * **Validates: Requirements 8.4, 8.6**
 *
 * Property 18: For any array of terms, normaliseTerms SHALL produce output that is:
 * all lowercase, all trimmed (no leading/trailing whitespace), deduplicated,
 * with all empty-after-trim and >100 character entries removed.
 *
 * Tag: Feature: qa-testing-error-handling, Property 18: Lexicon term normalization
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'

// Mock Supabase and fs to prevent side effects during import
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => null),
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    promises: {
      ...actual.promises,
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(JSON.stringify({ crisis: [], toxic: [], allow: [] })),
      appendFile: vi.fn().mockResolvedValue(undefined),
    },
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  }
})

import { normaliseTerms } from './storage.js'

describe('Feature: qa-testing-error-handling, Property 18: Lexicon term normalization', () => {
  it('normaliseTerms output is all lowercase, trimmed, deduplicated, with empty/long entries removed (100 iterations)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string()),
        (terms) => {
          const result = normaliseTerms(terms)

          // 1. All entries are lowercase
          for (const entry of result) {
            expect(entry).toBe(entry.toLowerCase())
          }

          // 2. All entries are trimmed (no leading/trailing whitespace)
          for (const entry of result) {
            expect(entry).toBe(entry.trim())
          }

          // 3. No duplicates
          const unique = [...new Set(result)]
          expect(result).toHaveLength(unique.length)

          // 4. No empty strings (after trim)
          for (const entry of result) {
            expect(entry.length).toBeGreaterThan(0)
          }

          // 5. No entries exceeding 100 characters
          for (const entry of result) {
            expect(entry.length).toBeLessThanOrEqual(100)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('normaliseTerms converts uppercase terms to lowercase', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.toUpperCase())),
        (terms) => {
          const result = normaliseTerms(terms)
          for (const entry of result) {
            expect(entry).toBe(entry.toLowerCase())
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('normaliseTerms trims whitespace from all entries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(fc.string(), fc.string({ minLength: 1, maxLength: 30 }), fc.string()).map(
            ([pre, core, post]) => {
              // Create strings with leading/trailing whitespace
              const ws = ' \t\n'
              const leading = ws.repeat(Math.floor(Math.random() * 3))
              const trailing = ws.repeat(Math.floor(Math.random() * 3))
              return leading + core + trailing
            }
          )
        ),
        (terms) => {
          const result = normaliseTerms(terms)
          for (const entry of result) {
            expect(entry).toBe(entry.trim())
            expect(entry.startsWith(' ')).toBe(false)
            expect(entry.startsWith('\t')).toBe(false)
            expect(entry.endsWith(' ')).toBe(false)
            expect(entry.endsWith('\t')).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('normaliseTerms removes duplicates from the array', () => {
    fc.assert(
      fc.property(
        // Generate arrays with intentional duplicates
        fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }).map(
          (arr) => [...arr, ...arr] // duplicate the array to ensure dups exist
        ),
        (terms) => {
          const result = normaliseTerms(terms)
          const asSet = new Set(result)
          expect(result.length).toBe(asSet.size)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('normaliseTerms removes empty strings and strings that become empty after trim', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            fc.constant(''),
            fc.constant('   '),
            fc.constant('\t\n'),
            fc.string({ minLength: 1, maxLength: 50 })
          )
        ),
        (terms) => {
          const result = normaliseTerms(terms)
          for (const entry of result) {
            expect(entry.length).toBeGreaterThan(0)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('normaliseTerms removes entries exceeding 100 characters', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(
            // Some terms under 100 chars
            fc.string({ minLength: 1, maxLength: 50 }),
            // Some terms over 100 chars
            fc.string({ minLength: 101, maxLength: 200 })
          )
        ),
        (terms) => {
          const result = normaliseTerms(terms)
          for (const entry of result) {
            expect(entry.length).toBeLessThanOrEqual(100)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('normaliseTerms handles non-array input gracefully by returning empty array', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.integer(),
          fc.string(),
          fc.constant({})
        ),
        (input) => {
          const result = normaliseTerms(input)
          expect(Array.isArray(result)).toBe(true)
          expect(result).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
