import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: custom-3d-models, Property 9: Scale Lerp Convergence
// **Validates: Requirements 4.2, 9.8**
describe('Property 9: Scale Lerp Convergence', () => {
  function lerp(current, target, alpha) {
    return current + (target - current) * alpha
  }

  it('lerp monotonically converges toward target without overshoot', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.5, max: 2.0, noNaN: true }),
        fc.constantFrom(1.0, 1.15),
        (initial, target) => {
          let current = initial

          for (let i = 0; i < 100; i++) {
            const next = lerp(current, target, 0.08)

            if (initial < target) {
              // Moving upward: next should never exceed target (no overshoot)
              expect(next).toBeLessThanOrEqual(target)
              // Monotonic: next should be >= current (moving toward target)
              expect(next).toBeGreaterThanOrEqual(current)
            } else if (initial > target) {
              // Moving downward: next should never go below target (no overshoot)
              expect(next).toBeGreaterThanOrEqual(target)
              // Monotonic: next should be <= current (moving toward target)
              expect(next).toBeLessThanOrEqual(current)
            } else {
              // initial === target: should stay at target
              expect(next).toBeCloseTo(target, 10)
            }

            // Distance to target should decrease or stay the same (convergence)
            const prevDistance = Math.abs(current - target)
            const nextDistance = Math.abs(next - target)
            expect(nextDistance).toBeLessThanOrEqual(prevDistance + 1e-10)

            current = next
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
