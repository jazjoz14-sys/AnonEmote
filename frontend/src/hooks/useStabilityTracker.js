/**
 * WebGL context loss stability tracker hook.
 *
 * Watches for graphics settings changes and monitors WebGL context stability.
 * If a context loss occurs within 10 seconds of a settings change, the system
 * automatically reverts to the last known stable configuration and notifies the user.
 *
 * Must be rendered inside the R3F Canvas — it accesses `gl.domElement` via `useThree()`
 * to listen for `webglcontextlost` events on the actual canvas element.
 *
 * Behavior:
 * - On any settings change (lastChangeTimestamp updates): starts a 10-second timer
 * - If 10s pass without context loss: promotes current config to "stable"
 * - If context loss occurs before 10s: reverts to lastStableConfig, persists, shows toast
 *
 * @module useStabilityTracker
 * @see Requirements 6.5, 7.5, 7.6
 */

import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import useAppStore from '../store/useAppStore'

/** Duration (ms) a config must survive without context loss to be considered stable. */
const STABILITY_WINDOW_MS = 10_000

/**
 * Stability tracker hook — side-effect only, returns nothing.
 *
 * Listens for WebGL context loss events on the R3F canvas element and
 * coordinates with the graphics store to implement the auto-revert safety mechanism.
 *
 * @returns {void}
 */
export function useStabilityTracker() {
  const { gl } = useThree()
  const lastChangeTimestamp = useAppStore((s) => s.lastChangeTimestamp)
  const stabilityTimerRef = useRef(null)

  // ── Context loss listener ─────────────────────────────────────────────────
  useEffect(() => {
    const canvas = gl.domElement
    if (!canvas) return

    /**
     * Handle WebGL context loss. If it happens within the stability window
     * after a settings change, revert to the last stable config.
     * @param {WebGLContextEvent} event
     */
    function handleContextLost(event) {
      // Clear the pending promotion timer — we know this config is unstable
      if (stabilityTimerRef.current !== null) {
        clearTimeout(stabilityTimerRef.current)
        stabilityTimerRef.current = null
      }

      const { lastChangeTimestamp: ts, lastStableConfig, revertToStable, showToast } =
        useAppStore.getState()

      // Only auto-revert if a settings change happened recently (within 10s)
      // and we have a stable config to revert to
      if (ts !== null && lastStableConfig !== null) {
        const elapsed = Date.now() - ts
        if (elapsed < STABILITY_WINDOW_MS) {
          revertToStable()
          showToast({
            message: 'Settings reverted due to a graphics error',
            type: 'warning',
          })
        }
      }
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)

    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost)
    }
  }, [gl])

  // ── Stability promotion timer ─────────────────────────────────────────────
  // Whenever lastChangeTimestamp changes (indicating a new settings change),
  // restart the 10-second timer. If it completes without context loss,
  // promote the current config to "last known stable".
  useEffect(() => {
    if (lastChangeTimestamp === null) return

    // Clear any existing timer from a previous change
    if (stabilityTimerRef.current !== null) {
      clearTimeout(stabilityTimerRef.current)
    }

    // Start a fresh 10-second timer
    stabilityTimerRef.current = setTimeout(() => {
      useAppStore.getState().promoteToStable()
      stabilityTimerRef.current = null
    }, STABILITY_WINDOW_MS)

    // Cleanup on unmount or before next effect run
    return () => {
      if (stabilityTimerRef.current !== null) {
        clearTimeout(stabilityTimerRef.current)
        stabilityTimerRef.current = null
      }
    }
  }, [lastChangeTimestamp])
}
