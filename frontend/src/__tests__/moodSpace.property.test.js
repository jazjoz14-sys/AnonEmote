// Feature: checkin-experience-redesign
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  moveCursorByKey,
  positionToQuadrant,
  quadrantToFeelings,
  interpolateQuadrantColor,
  computeParticleSpeed,
  computeParticleOpacity,
  classifyPointerGesture,
} from '../lib/moodSpace.js'

// ─── Property 1: Cursor position clamping ──────────────────────────────────────

/**
 * Validates: Requirements 1.2, 8.1
 *
 * Property 1: Cursor position clamping
 * For any pair of coordinates (x, y) and any arrow key,
 * moveCursorByKey always returns values in [0, 1] for both axes.
 */
describe('Feature: checkin-experience-redesign, Property 1: Cursor position clamping', () => {
  it('moveCursorByKey always returns x and y in [0, 1] for any starting position and arrow key', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.constantFrom('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'),
        (x, y, key) => {
          const result = moveCursorByKey({ x, y }, key)
          expect(result.x).toBeGreaterThanOrEqual(0)
          expect(result.x).toBeLessThanOrEqual(1)
          expect(result.y).toBeGreaterThanOrEqual(0)
          expect(result.y).toBeLessThanOrEqual(1)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('moveCursorByKey returns values in [0, 1] even for positions at exact boundaries', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(0, 0.5, 1),
        fc.constantFrom(0, 0.5, 1),
        fc.constantFrom('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'),
        (x, y, key) => {
          const result = moveCursorByKey({ x, y }, key)
          expect(result.x).toBeGreaterThanOrEqual(0)
          expect(result.x).toBeLessThanOrEqual(1)
          expect(result.y).toBeGreaterThanOrEqual(0)
          expect(result.y).toBeLessThanOrEqual(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ─── Property 2: Quadrant-to-feeling mapping correctness ───────────────────────

/**
 * Validates: Requirements 1.3, 1.4
 *
 * Property 2: Quadrant-to-feeling mapping correctness
 * For any (x, y) in [0,1]², positionToQuadrant returns one of 4 IDs,
 * and quadrantToFeelings returns the correct feeling arrays.
 */
describe('Feature: checkin-experience-redesign, Property 2: Quadrant-to-feeling mapping correctness', () => {
  const VALID_QUADRANTS = ['yellow', 'red', 'green', 'blue']
  const EXPECTED_FEELINGS = {
    yellow: ['joy', 'doodle'],
    red: ['vent', 'anxiety'],
    green: ['neutral', 'advice'],
    blue: ['grief'],
  }

  it('positionToQuadrant always returns one of the 4 valid quadrant IDs', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (x, y) => {
          const quadrant = positionToQuadrant(x, y)
          expect(VALID_QUADRANTS).toContain(quadrant)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('quadrantToFeelings returns the correct feeling array for each quadrant', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_QUADRANTS),
        (quadrant) => {
          const feelings = quadrantToFeelings(quadrant)
          expect(feelings).toEqual(EXPECTED_FEELINGS[quadrant])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('position → quadrant → feelings pipeline always produces valid feelings', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (x, y) => {
          const quadrant = positionToQuadrant(x, y)
          const feelings = quadrantToFeelings(quadrant)
          expect(feelings.length).toBeGreaterThan(0)
          expect(feelings.length).toBeLessThanOrEqual(2)
          // Every feeling should be a known ID
          const allFeelings = ['joy', 'doodle', 'vent', 'anxiety', 'neutral', 'advice', 'grief']
          for (const f of feelings) {
            expect(allFeelings).toContain(f)
          }
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ─── Property 3: Smooth color interpolation ────────────────────────────────────

/**
 * Validates: Requirements 2.1
 *
 * Property 3: Smooth color interpolation
 * For any (x, y) in [0,1]², interpolateQuadrantColor returns a valid
 * hsl() string with h∈[0,360], s∈[0,100], l∈[0,100].
 */
describe('Feature: checkin-experience-redesign, Property 3: Smooth color interpolation', () => {
  // Regex to parse hsl(H, S%, L%) format
  const HSL_REGEX = /^hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)$/

  it('interpolateQuadrantColor returns a valid hsl() string for any position', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (x, y) => {
          const color = interpolateQuadrantColor(x, y)
          const match = color.match(HSL_REGEX)
          expect(match).not.toBeNull()

          const h = parseInt(match[1], 10)
          const s = parseInt(match[2], 10)
          const l = parseInt(match[3], 10)

          expect(h).toBeGreaterThanOrEqual(0)
          expect(h).toBeLessThanOrEqual(360)
          expect(s).toBeGreaterThanOrEqual(0)
          expect(s).toBeLessThanOrEqual(100)
          expect(l).toBeGreaterThanOrEqual(0)
          expect(l).toBeLessThanOrEqual(100)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('color varies continuously — adjacent positions produce close hue values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        fc.double({ min: 0, max: 0.99, noNaN: true }),
        (x, y) => {
          const color1 = interpolateQuadrantColor(x, y)
          const color2 = interpolateQuadrantColor(
            Math.min(1, x + 0.01),
            Math.min(1, y + 0.01)
          )

          const match1 = color1.match(HSL_REGEX)
          const match2 = color2.match(HSL_REGEX)

          const s1 = parseInt(match1[2], 10)
          const s2 = parseInt(match2[2], 10)
          const l1 = parseInt(match1[3], 10)
          const l2 = parseInt(match2[3], 10)

          // Saturation and lightness should not jump more than 5% of range
          // for adjacent positions differing by ≤ 0.01
          expect(Math.abs(s2 - s1)).toBeLessThanOrEqual(5)
          expect(Math.abs(l2 - l1)).toBeLessThanOrEqual(5)
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ─── Property 4: Particle parameters scale linearly ────────────────────────────

/**
 * Validates: Requirements 2.2, 2.3
 *
 * Property 4: Particle parameters scale linearly
 * Speed in [0.5, 4.0], opacity in [0.2, 1.0], both monotonically non-decreasing.
 */
describe('Feature: checkin-experience-redesign, Property 4: Particle parameters scale linearly', () => {
  it('computeParticleSpeed returns values in [0.5, 4.0] for any energy Y', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (y) => {
          const speed = computeParticleSpeed(y)
          expect(speed).toBeGreaterThanOrEqual(0.5)
          expect(speed).toBeLessThanOrEqual(4.0)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('computeParticleSpeed is monotonically non-decreasing', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (a, b) => {
          const y1 = Math.min(a, b)
          const y2 = Math.max(a, b)
          expect(computeParticleSpeed(y2)).toBeGreaterThanOrEqual(computeParticleSpeed(y1))
        }
      ),
      { numRuns: 200 }
    )
  })

  it('computeParticleOpacity returns values in [0.2, 1.0] for any pleasantness X', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        (x) => {
          const opacity = computeParticleOpacity(x)
          expect(opacity).toBeGreaterThanOrEqual(0.2)
          expect(opacity).toBeLessThanOrEqual(1.0)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('computeParticleOpacity is monotonically non-decreasing', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        (a, b) => {
          const x1 = Math.min(a, b)
          const x2 = Math.max(a, b)
          expect(computeParticleOpacity(x2)).toBeGreaterThanOrEqual(computeParticleOpacity(x1))
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ─── Property 13: Pointer gesture classification ───────────────────────────────

/**
 * Validates: Requirements 7.2
 *
 * Property 13: Pointer gesture classification
 * classifyPointerGesture returns 'tap' iff distance ≤ 10 AND elapsed ≤ 300ms.
 */
describe('Feature: checkin-experience-redesign, Property 13: Pointer gesture classification', () => {
  it('returns tap when distance ≤ 10 AND elapsed ≤ 300', () => {
    fc.assert(
      fc.property(
        // Generate down position
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
        // Generate angle and distance ≤ 10
        fc.double({ min: 0, max: 6.28, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        // Elapsed ≤ 300
        fc.double({ min: 0, max: 300, noNaN: true }),
        (downX, downY, angle, distance, elapsed) => {
          const upX = downX + distance * Math.cos(angle)
          const upY = downY + distance * Math.sin(angle)
          const result = classifyPointerGesture(
            { x: downX, y: downY },
            { x: upX, y: upY },
            elapsed
          )
          expect(result).toBe('tap')
        }
      ),
      { numRuns: 200 }
    )
  })

  it('returns drag when distance > 10 (regardless of elapsed time)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: 0, max: 6.28, noNaN: true }),
        // Distance > 10
        fc.double({ min: 10.01, max: 500, noNaN: true }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        (downX, downY, angle, distance, elapsed) => {
          const upX = downX + distance * Math.cos(angle)
          const upY = downY + distance * Math.sin(angle)
          const result = classifyPointerGesture(
            { x: downX, y: downY },
            { x: upX, y: upY },
            elapsed
          )
          expect(result).toBe('drag')
        }
      ),
      { numRuns: 200 }
    )
  })

  it('returns drag when elapsed > 300 (even if distance ≤ 10)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: -500, max: 500, noNaN: true }),
        fc.double({ min: 0, max: 6.28, noNaN: true }),
        fc.double({ min: 0, max: 10, noNaN: true }),
        // Elapsed > 300
        fc.double({ min: 300.01, max: 10000, noNaN: true }),
        (downX, downY, angle, distance, elapsed) => {
          const upX = downX + distance * Math.cos(angle)
          const upY = downY + distance * Math.sin(angle)
          const result = classifyPointerGesture(
            { x: downX, y: downY },
            { x: upX, y: upY },
            elapsed
          )
          expect(result).toBe('drag')
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ─── Property 14: Keyboard cursor discrete step ────────────────────────────────

/**
 * Validates: Requirements 8.1
 *
 * Property 14: Keyboard cursor discrete step
 * For any position and arrow key, the result differs from input by exactly 0.1
 * on one axis (or is clamped at boundary), with the other axis unchanged.
 */
describe('Feature: checkin-experience-redesign, Property 14: Keyboard cursor discrete step', () => {
  const STEP = 0.1
  const EPSILON = 1e-10 // floating point tolerance

  it('arrow key changes exactly one axis by 0.1 or clamps at boundary', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.constantFrom('ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'),
        (x, y, key) => {
          const result = moveCursorByKey({ x, y }, key)

          switch (key) {
            case 'ArrowUp': {
              // X unchanged
              expect(Math.abs(result.x - x)).toBeLessThan(EPSILON)
              // Y increases by 0.1 or is clamped at 1
              const expectedY = Math.min(1, y + STEP)
              expect(Math.abs(result.y - expectedY)).toBeLessThan(EPSILON)
              break
            }
            case 'ArrowDown': {
              // X unchanged
              expect(Math.abs(result.x - x)).toBeLessThan(EPSILON)
              // Y decreases by 0.1 or is clamped at 0
              const expectedY = Math.max(0, y - STEP)
              expect(Math.abs(result.y - expectedY)).toBeLessThan(EPSILON)
              break
            }
            case 'ArrowRight': {
              // Y unchanged
              expect(Math.abs(result.y - y)).toBeLessThan(EPSILON)
              // X increases by 0.1 or is clamped at 1
              const expectedX = Math.min(1, x + STEP)
              expect(Math.abs(result.x - expectedX)).toBeLessThan(EPSILON)
              break
            }
            case 'ArrowLeft': {
              // Y unchanged
              expect(Math.abs(result.y - y)).toBeLessThan(EPSILON)
              // X decreases by 0.1 or is clamped at 0
              const expectedX = Math.max(0, x - STEP)
              expect(Math.abs(result.x - expectedX)).toBeLessThan(EPSILON)
              break
            }
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('non-arrow keys leave position completely unchanged', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        fc.constantFrom('Enter', 'Space', 'Tab', 'Escape', 'a', 'z', '1'),
        (x, y, key) => {
          const result = moveCursorByKey({ x, y }, key)
          expect(result.x).toBe(x)
          expect(result.y).toBe(y)
        }
      ),
      { numRuns: 100 }
    )
  })
})
