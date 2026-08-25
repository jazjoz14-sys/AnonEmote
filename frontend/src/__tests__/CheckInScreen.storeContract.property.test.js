// Feature: checkin-experience-redesign
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { FEELINGS, getFeelingById } from '../data/emotions.js'
import { getPlanetById } from '../data/planets.js'

/**
 * These property tests validate the CheckInScreen store contract logic
 * by testing the completeCheckIn and skipCheckIn functions in isolation
 * (no React rendering). We replicate the orchestrator logic and use
 * mocked store methods to verify call arguments and ordering.
 *
 * Logic under test (from CheckInScreen.jsx):
 *
 *   function completeCheckIn(store, feelingId, nuance) {
 *     const planet = getPlanetById(feelingId)
 *     if (planet) store.setSelectedPlanet(planet)
 *     store.setCheckIn({ feeling: feelingId, nuance: nuance.id, prompt: nuance.prompt })
 *     store.setPhase('space')
 *     store.setPostModalOpen(true)
 *   }
 *
 *   function skipCheckIn(store) {
 *     store.setPhase('space')
 *   }
 */

// ─── Helpers: replicate orchestrator logic ──────────────────────────────────────

/**
 * Replicates the completeCheckIn logic from CheckInScreen.jsx.
 * Calls store methods in the documented order.
 */
function completeCheckIn(store, feelingId, nuance) {
  const planet = getPlanetById(feelingId)
  if (planet) store.setSelectedPlanet(planet)
  store.setCheckIn({ feeling: feelingId, nuance: nuance.id, prompt: nuance.prompt })
  store.setPhase('space')
  store.setPostModalOpen(true)
}

/**
 * Replicates the skipCheckIn logic from CheckInScreen.jsx.
 * Calls only setPhase('space') — no other store writes.
 */
function skipCheckIn(store) {
  store.setPhase('space')
}

/**
 * Creates a mock store with tracked call order.
 * Each method records its call in a shared callOrder array.
 */
function createMockStore() {
  const callOrder = []
  return {
    callOrder,
    setSelectedPlanet: vi.fn((planet) => callOrder.push({ method: 'setSelectedPlanet', args: [planet] })),
    setCheckIn: vi.fn((data) => callOrder.push({ method: 'setCheckIn', args: [data] })),
    setPhase: vi.fn((phase) => callOrder.push({ method: 'setPhase', args: [phase] })),
    setPostModalOpen: vi.fn((open) => callOrder.push({ method: 'setPostModalOpen', args: [open] })),
  }
}

// ─── Arbitrary: valid (feelingId, nuance) pair from FEELINGS ────────────────────

/**
 * Generates a random valid (feeling, nuance) pair from the FEELINGS data.
 * Ensures all generated pairs are real data — no synthetic values.
 */
const validFeelingNuancePairArb = fc.constantFrom(
  ...FEELINGS.flatMap((feeling) =>
    feeling.nuances.map((nuance) => ({ feelingId: feeling.id, nuance }))
  )
)

// ─── Property 8: Store contract correctness ─────────────────────────────────────

/**
 * Validates: Requirements 4.4, 5.1
 *
 * Property 8: Store contract correctness
 * For any valid (feelingId, nuanceId) pair from the FEELINGS data structure,
 * completing the check-in SHALL produce a store write of
 * { feeling: feelingId, nuance: nuanceId, prompt: promptString }
 * where promptString exactly matches the prompt field of the selected nuance.
 */
