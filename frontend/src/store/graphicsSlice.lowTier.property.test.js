/**
 * Property-based tests for graphicsSlice — Low-tier DPR clamping
 *
 * @vitest-environment jsdom
 */

// Feature: graphics-settings, Property 6: Low-tier DPR clamping
// Validates: Requirements 7.4

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { create } from 'zustand'

// Mock device.js to force qualityTier = 'low' (vi.mock is hoisted)
vi.mock('../lib/device', () => ({
  qualityTier: 'low',
  SCENE_CONFIG: {
    high: { starCount: 3500, planetDetail: 4, decorEnabled: true, shadowMapSize: 1024, bloomEnabled: true, dpr: [1, 1.5] },
    medium: { starCount: 2500, planetDetail: 3, decorEnabled: true, shadowMapSize: 0, bloomEnabled: true, dpr: [1, 1.25] },
    low: { starCount: 800, planetDetail: 2, decorEnabled: false, shadowMapSize: 0, bloomEnabled: false, dpr: [1, 1] },
  },
}))

// Import AFTER mock is established
import { createGraphicsSlice } from './graphicsSlice.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a fresh Zustand store instance with the graphics slice for each test.
 * This ensures no state leaks between runs.
 */
function createTestStore() {
  return create((set, get) => ({
    ...createGraphicsSlice(set, get),
  }))
}

// ── Property 6: Low-tier DPR clamping ─────────────────────────────────────────

/**
 * Validates: Requirements 7.4
 *
 * Property 6: Low-tier DPR clamping
 * For any DPR value in the valid range [0.5, 2.0] applied via
 * setGraphicsSetting('dpr', value) when the detected quality tier is 'low',
 * the resulting stored DPR value SHALL be clamp(value, 0.5, 1.5).
 *
 * This ensures low-tier devices never exceed 1.5 DPR regardless of user input.
 */

describe('Property 6: Low-tier DPR clamping', () => {
  let store

  beforeEach(() => {
    localStorage.clear()
    store = createTestStore()
    store.getState().initGraphics()
  })

  it('DPR is always clamped to max 1.5 on low tier for any input in [0.5, 2.0]', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 2.0, noNaN: true, noDefaultInfinity: true }),
        (dprValue) => {
          store.getState().setGraphicsSetting('dpr', dprValue)

          const storedDpr = store.getState().dpr
          const expected = Math.min(Math.max(dprValue, 0.5), 1.5)

          // The stored DPR must equal clamp(value, 0.5, 1.5)
          expect(storedDpr).toBeCloseTo(expected, 10)
          // Must never exceed 1.5 on low tier
          expect(storedDpr).toBeLessThanOrEqual(1.5)
          // Must never go below 0.5
          expect(storedDpr).toBeGreaterThanOrEqual(0.5)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('DPR values above 1.5 are clamped to exactly 1.5', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.500001, max: 2.0, noNaN: true, noDefaultInfinity: true }),
        (dprValue) => {
          store.getState().setGraphicsSetting('dpr', dprValue)

          const storedDpr = store.getState().dpr
          expect(storedDpr).toBe(1.5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('DPR values at or below 1.5 are stored as-is (within [0.5, 1.5])', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.5, max: 1.5, noNaN: true, noDefaultInfinity: true }),
        (dprValue) => {
          store.getState().setGraphicsSetting('dpr', dprValue)

          const storedDpr = store.getState().dpr
          expect(storedDpr).toBeCloseTo(dprValue, 10)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('DPR values below 0.5 are clamped to exactly 0.5 (floor enforcement)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10, max: 0.499999, noNaN: true, noDefaultInfinity: true }),
        (dprValue) => {
          store.getState().setGraphicsSetting('dpr', dprValue)

          const storedDpr = store.getState().dpr
          expect(storedDpr).toBe(0.5)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('repeated DPR changes always respect the 1.5 cap on low tier', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.double({ min: 0, max: 3.0, noNaN: true, noDefaultInfinity: true }),
          { minLength: 1, maxLength: 10 }
        ),
        (dprValues) => {
          for (const val of dprValues) {
            store.getState().setGraphicsSetting('dpr', val)

            const storedDpr = store.getState().dpr
            expect(storedDpr).toBeLessThanOrEqual(1.5)
            expect(storedDpr).toBeGreaterThanOrEqual(0.5)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
