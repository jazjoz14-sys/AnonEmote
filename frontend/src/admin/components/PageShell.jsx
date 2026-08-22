import React, { useState, useEffect, useRef } from 'react'

/**
 * PageShell — Section page container with sticky header, toolbar slot, and loading states.
 *
 * Provides 3 vertical regions:
 *   1. Sticky header with page title (20px, weight 600)
 *   2. Optional toolbar area (collapses to zero height when empty)
 *   3. Scrollable content area, max-width 1200px, centered
 *
 * Loading behaviour:
 *   - loading=true → 3 pulsing skeleton blocks
 *   - After loadingTimeout ms still loading → error message + retry button
 *
 * @param {{
 *   title: string,
 *   toolbar?: React.ReactNode,
 *   loading?: boolean,
 *   loadingTimeout?: number,
 *   onRetry?: () => void,
 *   children: React.ReactNode
 * }} props
 */
export default function PageShell({
  title,
  toolbar,
  loading = false,
  loadingTimeout = 10000,
  onRetry,
  children,
}) {
  const [timedOut, setTimedOut] = useState(false)
  const timerRef = useRef(null)

  // Start/reset timeout timer when loading state changes
  useEffect(() => {
    if (loading) {
      setTimedOut(false)
      timerRef.current = setTimeout(() => {
        setTimedOut(true)
      }, loadingTimeout)
    } else {
      setTimedOut(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [loading, loadingTimeout])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sticky header */}
      <header
        className="sticky top-0 z-10 bg-[#0a0a1a]/95 backdrop-blur-sm border-b border-white/5 px-4 sm:px-6 py-4"
      >
        <h1 className="text-[20px] font-semibold text-slate-100">
          {title}
        </h1>
      </header>

      {/* Optional toolbar — collapses to zero height when empty */}
      {toolbar && (
        <div className="px-4 sm:px-6 py-2 border-b border-white/5">
          {toolbar}
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-[1200px] mx-auto">
          {loading ? (
            timedOut ? (
              /* Timeout error state */
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-slate-400 text-sm mb-4">
                  Loading timed out. The data could not be fetched.
                </p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="px-4 py-2 rounded-lg bg-violet-500 hover:bg-violet-600 text-white text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a1a]"
                  >
                    Retry
                  </button>
                )}
              </div>
            ) : (
              /* Skeleton loading state — 3 pulsing blocks */
              <div className="space-y-4">
                <div className="h-24 rounded-2xl bg-white/[0.06] animate-pulse" />
                <div className="h-32 rounded-2xl bg-white/[0.06] animate-pulse" />
                <div className="h-20 rounded-2xl bg-white/[0.06] animate-pulse" />
              </div>
            )
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  )
}
