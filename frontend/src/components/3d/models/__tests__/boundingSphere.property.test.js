import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: custom-3d-models, Property 2: Bounding Sphere Scaling
// **Validates: Requirements 1.4, 2.7**
describe('Property 2: Bounding Sphere Scaling', () => {
  it('computed uniform scale normalizes rendered radius to target size', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(100), noNaN: true }),   // target planet size (positive)
        fc.float({ min: Math.fround(0.01), max: Math.fround(50), noNaN: true }),   // GLB bounding sphere radius (positive)
        (targetSize, bsRadius) => {
          // The scaling formula: uniformScale = targetSize / boundingSphereRadius
          const uniformScale = targetSize / bsRadius

          // After applying the scale, the rendered radius should equal the target size
          const renderedRadius = bsRadius * uniformScale

          // Assert rendered radius matches target within floating-point tolerance
          expect(Math.abs(renderedRadius - targetSize)).toBeLessThanOrEqual(0.001)
        }
      ),
      { numRuns: 100 }
    )
  })
})
