import { useEffect, useRef, useState, useCallback } from 'react'
import useAppStore from '../store/useAppStore'

/**
 * Session storage keys used by the evaluation system.
 * @type {Object<string, string>}
 */
const STORAGE_KEYS = {
  TIMER: 'anonemote_eval_timer',
  DISMISSED: 'anonemote_eval_dismissed',
  EVALUATED: 'anonemote_evaluated',
}

/**
 * Safely read a numeric value from sessionStorage.
 * Returns 0 if the value is missing, non-numeric, negative, or non-finite.
 *
 * @param {string} key - sessionStorage key to read
 * @returns {number}
 */
function readStoredElapsed(key) {
  try {
    const raw = sessionStorage.getItem(key)
    if (raw === null) return 0
    const num = Number(raw)
    if (!Number.isFinite(num) || num < 0) return 0
    return num
  } catch {
    // sessionStorage may be blocked (e.g. some private browsing modes)
    return 0
  }
}

/**
 * Safely write a value to sessionStorage, swallowing errors.
 *
 * @param {string} key
 * @param {string} value
 */
function safeSetItem(key, value) {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Storage full or blocked — timer continues in-memory only
  }
}

/**
 * Safely remove a key from sessionStorage, swallowing errors.
 *
 * @param {string} key
 */
function safeRemoveItem(key) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Ignore
  }
}

/**
 * Check whether session-level dismissal or completion flags are already set.
 * If either flag is present, the timer and notification should not activate.
 *
 * @returns {boolean} true if the evaluation system should be suppressed
 */
function isEvalSuppressed() {
  try {
    return (
      sessionStorage.getItem(STORAGE_KEYS.DISMISSED) === 'true' ||
      sessionStorage.getItem(STORAGE_KEYS.EVALUATED) === 'true'
    )
  } catch {
    return false
  }
}

/**
 * useActivityTimer — tracks cumulative active time in the Space phase.
 *
 * Starts a 1-second interval when the authenticated user is in the Space
 * phase and the browser tab is visible. Pauses on visibility hidden, resumes
 * on visible. Persists elapsed time to sessionStorage so it survives page
 * reloads within the same session.
 *
 * Does nothing for guest users or when the user has already dismissed the
 * evaluation notification or submitted an evaluation this session.
 *
 * @param {Object} options
 * @param {number} [options.threshold=300] - Seconds before triggering callback
 * @param {() => void} options.onThresholdReached - Called exactly once when elapsed ≥ threshold
 * @returns {{ elapsed: number, isRunning: boolean, reset: () => void }}
 */
export function useActivityTimer({ threshold = 300, onThresholdReached }) {
  const phase = useAppStore((s) => s.phase)
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  const [elapsed, setElapsed] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  // Refs to avoid stale closures in interval/event callbacks
  const intervalRef = useRef(null)
  const elapsedRef = useRef(0)
  const firedRef = useRef(false)
  const onThresholdReachedRef = useRef(onThresholdReached)

  // Keep the callback ref current without re-starting the interval
  useEffect(() => {
    onThresholdReachedRef.current = onThresholdReached
  }, [onThresholdReached])

  /**
   * Clear the running interval and mark as not running.
   */
  const stopInterval = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsRunning(false)
  }, [])

  /**
   * Start the 1-second counting interval.
   * Each tick: increment elapsed, persist to sessionStorage, check threshold.
   */
  const startInterval = useCallback(() => {
    // Avoid double-starting
    if (intervalRef.current !== null) return

    setIsRunning(true)
    intervalRef.current = setInterval(() => {
      elapsedRef.current += 1
      const currentElapsed = elapsedRef.current

      setElapsed(currentElapsed)
      safeSetItem(STORAGE_KEYS.TIMER, String(currentElapsed))

      // Fire callback exactly once when threshold is reached
      if (!firedRef.current && currentElapsed >= threshold) {
        firedRef.current = true
        if (typeof onThresholdReachedRef.current === 'function') {
          onThresholdReachedRef.current()
        }
      }
    }, 1000)
  }, [threshold])

  /**
   * Reset internal state and clear sessionStorage timer key.
   */
  const reset = useCallback(() => {
    stopInterval()
    elapsedRef.current = 0
    firedRef.current = false
    setElapsed(0)
    safeRemoveItem(STORAGE_KEYS.TIMER)
  }, [stopInterval])

  // ── Main effect: manage timer lifecycle based on phase + auth + visibility ──
  useEffect(() => {
    // Conditions for the timer to run:
    // 1. User is authenticated (not a guest)
    // 2. Current phase is "space"
    // 3. Evaluation not already dismissed or completed this session
    const shouldRun = isAuthenticated && phase === 'space' && !isEvalSuppressed()

    if (!shouldRun) {
      // Phase left "space" or conditions not met — full reset
      reset()
      return
    }

    // Restore elapsed from sessionStorage (validates: non-negative finite number)
    const stored = readStoredElapsed(STORAGE_KEYS.TIMER)
    elapsedRef.current = stored
    setElapsed(stored)

    // Check if threshold was already reached in a prior page load
    if (stored >= threshold) {
      firedRef.current = true
      if (typeof onThresholdReachedRef.current === 'function') {
        onThresholdReachedRef.current()
      }
    }

    // Only start if tab is currently visible
    if (document.visibilityState === 'visible') {
      startInterval()
    }

    // ── Visibility change handler: pause on hidden, resume on visible ──
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        // Pause: persist current value and stop ticking
        safeSetItem(STORAGE_KEYS.TIMER, String(elapsedRef.current))
        stopInterval()
      } else {
        // Resume: re-read stored value (defensive) and restart
        const restored = readStoredElapsed(STORAGE_KEYS.TIMER)
        elapsedRef.current = restored
        setElapsed(restored)
        startInterval()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    // Cleanup on unmount or when conditions change
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      stopInterval()
    }
  }, [phase, isAuthenticated, threshold, startInterval, stopInterval, reset])

  return { elapsed, isRunning, reset }
}

export default useActivityTimer
