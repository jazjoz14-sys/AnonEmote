/**
 * Property-based tests for landingCopy.js — clinical terms exclusion
 *
 * Feature: landing-page-refresh, Property 6: Planet descriptions exclude clinical language
 * Validates: Requirements 4.5
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { PLANET_DESCRIPTIONS } from './landingCopy.js'

/**
 * Clinical/diagnostic terms that must never appear in planet descriptions.
 * Case-insensitive matching is applied.
 */
const CLINICAL_TERMS = [
  'therapy',
  'treatment',
  'diagnosis',
  'symptoms',
]

describe('landingCopy — Property 6: Planet descriptions exclude clinical language', () => {
  it('no planet tagline or purpose contains any clinical term (case-insensitive)', () => {
    const planetIds = Object.keys(PLANET_DESCRIPTIONS)

    fc.assert(
      fc.property(
        fc.constantFrom(...planetIds),
        fc.constantFrom(...CLINICAL_TERMS),
        (id, clinicalTerm) => {
          const tagline = PLANET_DESCRIPTIONS[id].tagline.toLowerCase()
          const purpose = PLANET_DESCRIPTIONS[id].purpose.toLowerCase()
          const termLower = clinicalTerm.toLowerCase()

          expect(tagline).not.toContain(termLower)
          expect(purpose).not.toContain(termLower)
        }
      ),
      { numRuns: 100 }
    )
  })
})
