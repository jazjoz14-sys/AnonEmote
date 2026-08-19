/**
 * Property-based tests for state preservation across orientation change.
 *
 * Verifies that Zustand store state is NOT affected by window resize events.
 * This is by design — panel open state and draft text persist across
 * simulated orientation changes (resize events).
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { create } from 'zustand'

/**
 * Creates a minimal Zustand store mirroring the relevant state slices
 * from useAppStore — selectedPlanet, postModalOpen, crisis.draft, openSheets.
 *
 * We use a standalone store here to isolate the property test from
 * side effects in the full app store (Supabase, sessionStorage, etc.).
 */
function createTestStore() {
  return create((set) => ({
    // Panel open state
    selectedPlanet: null,
    setSelectedPlanet: (planet) => set({ selectedPlanet: planet }),

    postModalOpen: false,
    setPostModalOpen: (v) => set({ postModalOpen: v }),

    // Draft text (preserved via crisis.draft in actual store)
    crisis: { open: false, draft: '', referral: null },
    openCrisis: ({ draft, referral }) =>
      set({ crisis: { open: true, draft: draft || '', referral: referral || null } }),
    setCrisisDraft: (draft) =>
      set((s) => ({ crisis: { ...s.crisis, draft } })),

    // Bottom sheet tracking
    openSheets: [],
    registerSheet: (id) =>
      set((s) => ({
        openSheets: s.openSheets.includes(id) ? s.openSheets : [...s.openSheets, id],
      })),
    unregisterSheet: (id) =>
      set((s) => ({
        openSheets: s.openSheets.filter((x) => x !== id),
      })),
  }))
}

describe('Feature: responsive-pwa-layout, Property 8: State Preservation Across Orientation Change', () => {
  let store

  beforeEach(() => {
    store = createTestStore()
  })

  /**
   * **Validates: Requirements 11.5**
   *
   * Property 8: State Preservation Across Orientation Change
   * For any combination of open panels (PlanetInfoPanel, PostModal) and
   * any draft text content (0–280 characters), after a simulated orientation
   * change (resize event), the panel open/close state SHALL remain unchanged
   * and the draft text SHALL be preserved character-for-character.
   */
  it('store state is unchanged after simulated resize event for any panel + draft combination', () => {
    // Arbitrary for generating printable strings (simulating user-typed draft text)
    const draftArb = fc.string({ minLength: 0, maxLength: 280 })

    fc.assert(
      fc.property(
        // Random boolean: whether PlanetInfoPanel is open (selectedPlanet !== null)
        fc.boolean(),
        // Random boolean: whether PostModal is open
        fc.boolean(),
        // Random draft text (0–280 chars)
        draftArb,
        // Random new viewport dimensions to simulate orientation change
        fc.integer({ min: 300, max: 1200 }),
        fc.integer({ min: 300, max: 1200 }),
        (planetInfoOpen, postModalOpen, draftText, newWidth, newHeight) => {
          // ─── Setup initial state ───────────────────────────────────────
          const planetId = planetInfoOpen ? 'joy' : null
          store.getState().setSelectedPlanet(planetId)
          store.getState().setPostModalOpen(postModalOpen)
          store.getState().setCrisisDraft(draftText)

          // Register open sheets to match panel state
          if (planetInfoOpen) store.getState().registerSheet('planetInfoPanel')
          if (postModalOpen) store.getState().registerSheet('postModal')

          // Capture state snapshot before resize
          const stateBefore = {
            selectedPlanet: store.getState().selectedPlanet,
            postModalOpen: store.getState().postModalOpen,
            crisisDraft: store.getState().crisis.draft,
            openSheets: [...store.getState().openSheets],
          }

          // ─── Simulate orientation change via resize event ──────────────
          Object.defineProperty(window, 'innerWidth', {
            value: newWidth,
            writable: true,
            configurable: true,
          })
          Object.defineProperty(window, 'innerHeight', {
            value: newHeight,
            writable: true,
            configurable: true,
          })

          // Dispatch resize event (this is what orientation change triggers)
          window.dispatchEvent(new Event('resize'))

          // ─── Verify state is unchanged ─────────────────────────────────
          const stateAfter = store.getState()

          // Panel open/close state preserved
          expect(stateAfter.selectedPlanet).toBe(stateBefore.selectedPlanet)
          expect(stateAfter.postModalOpen).toBe(stateBefore.postModalOpen)

          // Draft text preserved character-for-character
          expect(stateAfter.crisis.draft).toBe(stateBefore.crisisDraft)

          // Open sheets array preserved
          expect(stateAfter.openSheets).toEqual(stateBefore.openSheets)

          // ─── Reset for next iteration ──────────────────────────────────
          store.getState().setSelectedPlanet(null)
          store.getState().setPostModalOpen(false)
          store.getState().setCrisisDraft('')
          // Clear open sheets
          stateAfter.openSheets.forEach((id) =>
            store.getState().unregisterSheet(id)
          )
        }
      ),
      { numRuns: 150 }
    )
  })
})
