/**
 * Property-based tests for the auto-revert stability state machine.
 *
 * Tests the STATE MACHINE logic of the graphics stability tracker by exercising
 * the store actions directly (setGraphicsSetting, promoteToStable, revertToStable)
 * rather than the R3F hook plumbing. This validates that the state transitions are
 * correct regardless of the timer/event-listener mechanics.
 *
 * @vitest-environment jsdom
 */

// Feature: graphics-settings, Property 7: Auto-revert stability state machine
// Validates: Requirements 7.5, 7.6

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock device.js to provide known medium-tier defaults
vi.mock('../lib/device', () => ({
  qualityTier: 'medium',
  SCENE_CONFIG: {
    high: { starCount: 3500, planetDetail: 4, decorEnabled: true, shadowMapSize: 1024, bloomEnabled: true, dpr: [1, 1.5] },
    medium: { starCount: 2500, planetDetail: 3, decorEnabled: true, shadowMapSize: 0, bloomEnabled: true, dpr: [1, 1.25] },
    low: { starCount: 800, planetDetail: 2, decorEnabled: false, shadowMapSize: 0, bloomEnabled: false, dpr: [1, 1] },
  },
}))

import { create } from 'zustand'
import { createGraphicsSlice } from '../store/graphicsSlice.js'

// ── Test Store Factory ──────────────────────────────────────────────────────

/**
 * Create a fresh Zustand store with the graphics slice and a mock showToast.
 * Each test gets its own isolated store instance.
 */
function createTestStore() {
  return create((set, get) => ({
    ...createGraphicsSlice(set, get),
    // Mock toast for revert notifications
    showToast: vi.fn(),
  }))
}

// ── Snapshot Helper ─────────────────────────────────────────────────────────

/**
 * Extract the 6 user-facing settings fields from the store state.
 * @param {object} state
 * @returns {object}
 */
function getSettingsSnapshot(state) {
  return {
    bloomEnabled: state.bloomEnabled,
    decorEnabled: state.decorEnabled,
    starCount: state.starCount,
    dpr: state.dpr,
    shadowMapSize: state.shadowMapSize,
    planetDetail: state.planetDetail,
  }
}

// ── Arbitraries ─────────────────────────────────────────────────────────────

/** Generate a valid setting key. */
const settingKeyArb = fc.constantFrom(
  'bloomEnabled',
  'decorEnabled',
  'starCount',
  'dpr',
  'shadowMapSize',
  'planetDetail'
)

/**
 * Generate a valid value for a given setting key.
 * These are values within the valid range that will be accepted by the store.
 */
function validValueForKey(key) {
  switch (key) {
    case 'bloomEnabled':
    case 'decorEnabled':
      return fc.boolean()
    case 'starCount':
      // Integer multiple of 100 in [200, 5000]
      return fc.integer({ min: 2, max: 50 }).map(n => n * 100)
    case 'dpr':
      // Multiple of 0.25 in [0.5, 2.0]
      return fc.integer({ min: 2, max: 8 }).map(n => n * 0.25)
    case 'shadowMapSize':
      return fc.constantFrom(0, 512, 1024)
    case 'planetDetail':
      return fc.constantFrom(2, 3, 4)
    default:
      return fc.constant(true)
  }
}

/** Generate a single settings change event: { key, value }. */
const settingChangeArb = settingKeyArb.chain(key =>
  validValueForKey(key).map(value => ({ key, value }))
)

/**
 * Generate a sequence of state machine events:
 * - 'change': A settings change (updates lastChangeTimestamp)
 * - 'promote': 10 seconds passed without context loss (promoteToStable)
 * - 'revert': Context loss within 10s (revertToStable)
 */
const eventArb = fc.oneof(
  { weight: 5, arbitrary: settingChangeArb.map(c => ({ type: 'change', ...c })) },
  { weight: 2, arbitrary: fc.constant({ type: 'promote' }) },
  { weight: 2, arbitrary: fc.constant({ type: 'revert' }) }
)

/** Generate a sequence of 1–15 events. */
const eventSequenceArb = fc.array(eventArb, { minLength: 1, maxLength: 15 })

// ── Property Tests ──────────────────────────────────────────────────────────

