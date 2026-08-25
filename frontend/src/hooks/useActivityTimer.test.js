/**
 * Unit tests for useActivityTimer hook.
 *
 * Tests specific example-based scenarios and edge cases for the activity timer lifecycle.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// ── Mock useAppStore ────────────────────────────────────────────────────────────
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

// ── Visibility helpers ──────────────────────────────────────────────────────────

/**
 * Set document.visibilityState and dispatch visibilitychange event.
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

// ── Test suite ──────────────────────────────────────────────────────────────────

describe('useActivityTimer', () => {
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

  // ── Test 1: Timer starts on Space phase entry for authenticated users ──────

  describe('timer starts for authenticated users in Space phase', () => {
    it('should set isRunning to true when authenticated user enters Space phase', () => {
      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.isRunning).toBe(true)
    })

    it('should increment elapsed each second', () => {
      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(3000) })

      expect(result.current.elapsed).toBe(3)
      expect(result.current.isRunning).toBe(true)
    })

    it('should persist elapsed to sessionStorage under anonemote_eval_timer', () => {
      const onThresholdReached = vi.fn()
      renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(5000) })

      expect(sessionStorage.getItem('anonemote_eval_timer')).toBe('5')
    })
  })

  // ── Test 2: Timer does NOT start for guest users ───────────────────────────

  describe('timer does not start for guest users', () => {
    it('should not run when isAuthenticated is false', () => {
      mockStoreState = { phase: 'space', isAuthenticated: false }

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.isRunning).toBe(false)
      expect(result.current.elapsed).toBe(0)

      act(() => { vi.advanceTimersByTime(5000) })

      expect(result.current.elapsed).toBe(0)
      expect(result.current.isRunning).toBe(false)
    })

    it('should not call onThresholdReached for guest users', () => {
      mockStoreState = { phase: 'space', isAuthenticated: false }

      const onThresholdReached = vi.fn()
      renderHook(() =>
        useActivityTimer({ threshold: 5, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(10000) })

      expect(onThresholdReached).not.toHaveBeenCalled()
    })
  })

  // ── Test 3: Timer pauses on visibility hidden ──────────────────────────────

  describe('timer pauses on visibility hidden', () => {
    it('should stop incrementing when tab becomes hidden', () => {
      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(3000) })
      expect(result.current.elapsed).toBe(3)

      act(() => { setVisibility('hidden') })
      expect(result.current.isRunning).toBe(false)

      // Advance 10 more seconds while hidden
      act(() => { vi.advanceTimersByTime(10000) })
      expect(result.current.elapsed).toBe(3) // unchanged
    })

    it('should persist current elapsed to sessionStorage on pause', () => {
      const onThresholdReached = vi.fn()
      renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(7000) })
      act(() => { setVisibility('hidden') })

      expect(sessionStorage.getItem('anonemote_eval_timer')).toBe('7')
    })
  })

  // ── Test 4: Timer resumes on visible ───────────────────────────────────────

  describe('timer resumes on visible', () => {
    it('should continue from paused value when tab becomes visible again', () => {
      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      // Run for 5 seconds
      act(() => { vi.advanceTimersByTime(5000) })
      expect(result.current.elapsed).toBe(5)

      // Pause
      act(() => { setVisibility('hidden') })
      expect(result.current.isRunning).toBe(false)

      // Hidden for 60 seconds (should not count)
      act(() => { vi.advanceTimersByTime(60000) })

      // Resume
      act(() => { setVisibility('visible') })
      expect(result.current.isRunning).toBe(true)
      expect(result.current.elapsed).toBe(5) // still 5, not 65

      // Advance 3 more seconds
      act(() => { vi.advanceTimersByTime(3000) })
      expect(result.current.elapsed).toBe(8)
    })
  })

  // ── Test 5: Timer stops and resets on phase change ─────────────────────────

  describe('timer stops and resets on phase change away from "space"', () => {
    it('should reset elapsed to 0 and stop when phase changes', () => {
      const onThresholdReached = vi.fn()
      const { result, rerender } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(10000) })
      expect(result.current.elapsed).toBe(10)

      // Simulate phase change
      act(() => {
        mockStoreState = { phase: 'checkin', isAuthenticated: true }
        rerender()
      })

      expect(result.current.elapsed).toBe(0)
      expect(result.current.isRunning).toBe(false)
    })

    it('should clear sessionStorage timer key on phase change', () => {
      const onThresholdReached = vi.fn()
      const { rerender } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(5000) })
      expect(sessionStorage.getItem('anonemote_eval_timer')).toBe('5')

      // Phase changes
      act(() => {
        mockStoreState = { phase: 'landing', isAuthenticated: true }
        rerender()
      })

      expect(sessionStorage.getItem('anonemote_eval_timer')).toBeNull()
    })
  })

  // ── Test 6: sessionStorage dismissed flag prevents timer start ─────────────

  describe('sessionStorage flags prevent timer start', () => {
    it('should not start when anonemote_eval_dismissed is "true"', () => {
      sessionStorage.setItem('anonemote_eval_dismissed', 'true')

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.isRunning).toBe(false)
      expect(result.current.elapsed).toBe(0)

      act(() => { vi.advanceTimersByTime(5000) })
      expect(result.current.elapsed).toBe(0)
    })

    // ── Test 7: sessionStorage evaluated flag prevents timer start ────────────

    it('should not start when anonemote_evaluated is "true"', () => {
      sessionStorage.setItem('anonemote_evaluated', 'true')

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.isRunning).toBe(false)
      expect(result.current.elapsed).toBe(0)

      act(() => { vi.advanceTimersByTime(5000) })
      expect(result.current.elapsed).toBe(0)
    })

    it('should not call onThresholdReached when dismissed flag is set', () => {
      sessionStorage.setItem('anonemote_eval_dismissed', 'true')

      const onThresholdReached = vi.fn()
      renderHook(() =>
        useActivityTimer({ threshold: 3, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(10000) })
      expect(onThresholdReached).not.toHaveBeenCalled()
    })
  })

  // ── Test 8: onThresholdReached fires exactly once ──────────────────────────

  describe('onThresholdReached callback', () => {
    it('should fire exactly once when elapsed reaches the threshold', () => {
      const onThresholdReached = vi.fn()
      renderHook(() =>
        useActivityTimer({ threshold: 5, onThresholdReached })
      )

      // Before threshold
      act(() => { vi.advanceTimersByTime(4000) })
      expect(onThresholdReached).not.toHaveBeenCalled()

      // At threshold
      act(() => { vi.advanceTimersByTime(1000) })
      expect(onThresholdReached).toHaveBeenCalledTimes(1)

      // Beyond threshold — should not fire again
      act(() => { vi.advanceTimersByTime(10000) })
      expect(onThresholdReached).toHaveBeenCalledTimes(1)
    })

    it('should fire immediately if stored value already exceeds threshold on mount', () => {
      sessionStorage.setItem('anonemote_eval_timer', '10')

      const onThresholdReached = vi.fn()
      renderHook(() =>
        useActivityTimer({ threshold: 5, onThresholdReached })
      )

      expect(onThresholdReached).toHaveBeenCalledTimes(1)
    })
  })

  // ── Test 9: Timer restores from sessionStorage on mount ────────────────────

  describe('timer restores from sessionStorage on mount', () => {
    it('should restore elapsed from sessionStorage for authenticated user in space phase', () => {
      sessionStorage.setItem('anonemote_eval_timer', '42')

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.elapsed).toBe(42)
      expect(result.current.isRunning).toBe(true)
    })

    it('should continue counting from restored value', () => {
      sessionStorage.setItem('anonemote_eval_timer', '10')

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      act(() => { vi.advanceTimersByTime(3000) })
      expect(result.current.elapsed).toBe(13) // 10 restored + 3 new
    })

    it('should reset to 0 if stored value is invalid (NaN)', () => {
      sessionStorage.setItem('anonemote_eval_timer', 'not-a-number')

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.elapsed).toBe(0)
    })

    it('should reset to 0 if stored value is negative', () => {
      sessionStorage.setItem('anonemote_eval_timer', '-5')

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.elapsed).toBe(0)
    })

    it('should reset to 0 if stored value is Infinity', () => {
      sessionStorage.setItem('anonemote_eval_timer', 'Infinity')

      const onThresholdReached = vi.fn()
      const { result } = renderHook(() =>
        useActivityTimer({ threshold: 300, onThresholdReached })
      )

      expect(result.current.elapsed).toBe(0)
    })
  })
})
