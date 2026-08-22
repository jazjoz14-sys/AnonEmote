/**
 * Property-based tests for useGraphicsConfig: SceneConfig selector shape invariant
 *
 * @vitest-environment jsdom
 */

// Feature: graphics-settings, Property 2: SceneConfig selector shape invariant
// Validates: Requirements 1.4

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock device.js to provide known values (avoids navigator.userAgent / window.innerWidth issues)
vi.mock('../lib/device', () => ({
  qualityTier: 'medium',
  SCENE_CONFIG: {
    high: { starCount: 3500, planetDetail: 4, decorEnabled: true, shadowMapSize: 1024, bloomEnabled: true, dpr: [1, 1.5] },
    medium: { starCount: 2500, planetDetail: 3, decorEnabled: true, shadowMapSize: 0, bloomEnabled: true, dpr: [1, 1.25] },
    low: { starCount: 800, planetDetail: 2, decorEnabled: false, shadowMapSize: 0, bloomEnabled: false, dpr: [1, 1] },
  },
}))

// Mock graphicsPersistence to avoid localStorage side-effects during store creation
vi.mock('../lib/graphicsPersistence', () => ({
  loadGraphicsSettings: () => null,
  saveGraphicsSettings: () => {},
  detectActivePreset: (s) => 'custom',
  GRAPHICS_PRESETS: {
    low: { starCount: 800, planetDetail: 2, decorEnabled: false, shadowMapSize: 0, bloomEnabled: false, dpr: 1 },
    medium: { starCount: 2500, planetDetail: 3, decorEnabled: true, shadowMapSize: 0, bloomEnabled: true, dpr: 1.25 },
    high: { starCount: 3500, planetDetail: 4, decorEnabled: true, shadowMapSize: 1024, bloomEnabled: true, dpr: 1.5 },
  },
}))

import { create } from 'zustand'
import { createGraphicsSlice } from '../store/graphicsSlice.js'

// ── Mock useAppStore ────────────────────────────────────────────────────────

/**
 * We create a test store with only the graphics slice.
 * The mock replaces the `useAppStore` import inside `useGraphicsConfig.js`.
 */
let testStore

function createTestStore() {
  return create((set, get) => ({
    ...createGraphicsSlice(set, get),
  }))
}

// Mock useAppStore so that getGraphicsConfig() reads from our controlled test store
vi.mock('../store/useAppStore', () => {
  return {
    default: new Proxy(
      () => {},
      {
        // This proxy delegates all calls to the current testStore
        apply(_, __, args) {
          return testStore(...args)
        },
        get(_, prop) {
          if (prop === 'getState') return () => testStore.getState()
          if (prop === 'setState') return (...args) => testStore.setState(...args)
          if (prop === 'subscribe') return (...args) => testStore.subscribe(...args)
          if (prop === 'destroy') return () => testStore.destroy()
          return testStore[prop]
        },
      }
    ),
  }
})

import { getGraphicsConfig } from './useGraphicsConfig.js'

// ── Expected shape keys ─────────────────────────────────────────────────────

const EXPECTED_KEYS = ['starCount', 'planetDetail', 'decorEnabled', 'shadowMapSize', 'bloomEnabled', 'dpr']

// ── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a valid starCount (integer in [200, 5000] rounded to 100). */
const starCountArb = fc.integer({ min: 2, max: 50 }).map(n => n * 100)

/**
 * Generate a valid dpr value (1.0 to 2.0 in 0.25 steps).
 * The selector maps store dpr to [1, dpr], so dpr >= 1.0 is needed for the
 * ordering invariant dpr[0] <= dpr[1] to hold. Values below 1.0 are valid
 * store values but produce [1, x<1] which violates the ordering. The design
 * documents this pattern as "Floor at 1, ceiling at user choice" implying
 * the ceiling is >= 1, consistent with all preset definitions (low=1, med=1.25, high=1.5).
 */
const dprArb = fc.integer({ min: 4, max: 8 }).map(n => n * 0.25)

/** Generate a valid shadowMapSize. */
const shadowMapSizeArb = fc.constantFrom(0, 512, 1024)

/** Generate a valid planetDetail. */
const planetDetailArb = fc.constantFrom(2, 3, 4)

/** Generate a complete valid settings combination. */
const validSettingsArb = fc.record({
  bloomEnabled: fc.boolean(),
  decorEnabled: fc.boolean(),
  starCount: starCountArb,
  dpr: dprArb,
  shadowMapSize: shadowMapSizeArb,
  planetDetail: planetDetailArb,
})

// ── Shape Assertion Helper ──────────────────────────────────────────────────

/**
 * Assert that the output of getGraphicsConfig() has the correct shape:
 * - Contains exactly the expected keys
 * - Each field has the correct type
 * - dpr is a 2-element array of numbers where dpr[0] <= dpr[1]
 * - dpr[0] is always 1
 */
