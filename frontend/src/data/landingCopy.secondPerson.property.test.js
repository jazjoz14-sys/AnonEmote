/**
 * Property-based tests for landing page copy — second-person language in planet taglines.
 *
 * Feature: landing-page-refresh, Property 3: Planet taglines use second-person language
 * Validates: Requirements 4.1, 4.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { PLANET_DESCRIPTIONS } from './landingCopy.js'

/**
 * Regex matching second-person pronouns: "you", "your", "you're"
 * Case-insensitive to catch sentence-initial usage.
 */
const SECOND_PERSON_RE = /(you|your|you're)/i

describe('landingCopy - Property 3: Planet taglines use second-person language', () => {
  it('every planet tagline contains at least one second-person pronoun', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(PLANET_DESCRIPTIONS)),
        (planetId) => {
          const tagline = PLANET_DESCRIPTIONS[planetId].tagline
          expect(tagline).toMatch(SECOND_PERSON_RE)
        }
      ),
      { numRuns: 100 }
    )
  })
})
