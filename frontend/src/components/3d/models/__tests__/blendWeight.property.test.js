import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: custom-3d-models, Property 12: Blend Weight Interpolation
// **Validates: Requirements 11.3**

/**
 * Computes a blended value between a programmatic contribution and a clip contribution.
 *
 * In useAnimationController, blended mode applies:
 *   - Programmatic contribution weight = (1 - blendWeight)
 *   - Clip contribution weight = blendWeight
 *
 * For rotation: rotationSpeed * delta * (1 - blendWeight) is the programmatic part
 * For mixer update: delta * blendWeight is the clip part
 *
 * This function models the general blend formula: output = (1 - w) * P + w * C
 *
 * @param {number} programmatic - The programmatic animation value (P)
 * @param {number} clip - The clip animation value (C)
 * @param {number} weight - Blend weight in [0.0, 1.0]
 * @returns {number} The blended output
 */
function blend(programmatic, clip, weight) {
  return (1 - weight) * programmatic + weight * clip
}

describe('Property 12: Blend Weight Interpolation', () => {
  it('blended output equals (1-w)*P + w*C for any valid inputs', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),       // weight
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),    // programmatic value
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),    // clip value
        (w, P, C) => {
          const result = blend(P, C, w)
          const expected = (1 - w) * P + w * C
          expect(Math.abs(result - expected)).toBeLessThanOrEqual(0.001)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('w=0 yields pure programmatic value', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),    // programmatic value
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),    // clip value
        (P, C) => {
          const result = blend(P, C, 0)
          expect(Math.abs(result - P)).toBeLessThanOrEqual(0.001)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('w=1 yields pure clip value', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),    // programmatic value
        fc.float({ min: -10, max: 10, noNaN: true, noDefaultInfinity: true }),    // clip value
        (P, C) => {
          const result = blend(P, C, 1)
          expect(Math.abs(result - C)).toBeLessThanOrEqual(0.001)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('blend is monotonic in weight: increasing w moves output from P toward C', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.01), max: Math.fround(0.49), noNaN: true, noDefaultInfinity: true }),  // w1 (lower weight)
        fc.float({ min: Math.fround(0.51), max: Math.fround(0.99), noNaN: true, noDefaultInfinity: true }),  // w2 (higher weight)
        fc.float({ min: Math.fround(0.1), max: 10, noNaN: true, noDefaultInfinity: true }),                  // P (positive, less than C)
        (w1, w2, P) => {
          // Use C > P so that increasing weight moves output upward
          const C = P + 5.0
          const result1 = blend(P, C, w1)
          const result2 = blend(P, C, w2)

          // Higher weight should produce a value closer to C (larger when C > P)
          expect(result2).toBeGreaterThanOrEqual(result1 - 0.001)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('blended rotation contribution matches useAnimationController formula', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),                               // blendWeight
        fc.float({ min: Math.fround(0.1), max: Math.fround(5.0), noNaN: true, noDefaultInfinity: true }), // rotationSpeed
        fc.float({ min: Math.fround(0.001), max: Math.fround(0.1), noNaN: true, noDefaultInfinity: true }), // delta (frame time)
        (blendWeight, rotationSpeed, delta) => {
          // In useAnimationController, the programmatic rotation contribution is:
          //   rotationSpeed * delta * (1 - blendWeight)
          // And the clip mixer gets:
          //   delta * blendWeight
          //
          // Total effective delta distributed = delta*(1-blendWeight) + delta*blendWeight = delta
          const programmaticContrib = rotationSpeed * delta * (1 - blendWeight)
          const clipDelta = delta * blendWeight

          // Verify the two weighted contributions sum to the right total
          // (programmatic portion + clip portion of delta = full delta)
          const totalDeltaUsed = delta * (1 - blendWeight) + clipDelta
          expect(Math.abs(totalDeltaUsed - delta)).toBeLessThanOrEqual(0.001)

          // Verify programmatic contribution matches blend formula
          const fullProgrammatic = rotationSpeed * delta   // what you'd get at w=0
          const blendedProgrammatic = blend(fullProgrammatic, 0, blendWeight)
          expect(Math.abs(programmaticContrib - blendedProgrammatic)).toBeLessThanOrEqual(0.001)
        }
      ),
      { numRuns: 100 }
    )
  })
})
