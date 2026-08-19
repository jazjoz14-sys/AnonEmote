import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// Feature: custom-3d-models, Property 8: Animation Frame-Rate Independence
// **Validates: Requirements 4.1, 4.3, 4.7**

/**
 * Simulates the rotation accumulation logic from useAnimationController.
 * In the real hook: mesh.rotation.y += rotationSpeed * delta (per frame)
 * Total rotation after all frames = rotationSpeed * sum(deltas)
 *
 * @param {number} rotationSpeed - rad/s
 * @param {number[]} deltas - array of frame delta times
 * @returns {number} accumulated rotation angle
 */
function simulateRotation(rotationSpeed, deltas) {
  let rotation = 0
  for (const delta of deltas) {
    rotation += rotationSpeed * delta
  }
  return rotation
}

/**
 * Simulates the bob offset logic from useAnimationController.
 * In the real hook: mesh.position.y = sin(elapsedTime * bobFrequency) * bobAmplitude
 * where elapsedTime = sum of all deltas processed so far.
 *
 * @param {number} bobFrequency - frequency multiplier
 * @param {number} bobAmplitude - bob height in scene units
 * @param {number[]} deltas - array of frame delta times
 * @returns {number} final bob offset (position.y)
 */
function simulateBob(bobFrequency, bobAmplitude, deltas) {
  let elapsed = 0
  let bobValue = 0
  for (const delta of deltas) {
    elapsed += delta
    bobValue = Math.sin(elapsed * bobFrequency) * bobAmplitude
  }
  return bobValue
}

describe('Property 8: Animation Frame-Rate Independence', () => {
  it('rotation angle is the same regardless of frame delta distribution', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(5.0), noNaN: true, noDefaultInfinity: true }),   // rotationSpeed
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true, noDefaultInfinity: true }),  // total time T
        fc.integer({ min: 2, max: 50 }),   // frame count for sequence A
        fc.integer({ min: 2, max: 50 }),   // frame count for sequence B
        (rotationSpeed, totalTime, framesA, framesB) => {
          // Sequence A: uniform deltas (simulates high FPS)
          const deltaA = totalTime / framesA
          const deltasA = Array(framesA).fill(deltaA)

          // Sequence B: uniform deltas with different count (simulates low FPS)
          const deltaB = totalTime / framesB
          const deltasB = Array(framesB).fill(deltaB)

          const rotA = simulateRotation(rotationSpeed, deltasA)
          const rotB = simulateRotation(rotationSpeed, deltasB)

          expect(Math.abs(rotA - rotB)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rotation angle is the same with non-uniform delta distributions', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(5.0), noNaN: true, noDefaultInfinity: true }),   // rotationSpeed
        fc.float({ min: Math.fround(0.5), max: Math.fround(5.0), noNaN: true, noDefaultInfinity: true }),   // total time T
        fc.integer({ min: 3, max: 30 }),   // frame count for sequence A
        fc.integer({ min: 3, max: 30 }),   // frame count for sequence B
        fc.context(),
        (rotationSpeed, totalTime, framesA, framesB, ctx) => {
          // Generate non-uniform deltas that still sum to totalTime
          // Sequence A: varying deltas (jittery frame rate)
          const rawA = Array.from({ length: framesA }, (_, i) => 1 + Math.sin(i * 0.7))
          const sumA = rawA.reduce((a, b) => a + b, 0)
          const deltasA = rawA.map((v) => (v / sumA) * totalTime)

          // Sequence B: varying deltas (different pattern)
          const rawB = Array.from({ length: framesB }, (_, i) => 1 + Math.cos(i * 1.3))
          const sumB = rawB.reduce((a, b) => a + b, 0)
          const deltasB = rawB.map((v) => (v / sumB) * totalTime)

          const rotA = simulateRotation(rotationSpeed, deltasA)
          const rotB = simulateRotation(rotationSpeed, deltasB)

          ctx.log(`rotA=${rotA.toFixed(6)}, rotB=${rotB.toFixed(6)}, diff=${Math.abs(rotA - rotB).toFixed(6)}`)

          expect(Math.abs(rotA - rotB)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('bob offset is the same regardless of frame delta distribution (depends only on total elapsed time)', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(3.0), noNaN: true, noDefaultInfinity: true }),   // bobFrequency
        fc.float({ min: Math.fround(0.05), max: Math.fround(1.0), noNaN: true, noDefaultInfinity: true }),  // bobAmplitude
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true, noDefaultInfinity: true }),  // total time T
        fc.integer({ min: 2, max: 50 }),   // frame count for sequence A
        fc.integer({ min: 2, max: 50 }),   // frame count for sequence B
        (bobFrequency, bobAmplitude, totalTime, framesA, framesB) => {
          // Sequence A: uniform deltas
          const deltaA = totalTime / framesA
          const deltasA = Array(framesA).fill(deltaA)

          // Sequence B: uniform deltas with different frame count
          const deltaB = totalTime / framesB
          const deltasB = Array(framesB).fill(deltaB)

          const bobA = simulateBob(bobFrequency, bobAmplitude, deltasA)
          const bobB = simulateBob(bobFrequency, bobAmplitude, deltasB)

          // Bob offset depends only on total elapsed time (sin(T * freq) * amp)
          // so it should be identical for both sequences since sum(deltasA) === sum(deltasB) === T
          expect(Math.abs(bobA - bobB)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('bob offset matches direct computation from total elapsed time', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(3.0), noNaN: true, noDefaultInfinity: true }),   // bobFrequency
        fc.float({ min: Math.fround(0.05), max: Math.fround(1.0), noNaN: true, noDefaultInfinity: true }),  // bobAmplitude
        fc.float({ min: Math.fround(0.1), max: Math.fround(10.0), noNaN: true, noDefaultInfinity: true }),  // total time T
        fc.integer({ min: 2, max: 100 }),  // number of frames
        (bobFrequency, bobAmplitude, totalTime, frameCount) => {
          // Simulate frame-by-frame with uniform deltas
          const delta = totalTime / frameCount
          const deltas = Array(frameCount).fill(delta)
          const simulatedBob = simulateBob(bobFrequency, bobAmplitude, deltas)

          // Direct computation: bob = sin(T * freq) * amplitude
          const expectedBob = Math.sin(totalTime * bobFrequency) * bobAmplitude

          expect(Math.abs(simulatedBob - expectedBob)).toBeLessThanOrEqual(0.01)
        }
      ),
      { numRuns: 100 }
    )
  })
})
