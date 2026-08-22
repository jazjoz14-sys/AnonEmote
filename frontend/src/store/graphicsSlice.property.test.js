/**
 * Property-based tests for graphicsSlice: Settings validation invariant
 *
 * @vitest-environment jsdom
 */

// Feature: graphics-settings, Property 1: Settings validation invariant
// Validates: Requirements 1.1

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

import { create } from 'zustand'
import { createGraphicsSlice } from './graphicsSlice.js'

// ── Test Store Factory ──────────────────────────────────────────────────────

/**
 * Create a fresh Zustand store with only the graphics slice.
 * Each test gets its own store to avoid cross-contamination.
 */
function createTestStore() {
  return create((set, get) => ({
    ...createGraphicsSlice(set, get),
  }))
}

// ── Validation Helpers ──────────────────────────────────────────────────────

/** Valid shadow map sizes. */
const VALID_SHADOW_SIZES = [0, 512, 1024]

/** Valid planet detail levels. */
const VALID_PLANET_DETAILS = [2, 3, 4]

/**
 * Assert that the current store state contains only valid graphics values.
 * This is the core invariant: regardless of what input was provided,
 * the store must always hold valid, in-range values.
 */
function assertValidGraphicsState(state) {
  // bloomEnabled must be boolean
  expect(typeof state.bloomEnabled).toBe('boolean')

  // decorEnabled must be boolean
  expect(typeof state.decorEnabled).toBe('boolean')

  // starCount must be integer in [200, 5000]
  expect(typeof state.starCount).toBe('number')
  expect(Number.isInteger(state.starCount)).toBe(true)
  expect(state.starCount).toBeGreaterThanOrEqual(200)
  expect(state.starCount).toBeLessThanOrEqual(5000)

  // dpr must be number in [0.5, 2.0]
  expect(typeof state.dpr).toBe('number')
  expect(Number.isNaN(state.dpr)).toBe(false)
  expect(state.dpr).toBeGreaterThanOrEqual(0.5)
  expect(state.dpr).toBeLessThanOrEqual(2.0)

  // shadowMapSize must be one of {0, 512, 1024}
  expect(VALID_SHADOW_SIZES).toContain(state.shadowMapSize)

  // planetDetail must be one of {2, 3, 4}
  expect(VALID_PLANET_DETAILS).toContain(state.planetDetail)
}

// ── Arbitraries ─────────────────────────────────────────────────────────────

/** The 6 valid setting keys recognized by setGraphicsSetting. */
const validKeyArb = fc.constantFrom(
  'bloomEnabled',
  'decorEnabled',
  'starCount',
  'dpr',
  'shadowMapSize',
  'planetDetail'
)

/**
 * Generate arbitrary values of ANY type, including:
 * - Out-of-range numbers (negative, huge, fractional, NaN, Infinity)
 * - Wrong types (strings, booleans where numbers expected, null, undefined)
 * - Edge case numbers (0, -1, MAX_SAFE_INTEGER)
 *
 * This tests the clamping/validation robustness of setGraphicsSetting.
 */
const chaosValueArb = fc.oneof(
  // Numbers far out of range
  fc.double({ min: -100000, max: 100000, noNaN: false }),
  fc.integer({ min: -100000, max: 100000 }),
  // Special numeric values
  fc.constantFrom(NaN, Infinity, -Infinity, 0, -0, -1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER),
  // Strings
  fc.string(),
  // Booleans
  fc.boolean(),
  // Null and undefined
  fc.constantFrom(null, undefined),
  // Arrays and objects
  fc.array(fc.anything(), { maxLength: 3 }),
  fc.dictionary(fc.string({ maxLength: 5 }), fc.anything(), { maxKeys: 3 })
)

/**
 * Generate values that are specifically targeted at each key's edge cases.
 * This is more focused than pure chaos — tests the boundaries of each field.
 */
