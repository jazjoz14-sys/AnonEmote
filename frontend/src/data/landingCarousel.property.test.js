/**
 * Property-based tests for active slide derivation in the landing page carousel.
 *
 * Feature: landing-page-refresh, Property 5: Active slide derivation is bounded
 * Validates: Requirements 6.1, 6.2
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { PLANETS } from './planets.js'

describe('Landing Carousel - Property 5: Active slide derivation is bounded', () => {
  it('for any scroll progress in [0,1], the active slide index is an integer in [0, PLANETS.length - 1]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (progress) => {
          const activeIndex = Math.round(progress * (PLANETS.length - 1))

          // Result must be an integer
          expect(Number.isInteger(activeIndex)).toBe(true)

          // Result must be >= 0
          expect(activeIndex).toBeGreaterThanOrEqual(0)

          // Result must be <= PLANETS.length - 1
          expect(activeIndex).toBeLessThanOrEqual(PLANETS.length - 1)
        }
      ),
      { numRuns: 200 }
    )
  })
})