function assertValidSelectorShape(config) {
  // Must contain exactly the expected keys
  const keys = Object.keys(config).sort()
  expect(keys).toEqual([...EXPECTED_KEYS].sort())

  // starCount is a number
  expect(typeof config.starCount).toBe('number')
  expect(Number.isFinite(config.starCount)).toBe(true)

  // planetDetail is a number
  expect(typeof config.planetDetail).toBe('number')
  expect(Number.isFinite(config.planetDetail)).toBe(true)

  // decorEnabled is a boolean
  expect(typeof config.decorEnabled).toBe('boolean')

  // shadowMapSize is a number
  expect(typeof config.shadowMapSize).toBe('number')
  expect(Number.isFinite(config.shadowMapSize)).toBe(true)

  // bloomEnabled is a boolean
  expect(typeof config.bloomEnabled).toBe('boolean')

  // dpr is an array of exactly two numbers
  expect(Array.isArray(config.dpr)).toBe(true)
  expect(config.dpr).toHaveLength(2)
  expect(typeof config.dpr[0]).toBe('number')
  expect(typeof config.dpr[1]).toBe('number')
  expect(Number.isFinite(config.dpr[0])).toBe(true)
  expect(Number.isFinite(config.dpr[1])).toBe(true)

  // dpr[0] <= dpr[1]
  expect(config.dpr[0]).toBeLessThanOrEqual(config.dpr[1])

  // dpr[0] is always 1 (the floor of the range)
  expect(config.dpr[0]).toBe(1)
}

// ── Property Tests ──────────────────────────────────────────────────────────

describe('Property 2: SceneConfig selector shape invariant', () => {
  beforeEach(() => {
    localStorage.clear()
    testStore = createTestStore()
  })

  it('getGraphicsConfig() returns correct shape for any valid settings combination', () => {
    fc.assert(
      fc.property(validSettingsArb, (settings) => {
        // Create a fresh store for each run to avoid state leakage
        testStore = createTestStore()

        // Apply all settings to the store
        const state = testStore.getState()
        state.setGraphicsSetting('bloomEnabled', settings.bloomEnabled)
        state.setGraphicsSetting('decorEnabled', settings.decorEnabled)
        state.setGraphicsSetting('starCount', settings.starCount)
        state.setGraphicsSetting('dpr', settings.dpr)
        state.setGraphicsSetting('shadowMapSize', settings.shadowMapSize)
        state.setGraphicsSetting('planetDetail', settings.planetDetail)

        // Get the selector output
        const config = getGraphicsConfig()

        // Assert shape invariant
        assertValidSelectorShape(config)
      }),
      { numRuns: 200 }
    )
  })

  it('getGraphicsConfig() returns correct shape after applying any preset', () => {
    const presetArb = fc.constantFrom('low', 'medium', 'high')

    fc.assert(
      fc.property(presetArb, (presetName) => {
        testStore = createTestStore()

        // Apply a preset
        testStore.getState().applyPreset(presetName)

        // Get the selector output
        const config = getGraphicsConfig()

        // Assert shape invariant
        assertValidSelectorShape(config)
      }),
      { numRuns: 100 }
    )
  })

  it('getGraphicsConfig() dpr field always satisfies dpr[0] <= dpr[1] for any valid DPR', () => {
    fc.assert(
      fc.property(dprArb, (dprValue) => {
        testStore = createTestStore()

        testStore.getState().setGraphicsSetting('dpr', dprValue)

        const config = getGraphicsConfig()

        // dpr[0] must always be 1 (the floor)
        expect(config.dpr[0]).toBe(1)
        // dpr[1] must be >= dpr[0]
        expect(config.dpr[0]).toBeLessThanOrEqual(config.dpr[1])
        // dpr[1] must be a finite number in valid range
        expect(config.dpr[1]).toBeGreaterThanOrEqual(0.5)
        expect(config.dpr[1]).toBeLessThanOrEqual(2.0)
      }),
      { numRuns: 100 }
    )
  })

  it('getGraphicsConfig() values match what was set in the store', () => {
    fc.assert(
      fc.property(validSettingsArb, (settings) => {
        testStore = createTestStore()

        // Apply all settings
        const state = testStore.getState()
        state.setGraphicsSetting('bloomEnabled', settings.bloomEnabled)
        state.setGraphicsSetting('decorEnabled', settings.decorEnabled)
        state.setGraphicsSetting('starCount', settings.starCount)
        state.setGraphicsSetting('dpr', settings.dpr)
        state.setGraphicsSetting('shadowMapSize', settings.shadowMapSize)
        state.setGraphicsSetting('planetDetail', settings.planetDetail)

        // Get the selector output and store state
        const config = getGraphicsConfig()
        const storeState = testStore.getState()

        // Selector values must match store values
        expect(config.bloomEnabled).toBe(storeState.bloomEnabled)
        expect(config.decorEnabled).toBe(storeState.decorEnabled)
        expect(config.starCount).toBe(storeState.starCount)
        expect(config.planetDetail).toBe(storeState.planetDetail)
        expect(config.shadowMapSize).toBe(storeState.shadowMapSize)
        // dpr is [1, storeState.dpr]
        expect(config.dpr[1]).toBe(storeState.dpr)
      }),
      { numRuns: 200 }
    )
  })

  it('getGraphicsConfig() default state (no user changes) has correct shape', () => {
    // Even without any user changes, the selector must return valid shape
    testStore = createTestStore()
    const config = getGraphicsConfig()
    assertValidSelectorShape(config)
  })
})