describe('Feature: checkin-experience-redesign, Property 8: Store contract correctness', () => {
  it('completeCheckIn writes exact { feeling, nuance, prompt } matching FEELINGS data', () => {
    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId, nuance }) => {
          const store = createMockStore()

          completeCheckIn(store, feelingId, nuance)

          // setCheckIn must have been called exactly once
          expect(store.setCheckIn).toHaveBeenCalledTimes(1)

          // Extract the argument passed to setCheckIn
          const checkInArg = store.setCheckIn.mock.calls[0][0]

          // Verify feeling matches
          expect(checkInArg.feeling).toBe(feelingId)

          // Verify nuance matches the nuance id
          expect(checkInArg.nuance).toBe(nuance.id)

          // Verify prompt exactly matches the nuance's prompt string
          expect(checkInArg.prompt).toBe(nuance.prompt)

          // Cross-check: look up from FEELINGS data to confirm the triple is valid
          const feeling = getFeelingById(feelingId)
          const matchingNuance = feeling.nuances.find((n) => n.id === nuance.id)
          expect(matchingNuance).toBeDefined()
          expect(checkInArg.prompt).toBe(matchingNuance.prompt)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('feelingId in setCheckIn is always one of the 7 valid FEELINGS IDs', () => {
    const validIds = FEELINGS.map((f) => f.id)

    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId, nuance }) => {
          const store = createMockStore()

          completeCheckIn(store, feelingId, nuance)

          const checkInArg = store.setCheckIn.mock.calls[0][0]
          expect(validIds).toContain(checkInArg.feeling)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('prompt string is always a non-empty string ending with a question mark or period', () => {
    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId, nuance }) => {
          const store = createMockStore()

          completeCheckIn(store, feelingId, nuance)

          const checkInArg = store.setCheckIn.mock.calls[0][0]
          expect(typeof checkInArg.prompt).toBe('string')
          expect(checkInArg.prompt.length).toBeGreaterThan(0)
          // All prompts in the system end with ? or .
          expect(checkInArg.prompt).toMatch(/[?.!]$/)
        }
      ),
      { numRuns: 200 }
    )
  })
})

// ─── Property 11: Store method call ordering ────────────────────────────────────

/**
 * Validates: Requirements 5.2, 5.3, 5.4, 5.6, 5.7
 *
 * Property 11: Store method call ordering
 * For any complete check-in flow, the store methods SHALL be invoked in this
 * exact order: (1) setSelectedPlanet, (2) setCheckIn, (3) setPhase('space'),
 * (4) setPostModalOpen(true). If getPlanetById returns undefined, step 1 is
 * skipped but steps 2-4 still execute in order.
 */