describe('Property 7: Auto-revert stability state machine', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('after revertToStable, current settings equal lastStableConfig', () => {
    /**
     * Validates: Requirements 7.5
     *
     * For any sequence of changes followed by a revert, the current settings
     * must exactly match the lastStableConfig that existed before the changes.
     */
    fc.assert(
      fc.property(
        fc.array(settingChangeArb, { minLength: 1, maxLength: 8 }),
        (changes) => {
          const useStore = createTestStore()

          // Initialize — this sets lastStableConfig to medium defaults
          useStore.getState().initGraphics()

          const stableBeforeChanges = { ...useStore.getState().lastStableConfig }

          // Apply multiple changes (simulating user modifying settings)
          for (const { key, value } of changes) {
            useStore.getState().setGraphicsSetting(key, value)
          }

          // Simulate context loss within 10s — revert
          useStore.getState().revertToStable()

          // After revert, current settings must equal the last stable config
          const state = useStore.getState()
          const current = getSettingsSnapshot(state)

          expect(current.bloomEnabled).toBe(stableBeforeChanges.bloomEnabled)
          expect(current.decorEnabled).toBe(stableBeforeChanges.decorEnabled)
          expect(current.starCount).toBe(stableBeforeChanges.starCount)
          expect(current.dpr).toBe(stableBeforeChanges.dpr)
          expect(current.shadowMapSize).toBe(stableBeforeChanges.shadowMapSize)
          expect(current.planetDetail).toBe(stableBeforeChanges.planetDetail)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('after promoteToStable, lastStableConfig equals current settings at promotion time', () => {
    /**
     * Validates: Requirements 7.6
     *
     * For any valid config applied via setGraphicsSetting, calling promoteToStable
     * must capture the current settings as the new lastStableConfig.
     */
    fc.assert(
      fc.property(
        fc.array(settingChangeArb, { minLength: 1, maxLength: 5 }),
        (changes) => {
          const useStore = createTestStore()
          useStore.getState().initGraphics()

          // Apply changes
          for (const { key, value } of changes) {
            useStore.getState().setGraphicsSetting(key, value)
          }

          // Snapshot settings BEFORE promotion
          const beforePromote = getSettingsSnapshot(useStore.getState())

          // Simulate 10 seconds passing without context loss — promote
          useStore.getState().promoteToStable()

          // lastStableConfig should equal the settings at promotion time
          const { lastStableConfig } = useStore.getState()

          expect(lastStableConfig.bloomEnabled).toBe(beforePromote.bloomEnabled)
          expect(lastStableConfig.decorEnabled).toBe(beforePromote.decorEnabled)
          expect(lastStableConfig.starCount).toBe(beforePromote.starCount)
          expect(lastStableConfig.dpr).toBe(beforePromote.dpr)
          expect(lastStableConfig.shadowMapSize).toBe(beforePromote.shadowMapSize)
          expect(lastStableConfig.planetDetail).toBe(beforePromote.planetDetail)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('change → promote → change → revert goes back to the promoted config (not initial)', () => {
    /**
     * Validates: Requirements 7.5, 7.6
     *
     * The second revert after a promote should go back to the promoted config,
     * not to the original initial config. This verifies that promotion correctly
     * advances the stable baseline.
     */
    fc.assert(
      fc.property(
        fc.array(settingChangeArb, { minLength: 1, maxLength: 4 }),
        fc.array(settingChangeArb, { minLength: 1, maxLength: 4 }),
        (firstChanges, secondChanges) => {
          const useStore = createTestStore()
          useStore.getState().initGraphics()

          // Phase 1: make changes, then promote (10s stable)
          for (const { key, value } of firstChanges) {
            useStore.getState().setGraphicsSetting(key, value)
          }
          useStore.getState().promoteToStable()

          // Record the promoted stable config
          const promotedStable = { ...useStore.getState().lastStableConfig }

          // Phase 2: make more changes, then context loss (revert)
          for (const { key, value } of secondChanges) {
            useStore.getState().setGraphicsSetting(key, value)
          }
          useStore.getState().revertToStable()

          // Should revert to the promoted config, not the initial defaults
          const current = getSettingsSnapshot(useStore.getState())

          expect(current.bloomEnabled).toBe(promotedStable.bloomEnabled)
          expect(current.decorEnabled).toBe(promotedStable.decorEnabled)
          expect(current.starCount).toBe(promotedStable.starCount)
          expect(current.dpr).toBe(promotedStable.dpr)
          expect(current.shadowMapSize).toBe(promotedStable.shadowMapSize)
          expect(current.planetDetail).toBe(promotedStable.planetDetail)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('arbitrary event sequences maintain the stability invariant: revert always restores lastStableConfig', () => {
    /**
     * Validates: Requirements 7.5, 7.6
     *
     * For any sequence of (change, promote, revert) events, the following
     * invariants must always hold:
     * - After a revert: current settings === lastStableConfig
     * - After a promote: lastStableConfig === settings at promotion time
     * - lastStableConfig is always a valid config object (once initialized)
     */
    fc.assert(
      fc.property(eventSequenceArb, (events) => {
        const useStore = createTestStore()
        useStore.getState().initGraphics()

        for (const event of events) {
          switch (event.type) {
            case 'change':
              useStore.getState().setGraphicsSetting(event.key, event.value)
              break

            case 'promote':
              useStore.getState().promoteToStable()
              break

            case 'revert':
              useStore.getState().revertToStable()
              break
          }

          // ── Invariants that must ALWAYS hold after any event ──
          const state = useStore.getState()

          // 1. lastStableConfig is always a valid 6-field config once initialized
          if (state.lastStableConfig !== null) {
            expect(typeof state.lastStableConfig.bloomEnabled).toBe('boolean')
            expect(typeof state.lastStableConfig.decorEnabled).toBe('boolean')
            expect(state.lastStableConfig.starCount).toBeGreaterThanOrEqual(200)
            expect(state.lastStableConfig.starCount).toBeLessThanOrEqual(5000)
            expect(state.lastStableConfig.dpr).toBeGreaterThanOrEqual(0.5)
            expect(state.lastStableConfig.dpr).toBeLessThanOrEqual(2.0)
            expect([0, 512, 1024]).toContain(state.lastStableConfig.shadowMapSize)
            expect([2, 3, 4]).toContain(state.lastStableConfig.planetDetail)
          }

          // 2. After a revert, current === lastStableConfig
          if (event.type === 'revert' && state.lastStableConfig !== null) {
            const current = getSettingsSnapshot(state)
            expect(current.bloomEnabled).toBe(state.lastStableConfig.bloomEnabled)
            expect(current.decorEnabled).toBe(state.lastStableConfig.decorEnabled)
            expect(current.starCount).toBe(state.lastStableConfig.starCount)
            expect(current.dpr).toBe(state.lastStableConfig.dpr)
            expect(current.shadowMapSize).toBe(state.lastStableConfig.shadowMapSize)
            expect(current.planetDetail).toBe(state.lastStableConfig.planetDetail)
          }

          // 3. After a promote, lastStableConfig === current settings at that moment
          if (event.type === 'promote') {
            const current = getSettingsSnapshot(state)
            expect(state.lastStableConfig.bloomEnabled).toBe(current.bloomEnabled)
            expect(state.lastStableConfig.decorEnabled).toBe(current.decorEnabled)
            expect(state.lastStableConfig.starCount).toBe(current.starCount)
            expect(state.lastStableConfig.dpr).toBe(current.dpr)
            expect(state.lastStableConfig.shadowMapSize).toBe(current.shadowMapSize)
            expect(state.lastStableConfig.planetDetail).toBe(current.planetDetail)
          }
        }
      }),
      { numRuns: 100 }
    )
  })

  it('revertToStable clears lastChangeTimestamp (prevents cascading reverts)', () => {
    /**
     * Validates: Requirements 7.5
     *
     * After a revert, lastChangeTimestamp must be null. This ensures that
     * subsequent context losses don't trigger another revert (the hook
     * only reverts when lastChangeTimestamp is non-null and recent).
     */
    fc.assert(
      fc.property(
        fc.array(settingChangeArb, { minLength: 1, maxLength: 5 }),
        (changes) => {
          const useStore = createTestStore()
          useStore.getState().initGraphics()

          // Apply changes — this sets lastChangeTimestamp
          for (const { key, value } of changes) {
            useStore.getState().setGraphicsSetting(key, value)
          }

          // Verify timestamp was set by changes
          expect(useStore.getState().lastChangeTimestamp).not.toBeNull()

          // Revert
          useStore.getState().revertToStable()

          // After revert, timestamp must be cleared
          expect(useStore.getState().lastChangeTimestamp).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })
})
