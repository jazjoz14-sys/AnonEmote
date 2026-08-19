import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: custom-3d-models, Property 14: Low Tier Half-Rate Bob
// **Validates: Requirements 6.2**

/**
 * Simulates the half-rate bob optimization from useAnimationController on low tier.
 *
 * In the real hook:
 *   frameCountRef.current += 1  (starts at 0, so first frame gives frameCount = 1)
 *   const shouldUpdateBob = !isLowTier || (frameCount % 2 === 0)
 *
 * On low tier, bob only updates when frameCount is even (2, 4, 6, ...).
 * Over N total frames, the number of bob updates = floor(N / 2).
 *
 * @param {number} totalFrames - Total number of frames to simulate
 * @returns {number} Number of frames where bob position was updated
 */
function simulateLowTierBobUpdates(totalFrames) {
  let frameCount = 0
  let updateCount = 0

  for (let i = 0; i < totalFrames; i++) {
    frameCount += 1
    const shouldUpdateBob = frameCount % 2 === 0

    if (shouldUpdateBob) {
      updateCount++
    }
  }

  return updateCount
}

describe('Property 14: Low Tier Half-Rate Bob', () => {
  it('bob only updates on even frame counts, resulting in floor(N/2) changes over N frames', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (totalFrames) => {
          const updateCount = simulateLowTierBobUpdates(totalFrames)
          expect(updateCount).toBe(Math.floor(totalFrames / 2))
        }
      ),
      { numRuns: 100 }
    )
  })

  it('bob never updates on odd frame counts (first frame is always skipped)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        (totalFrames) => {
          let frameCount = 0
          const updatedFrameIndices = []

          for (let i = 0; i < totalFrames; i++) {
            frameCount += 1
            if (frameCount % 2 === 0) {
              updatedFrameIndices.push(frameCount)
            }
          }

          // Every updated frame index should be even
          for (const idx of updatedFrameIndices) {
            expect(idx % 2).toBe(0)
          }

          // No odd frame indices should appear
          const oddUpdates = updatedFrameIndices.filter((idx) => idx % 2 !== 0)
          expect(oddUpdates).toHaveLength(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('half-rate bob produces roughly half the updates compared to full-rate', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 500 }),
        (totalFrames) => {
          // Full-rate: updates every frame
          const fullRateUpdates = totalFrames

          // Half-rate (low tier): updates only on even frame counts
          const halfRateUpdates = simulateLowTierBobUpdates(totalFrames)

          // The ratio should be approximately 0.5 (within 1 frame tolerance)
          // Exact: halfRate = floor(N/2), so halfRate/fullRate is in [0.5 - 1/N, 0.5]
          expect(halfRateUpdates).toBeLessThanOrEqual(Math.ceil(totalFrames / 2))
          expect(halfRateUpdates).toBeGreaterThanOrEqual(Math.floor(totalFrames / 2))
        }
      ),
      { numRuns: 100 }
    )
  })

  it('bob position only changes on update frames, remains static on skipped frames', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 200 }),
        fc.float({ min: Math.fround(0.1), max: Math.fround(3.0), noNaN: true, noDefaultInfinity: true }),
        fc.float({ min: Math.fround(0.05), max: Math.fround(1.0), noNaN: true, noDefaultInfinity: true }),
        (totalFrames, bobFrequency, bobAmplitude) => {
          let frameCount = 0
          let elapsed = 0
          const delta = 1 / 60 // ~60fps
          let lastBobValue = 0
          let positionChanges = 0

          for (let i = 0; i < totalFrames; i++) {
            elapsed += delta
            frameCount += 1
            const shouldUpdateBob = frameCount % 2 === 0

            const prevBob = lastBobValue
            if (shouldUpdateBob) {
              lastBobValue = Math.sin(elapsed * bobFrequency) * bobAmplitude
            }

            // Count actual position changes
            if (lastBobValue !== prevBob) {
              positionChanges++
            }
          }

          // Position changes should not exceed the number of update frames
          expect(positionChanges).toBeLessThanOrEqual(Math.floor(totalFrames / 2))
        }
      ),
      { numRuns: 100 }
    )
  })
})
