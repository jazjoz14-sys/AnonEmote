/**
 * Property-based tests for useActivityTimer hook.
 *
 * @vitest-environment jsdom
 */

// Feature: user-evaluation, Property 1: Timer pause/resume round-trip
// Validates: Requirements 1.2, 1.3

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { renderHook, act } from '@testing-library/react'

// ── Mock useAppStore ────────────────────────────────────────────────────────────
// The hook reads `phase` and `isAuthenticated` from the store.
// We need authenticated user in space phase for the timer to initialize.
let mockStoreState = { phase: 'space', isAuthenticated: true }

vi.mock('../store/useAppStore', () => {
  const store = vi.fn((selector) => {
    if (typeof selector === 'function') return selector(mockStoreState)
    return mockStoreState
  })
  store.getState = vi.fn(() => mockStoreState)
  store.setState = vi.fn()
  store.subscribe = vi.fn(() => vi.fn())
  return { default: store }
})

import { useActivityTimer } from './useActivityTimer.js'

// ── Helpers ─────────────────────────────────────────────────────────────────────

/**
 * Mock document.visibilityState and dispatch visibilitychange event.
 * @param {'visible'|'hidden'} state
 */
function setVisibility(state) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
  document.dispatchEvent(new Event('visibilitychange'))
}

/**
 * Set document.visibilityState without firing an event (initial state setup).
 * @param {'visible'|'hidden'} state
 */
function setInitialVisibility(state) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  })
}

// ── Generators ──────────────────────────────────────────────────────────────────

/**
 * Generate a sequence of visibility toggle events.
 * Each entry has:
 *   - visible: whether the tab becomes visible (true) or hidden (false)
 *   - duration: how many seconds to advance while in this state
 */
const arbVisibilitySequence = fc.array(
  fc.record({
    visible: fc.boolean(),
    duration: fc.nat({ max: 60 }),
  }),
  { minLength: 1, maxLength: 20 }
)

// ── Property 1: Timer Pause/Resume Round-Trip ───────────────────────────────────

describe('Property 1: Timer pause/resume round-trip', () => {
  /**
   * For any sequence of pause/resume events (visibility changes), the elapsed
   * time always equals the sum of visible durations — no time is lost or
   * fabricated during visibility transitions.
   *
   * Validates: Requirements 1.2, 1.3
   */

  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    mockStoreState = { phase: 'space', isAuthenticated: true }
    setInitialVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('elapsed equals the sum of visible durations for any sequence of visibility changes', () => {
    fc.assert(
      fc.property(arbVisibilitySequence, (sequence) => {
        // Reset state for each property iteration
        sessionStorage.clear()
        setInitialVisibility('visible')

        const onThresholdReached = vi.fn()
        const { result, unmount } = renderHook(() =>
          useActivityTimer({ threshold: 99999, onThresholdReached })
        )

        // Calculate expected visible time from the sequence.
        // The hook starts running immediately since the tab starts visible.
        let expectedElapsed = 0
        let currentlyVisible = true

        for (const event of sequence) {
          if (event.visible && !currentlyVisible) {
            // Tab becomes visible — timer resumes
            act(() => { setVisibility('visible') })
            currentlyVisible = true
          } else if (!event.visible && currentlyVisible) {
            // Tab becomes hidden — timer pauses
            act(() => { setVisibility('hidden') })
            currentlyVisible = false
          }
          // else: no state change (already in the desired state)

          // Advance time by the specified duration (in seconds → ms)
          if (event.duration > 0) {
            act(() => { vi.advanceTimersByTime(event.duration * 1000) })
          }

          // Accumulate expected time only during visible periods
          if (currentlyVisible) {
            expectedElapsed += event.duration
          }
        }

        // Verify elapsed matches the total visible time
        expect(result.current.elapsed).toBe(expectedElapsed)

        // Verify sessionStorage persists the correct value (round-trip integrity)
        if (expectedElapsed > 0) {
          const stored = sessionStorage.getItem('anonemote_eval_timer')
          expect(Number(stored)).toBe(expectedElapsed)
        }

        // Cleanup
        unmount()
      }),
      { numRuns: 100 }
    )
  })

  it('pausing and resuming preserves exact elapsed value: no time lost or fabricated', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 120 }),  // initial visible duration before pause
        fc.nat({ max: 300 }),  // hidden duration (should not count)
        (visibleDuration, hiddenDuration) => {
          sessionStorage.clear()
          setInitialVisibility('visible')

          const onThresholdReached = vi.fn()
          const { result, unmount } = renderHook(() =>
            useActivityTimer({ threshold: 99999, onThresholdReached })
          )

          // Advance time while visible
          if (visibleDuration > 0) {
            act(() => { vi.advanceTimersByTime(visibleDuration * 1000) })
          }

          // Pause (go hidden) — persists to sessionStorage
          act(() => { setVisibility('hidden') })

          // Verify stored value equals visible duration (Req 1.2)
          const storedOnPause = Number(sessionStorage.getItem('anonemote_eval_timer'))
          expect(storedOnPause).toBe(visibleDuration)

          // Advance time while hidden (should NOT count)
          if (hiddenDuration > 0) {
            act(() => { vi.advanceTimersByTime(hiddenDuration * 1000) })
          }

          // Resume (go visible) — reads from sessionStorage (Req 1.3)
          act(() => { setVisibility('visible') })

          // Elapsed should still equal only the visible duration (round-trip preserved)
          expect(result.current.elapsed).toBe(visibleDuration)

          // Cleanup
          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })
})

