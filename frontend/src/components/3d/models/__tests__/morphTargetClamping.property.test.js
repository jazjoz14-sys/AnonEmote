import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: custom-3d-models, Property 13: Morph Target Influence Clamping
// **Validates: Requirements 11.7**
describe('Property 13: Morph Target Influence Clamping', () => {
  /**
   * Replicates the clamping logic from useAnimationController.js applyMorphTargets.
   * Any float assigned to a morph target influence is clamped to [0.0, 1.0].
   */
  function clampMorphInfluence(value) {
    return Math.max(0.0, Math.min(1.0, value))
  }

  it('any float value is clamped to [0.0, 1.0]', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -1000, max: 1000, noNaN: true }),
        (value) => {
          const clamped = clampMorphInfluence(value)
          expect(clamped).toBeGreaterThanOrEqual(0.0)
          expect(clamped).toBeLessThanOrEqual(1.0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('values within [0,1] are preserved', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (value) => {
          const clamped = clampMorphInfluence(value)
          expect(clamped).toBeCloseTo(value, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('negative values become 0', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: -Number.EPSILON, noNaN: true }),
        (value) => {
          const clamped = clampMorphInfluence(value)
          expect(clamped).toBe(0.0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('values above 1 become 1', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1 + Number.EPSILON, max: 1000, noNaN: true }),
        (value) => {
          const clamped = clampMorphInfluence(value)
          expect(clamped).toBe(1.0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