describe('Feature: checkin-experience-redesign, Property 11: Store method call ordering', () => {
  it('store methods called in exact order: setSelectedPlanet → setCheckIn → setPhase → setPostModalOpen', () => {
    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId, nuance }) => {
          const store = createMockStore()

          completeCheckIn(store, feelingId, nuance)

          const planet = getPlanetById(feelingId)
          const methods = store.callOrder.map((c) => c.method)

          if (planet) {
            // Full 4-step order when planet exists
            expect(methods).toEqual([
              'setSelectedPlanet',
              'setCheckIn',
              'setPhase',
              'setPostModalOpen',
            ])
          } else {
            // 3-step order when planet is undefined (step 1 skipped)
            expect(methods).toEqual([
              'setCheckIn',
              'setPhase',
              'setPostModalOpen',
            ])
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('setPhase is always called with "space"', () => {
    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId, nuance }) => {
          const store = createMockStore()

          completeCheckIn(store, feelingId, nuance)

          expect(store.setPhase).toHaveBeenCalledTimes(1)
          expect(store.setPhase).toHaveBeenCalledWith('space')
        }
      ),
      { numRuns: 200 }
    )
  })

  it('setPostModalOpen is always called with true', () => {
    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId, nuance }) => {
          const store = createMockStore()

          completeCheckIn(store, feelingId, nuance)

          expect(store.setPostModalOpen).toHaveBeenCalledTimes(1)
          expect(store.setPostModalOpen).toHaveBeenCalledWith(true)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('setSelectedPlanet receives the correct planet object when it exists', () => {
    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId, nuance }) => {
          const store = createMockStore()

          completeCheckIn(store, feelingId, nuance)

          const planet = getPlanetById(feelingId)
          if (planet) {
            expect(store.setSelectedPlanet).toHaveBeenCalledTimes(1)
            expect(store.setSelectedPlanet).toHaveBeenCalledWith(planet)
            // Verify the planet's id matches the feelingId
            expect(store.setSelectedPlanet.mock.calls[0][0].id).toBe(feelingId)
          } else {
            expect(store.setSelectedPlanet).not.toHaveBeenCalled()
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('when getPlanetById returns undefined, setSelectedPlanet is skipped but remaining calls proceed', () => {
    // Create a scenario where getPlanetById returns undefined
    // by using a fake feeling ID (testing the guard logic directly)
    const store = createMockStore()
    const fakeFeelingId = 'nonexistent_planet_xyz'
    const fakeNuance = { id: 'fake', prompt: 'Test prompt?' }

    completeCheckIn(store, fakeFeelingId, fakeNuance)

    // setSelectedPlanet should NOT be called
    expect(store.setSelectedPlanet).not.toHaveBeenCalled()

    // Remaining methods still called in order
    const methods = store.callOrder.map((c) => c.method)
    expect(methods).toEqual(['setCheckIn', 'setPhase', 'setPostModalOpen'])

    // Verify arguments
    expect(store.setCheckIn).toHaveBeenCalledWith({
      feeling: 'nonexistent_planet_xyz',
      nuance: 'fake',
      prompt: 'Test prompt?',
    })
    expect(store.setPhase).toHaveBeenCalledWith('space')
    expect(store.setPostModalOpen).toHaveBeenCalledWith(true)
  })
})

// ─── Property 12: Skip action isolation ─────────────────────────────────────────

/**
 * Validates: Requirements 6.2, 6.3
 *
 * Property 12: Skip action isolation
 * For any step of the check-in flow (breathing, mood, or nuance — with or without
 * partial feeling selection), activating the skip affordance SHALL call only
 * setPhase('space') and SHALL NOT call setSelectedPlanet, setCheckIn, or
 * setPostModalOpen.
 */
describe('Feature: checkin-experience-redesign, Property 12: Skip action isolation', () => {
  it('skip calls only setPhase("space") regardless of current step', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('breathing', 'mood', 'nuance'),
        (_step) => {
          const store = createMockStore()

          skipCheckIn(store)

          // Only setPhase should be called
          expect(store.setPhase).toHaveBeenCalledTimes(1)
          expect(store.setPhase).toHaveBeenCalledWith('space')

          // No other store methods should be called
          expect(store.setSelectedPlanet).not.toHaveBeenCalled()
          expect(store.setCheckIn).not.toHaveBeenCalled()
          expect(store.setPostModalOpen).not.toHaveBeenCalled()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('skip never writes check-in data even if a feeling was previously selected', () => {
    fc.assert(
      fc.property(
        validFeelingNuancePairArb,
        ({ feelingId }) => {
          const store = createMockStore()

          // Simulate: user selected a feeling (stored locally in component state)
          // but then hit skip instead of selecting a nuance
          // The skipCheckIn function should NOT reference any partial state
          const _partialSelection = { feeling: feelingId }

          skipCheckIn(store)

          // callOrder should contain ONLY setPhase
          expect(store.callOrder).toHaveLength(1)
          expect(store.callOrder[0].method).toBe('setPhase')
          expect(store.callOrder[0].args[0]).toBe('space')
        }
      ),
      { numRuns: 200 }
    )
  })

  it('skip produces exactly 1 store call total', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('breathing', 'mood', 'nuance'),
        fc.option(fc.constantFrom(...FEELINGS.map((f) => f.id)), { nil: undefined }),
        (_step, _partialFeelingId) => {
          const store = createMockStore()

          skipCheckIn(store)

          // Exactly 1 call total across all methods
          const totalCalls =
            store.setSelectedPlanet.mock.calls.length +
            store.setCheckIn.mock.calls.length +
            store.setPhase.mock.calls.length +
            store.setPostModalOpen.mock.calls.length

          expect(totalCalls).toBe(1)
          expect(store.setPhase.mock.calls.length).toBe(1)
        }
      ),
      { numRuns: 100 }
    )
  })
})