// ── Property 2: Timer Accumulates Only Visible Time ─────────────────────────────

// Feature: user-evaluation, Property 2: Timer Accumulates Only Visible Time
// Validates: Requirements 1.4

describe('Property 2: Timer Accumulates Only Visible Time', () => {
  /**
   * For any sequence of visible and hidden periods during a Space phase session,
   * the total accumulated timer value equals the sum of only the visible period
   * durations, never including time spent while the tab is hidden.
   *
   * Validates: Requirements 1.4
   */

  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    mockStoreState = { phase: 'space', isAuthenticated: true }
    setInitialVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  it('elapsed never increments while visibility state is "hidden"', () => {
    fc.assert(
      fc.property(
        // Generate random hidden durations (0–60 seconds each, 1–10 periods)
        fc.array(fc.nat({ max: 60 }), { minLength: 1, maxLength: 10 }),
        (hiddenDurations) => {
          // Reset for each iteration
          sessionStorage.clear()
          setInitialVisibility('visible')

          const onThresholdReached = vi.fn()
          const { result, unmount } = renderHook(() =>
            useActivityTimer({ threshold: 99999, onThresholdReached })
          )

          // Let the timer tick for 2 visible seconds to establish a baseline
          act(() => { vi.advanceTimersByTime(2000) })
          const elapsedBeforeHidden = result.current.elapsed
          expect(elapsedBeforeHidden).toBe(2)

          // Switch to hidden state
          act(() => { setVisibility('hidden') })

          // Advance time by the total of all generated hidden durations
          const totalHiddenMs = hiddenDurations.reduce((sum, d) => sum + d, 0) * 1000
          if (totalHiddenMs > 0) {
            act(() => { vi.advanceTimersByTime(totalHiddenMs) })
          }

          // Elapsed must NOT have changed while hidden
          expect(result.current.elapsed).toBe(elapsedBeforeHidden)

          // Return to visible — elapsed should still equal the pre-hidden value
          act(() => { setVisibility('visible') })
          expect(result.current.elapsed).toBe(elapsedBeforeHidden)

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('accumulated time equals sum of visible durations only across interleaved periods', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            visible: fc.boolean(),
            duration: fc.integer({ min: 1, max: 30 }),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        (periods) => {
          sessionStorage.clear()
          setInitialVisibility('visible')

          const onThresholdReached = vi.fn()
          const { result, unmount } = renderHook(() =>
            useActivityTimer({ threshold: 99999, onThresholdReached })
          )

          let expectedElapsed = 0
          let currentlyVisible = true

          for (const period of periods) {
            // Only dispatch event if state actually changes
            if (period.visible && !currentlyVisible) {
              act(() => { setVisibility('visible') })
              currentlyVisible = true
            } else if (!period.visible && currentlyVisible) {
              act(() => { setVisibility('hidden') })
              currentlyVisible = false
            }

            // Advance time for this period
            act(() => { vi.advanceTimersByTime(period.duration * 1000) })

            // Only visible periods contribute to elapsed
            if (currentlyVisible) {
              expectedElapsed += period.duration
            }
          }

          // The elapsed value should equal only the total visible time
          expect(result.current.elapsed).toBe(expectedElapsed)

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('a single long hidden period adds zero to elapsed', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3600 }), // 1 second to 1 hour of hidden time
        (hiddenSeconds) => {
          sessionStorage.clear()
          setInitialVisibility('visible')

          const onThresholdReached = vi.fn()
          const { result, unmount } = renderHook(() =>
            useActivityTimer({ threshold: 99999, onThresholdReached })
          )

          // Run 1 visible second as baseline
          act(() => { vi.advanceTimersByTime(1000) })
          expect(result.current.elapsed).toBe(1)

          // Go hidden
          act(() => { setVisibility('hidden') })

          // Advance by the random hidden duration
          act(() => { vi.advanceTimersByTime(hiddenSeconds * 1000) })

          // Elapsed must still be 1 (hidden time never counted)
          expect(result.current.elapsed).toBe(1)

          unmount()
        }
      ),
      { numRuns: 100 }
    )
  })
})