const targetedValueArb = validKeyArb.chain(key => {
  switch (key) {
    case 'bloomEnabled':
    case 'decorEnabled':
      // Feed various truthy/falsy values to boolean fields
      return fc.oneof(
        fc.boolean(),
        fc.constantFrom(0, 1, '', 'true', 'false', null, undefined, [], {})
      ).map(value => ({ key, value }))

    case 'starCount':
      // Numbers around the boundaries, non-integers, wrong types
      return fc.oneof(
        fc.integer({ min: -1000, max: 10000 }),
        fc.double({ min: -1000, max: 10000, noNaN: false }),
        fc.constantFrom(NaN, Infinity, -Infinity, null, undefined, 'abc', 199, 200, 5000, 5001)
      ).map(value => ({ key, value }))

    case 'dpr':
      // DPR boundary testing
      return fc.oneof(
        fc.double({ min: -10, max: 10, noNaN: false }),
        fc.constantFrom(NaN, Infinity, -Infinity, 0, 0.49, 0.5, 2.0, 2.01, null, undefined, 'abc')
      ).map(value => ({ key, value }))

    case 'shadowMapSize':
      // Values that should snap to {0, 512, 1024}
      return fc.oneof(
        fc.integer({ min: -5000, max: 5000 }),
        fc.constantFrom(NaN, Infinity, -Infinity, null, undefined, 'abc', 256, 768, 2048)
      ).map(value => ({ key, value }))

    case 'planetDetail':
      // Values that should snap to {2, 3, 4}
      return fc.oneof(
        fc.integer({ min: -100, max: 100 }),
        fc.constantFrom(NaN, Infinity, -Infinity, null, undefined, 'abc', 0, 1, 5, 10)
      ).map(value => ({ key, value }))

    default:
      return fc.constant({ key, value: null })
  }
})

// ── Property Tests ──────────────────────────────────────────────────────────

describe('Property 1: Settings validation invariant', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('store always contains valid values after setGraphicsSetting with chaotic input', () => {
    fc.assert(
      fc.property(validKeyArb, chaosValueArb, (key, value) => {
        const useStore = createTestStore()

        // Apply the chaotic value
        useStore.getState().setGraphicsSetting(key, value)

        // The store must always hold valid values
        const state = useStore.getState()
        assertValidGraphicsState(state)
      }),
      { numRuns: 200 }
    )
  })

  it('store always contains valid values after targeted boundary inputs', () => {
    fc.assert(
      fc.property(targetedValueArb, ({ key, value }) => {
        const useStore = createTestStore()

        // Apply the targeted value
        useStore.getState().setGraphicsSetting(key, value)

        // The store must always hold valid values
        const state = useStore.getState()
        assertValidGraphicsState(state)
      }),
      { numRuns: 200 }
    )
  })

  it('store remains valid after a sequence of random setting changes', () => {
    // Generate a sequence of setting changes and verify validity after each one
    const settingChangeArb = fc.tuple(validKeyArb, chaosValueArb)
    const sequenceArb = fc.array(settingChangeArb, { minLength: 1, maxLength: 10 })

    fc.assert(
      fc.property(sequenceArb, (changes) => {
        const useStore = createTestStore()

        for (const [key, value] of changes) {
          useStore.getState().setGraphicsSetting(key, value)

          // Invariant must hold after EVERY change in the sequence
          const state = useStore.getState()
          assertValidGraphicsState(state)
        }
      }),
      { numRuns: 100 }
    )
  })

  it('invalid keys are silently ignored and state remains unchanged', () => {
    const invalidKeyArb = fc.oneof(
      fc.string().filter(s => !['bloomEnabled', 'decorEnabled', 'starCount', 'dpr', 'shadowMapSize', 'planetDetail'].includes(s)),
      fc.constantFrom('bloom', 'stars', 'detail', 'resolution', '__proto__', 'constructor', 'toString')
    )

    fc.assert(
      fc.property(invalidKeyArb, chaosValueArb, (key, value) => {
        const useStore = createTestStore()

        // Capture state before
        const before = useStore.getState()
        const snapshot = {
          bloomEnabled: before.bloomEnabled,
          decorEnabled: before.decorEnabled,
          starCount: before.starCount,
          dpr: before.dpr,
          shadowMapSize: before.shadowMapSize,
          planetDetail: before.planetDetail,
        }

        // Apply with invalid key
        useStore.getState().setGraphicsSetting(key, value)

        // State must be unchanged
        const after = useStore.getState()
        expect(after.bloomEnabled).toBe(snapshot.bloomEnabled)
        expect(after.decorEnabled).toBe(snapshot.decorEnabled)
        expect(after.starCount).toBe(snapshot.starCount)
        expect(after.dpr).toBe(snapshot.dpr)
        expect(after.shadowMapSize).toBe(snapshot.shadowMapSize)
        expect(after.planetDetail).toBe(snapshot.planetDetail)
      }),
      { numRuns: 100 }
    )
  })

  it('initial store state (before any user action) is valid', () => {
    // Even before any setGraphicsSetting call, the defaults must be valid
    fc.assert(
      fc.property(fc.constant(null), () => {
        const useStore = createTestStore()
        const state = useStore.getState()
        assertValidGraphicsState(state)
      }),
      { numRuns: 1 }
    )
  })
})
