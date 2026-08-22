import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * usePolling — interval-based data refresh hook.
 *
 * Calls the provided fetch function immediately on mount, then repeats at
 * the specified interval. If a fetch fails, the error is stored but previous
 * data is preserved (stale-while-revalidate pattern). The interval is cleaned
 * up on unmount or when dependencies change.
 *
 * Used in DashboardPage to auto-refresh stats every 30 seconds:
 * ```js
 * const { data: stats, loading, error, refresh } = usePolling(fetchStats, 30000)
 * ```
 *
 * @param {() => Promise<any>} fetchFn - Async function that returns data
 * @param {number} intervalMs - Polling interval in milliseconds
 * @returns {{ data: any, loading: boolean, error: string|null, refresh: () => void }}
 */
export default function usePolling(fetchFn, intervalMs) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Keep refs so the interval callback always uses the latest fetchFn
  // without needing to restart the interval when fetchFn identity changes.
  const fetchFnRef = useRef(fetchFn)
  const intervalRef = useRef(null)

  // Update the ref whenever fetchFn changes
  useEffect(() => {
    fetchFnRef.current = fetchFn
  }, [fetchFn])

  /**
   * Execute the fetch function and update state accordingly.
   * On success: updates data and clears error.
   * On failure: sets error but keeps previous data intact.
   */
  const executeFetch = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchFnRef.current()
      setData(result)
      setError(null)
    } catch (err) {
      // Preserve stale data — only update the error state
      setError(err.message || 'Fetch failed')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Manual refresh — triggers an immediate fetch outside the interval cycle.
   * Useful for user-initiated "retry" actions.
   */
  const refresh = useCallback(() => {
    executeFetch()
  }, [executeFetch])

  // Set up the polling cycle: immediate fetch + interval
  useEffect(() => {
    // Fetch immediately on mount
    executeFetch()

    // Set up the repeating interval
    intervalRef.current = setInterval(executeFetch, intervalMs)

    // Clean up on unmount or when intervalMs changes
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [intervalMs, executeFetch])

  return { data, loading, error, refresh }
}
