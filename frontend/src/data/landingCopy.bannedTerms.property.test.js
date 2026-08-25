/**
 * Property-based tests for landingCopy.js — banned terms exclusion
 *
 * Feature: landing-page-refresh, Property 2: Copy excludes banned terms
 * Validates: Requirements 1.4, 2.4
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { HERO, STATEMENT } from './landingCopy.js'

/**
 * Banned terms that must never appear in hero or statement copy.
 * Case-insensitive matching is applied.
 */
const BANNED_TERMS = [
  'Zero Knowledge Architecture',
  'random number',
  'random UUID',
  'moderated by AI',
  'No data stored',
  'algorithm',
  'encryption',
  'machine learning',
  'database',
  'server',
  'administrators',
  'tab close',
  'expires',
  'UUID',
  'session',
  'token',
  'architecture',
]

/** All hero and statement copy strings to validate */
const heroStatementStrings = [
  HERO.eyebrow,
  HERO.subtitle,
  STATEMENT.eyebrow,
  STATEMENT.headline,
  STATEMENT.subtitle,
]

describe('landingCopy — Property 2: Copy excludes banned terms', () => {
  it('no hero/statement string contains any banned term (case-insensitive)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...heroStatementStrings),
        fc.constantFrom(...BANNED_TERMS),
        (copyString, bannedTerm) => {
          const lower = copyString.toLowerCase()
          const termLower = bannedTerm.toLowerCase()
          expect(lower).not.toContain(termLower)
        }
      ),
      { numRuns: 100 }
    )
  })
})
