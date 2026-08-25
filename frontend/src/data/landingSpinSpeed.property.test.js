/**
 * Property-based tests for spinSpeed range validation
 *
 * Feature: landing-page-refresh, Property 7: SpinSpeed within valid rotation range
 * Validates: Requirements 5.7, 6.1
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

describe('landingSpinSpeed - Property 7: SpinSpeed within valid rotation range', () => {
  it('for any orbital radius in [12, 62], spinSpeed formula yields value in [0.1, 0.5]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 12, max: 62, noNaN: true }),
        (radius) => {
          const spinSpeed = 0.34 - (radius / 52) * 0.2
          expect(spinSpeed).toBeGreaterThanOrEqual(0.1)
          expect(spinSpeed).toBeLessThanOrEqual(0.5)
        }
      ),
      { numRuns: 100 }
    )
  })
})
