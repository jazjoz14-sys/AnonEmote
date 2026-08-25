/**
 * Property-Based Tests: Constellation Layout Algorithm
 *
 * Feature: checkin-experience-redesign
 *
 * Tests the pure layout functions in constellationLayout.js:
 * - generateConstellationPositions: organic scattered placement
 * - generateAnimationParams: drift/duration/delay values
 * - validateHitAreas: WCAG touch-target compliance
 *
 * **Validates: Requirements 4.2, 4.5, 4.6**
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

import {
  generateConstellationPositions,
  generateAnimationParams,
  validateHitAreas,
} from '../lib/constellationLayout.js'

describe('Feature: checkin-experience-redesign, Property 7: Constellation layout within bounds', () => {
  /**
   * Property 7: For ANY containerWidth >= 280, containerHeight >= 200, and ANY seed integer,
   * generateConstellationPositions(6, w, h, seed) returns 6 positions where every item's
   * center +/- half its dimensions stays within [0, containerWidth] x [0, containerHeight].
   *
   * **Validates: Requirements 4.2**
   */
  it('all positions remain within container bounds for any valid dimensions and seed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 280, max: 2000 }),
        fc.integer({ min: 200, max: 1500 }),
        fc.integer(),
        (width, height, seed) => {
          const positions = generateConstellationPositions(6, width, height, seed)

          // Must return exactly 6 items
          expect(positions).toHaveLength(6)

          for (const pos of positions) {
            // Left edge of hit area must be >= 0
            const left = pos.x - pos.width / 2
            expect(left).toBeGreaterThanOrEqual(0)

            // Right edge of hit area must be <= containerWidth
            const right = pos.x + pos.width / 2
            expect(right).toBeLessThanOrEqual(width)

            // Top edge of hit area must be >= 0
            const top = pos.y - pos.height / 2
            expect(top).toBeGreaterThanOrEqual(0)

            // Bottom edge of hit area must be <= containerHeight
            const bottom = pos.y + pos.height / 2
            expect(bottom).toBeLessThanOrEqual(height)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Feature: checkin-experience-redesign, Property 9: Animation parameter ranges', () => {
  /**
   * Property 9: For ANY count=6 and ANY seed, generateAnimationParams(6, seed) returns
   * items where each has drift in [2, 6] and duration in [3, 6], and no two items share
   * the same duration value (ensuring desynchronised motion).
   *
   * **Validates: Requirements 4.5**
   */
  it('drift values are within [2, 6] and duration values are within [3, 6] with no duplicates', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        (seed) => {
          const params = generateAnimationParams(6, seed)

          expect(params).toHaveLength(6)

          const durations = new Set()

          for (const item of params) {
            // Drift must be in [2, 6]
            expect(item.drift).toBeGreaterThanOrEqual(2)
            expect(item.drift).toBeLessThanOrEqual(6)

            // Duration must be in [3, 6]
            expect(item.duration).toBeGreaterThanOrEqual(3)
            expect(item.duration).toBeLessThanOrEqual(6)

            // Collect durations for uniqueness check
            durations.add(item.duration)
          }

          // No two items should share the exact same duration
          expect(durations.size).toBe(6)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Feature: checkin-experience-redesign, Property 10: Hit area minimum sizing', () => {
  /**
   * Property 10: For ANY containerWidth >= 280, containerHeight >= 200, and ANY seed,
   * generateConstellationPositions(6, w, h, seed) returns items where
   * validateHitAreas(positions, 44, 8) reports { valid: true }.
   *
   * **Validates: Requirements 4.6**
   */
  it('every item has >= 44x44px hit area with minimum 8px gap between adjacent areas', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 280, max: 2000 }),
        fc.integer({ min: 200, max: 1500 }),
        fc.integer(),
        (width, height, seed) => {
          const positions = generateConstellationPositions(6, width, height, seed)
          const result = validateHitAreas(positions, 44, 8)

          expect(result.valid).toBe(true)
          expect(result.violations).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
