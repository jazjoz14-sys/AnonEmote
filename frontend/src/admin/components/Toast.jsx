import React, { useEffect, useState } from 'react'

/**
 * Toast — Temporary notification component.
 *
 * Displays a brief message fixed to the bottom-right corner of the viewport.
 * Used for batch action results and lexicon save confirmation.
 * Auto-dismisses after 3 seconds or can be manually closed via the × button.
 *
 * @param {{
 *   message: string,
 *   variant: 'success' | 'error',
 *   onDismiss: () => void
 * }} props
 */
export default function Toast({ message, variant = 'success', onDismiss }) {
  const [visible, setVisible] = useState(false)

  // Trigger entrance animation on mount
  useEffect(() => {
    // Small delay so the initial render is at translate-y, then we animate in
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      // Wait for exit animation before calling onDismiss
      setTimeout(onDismiss, 200)
    }, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  const variantClasses = variant === 'error'
    ? 'bg-red-500/90 text-white'
    : 'bg-emerald-500/90 text-white'

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'fixed bottom-6 right-6 z-[9999]',
        'rounded-xl px-4 py-3 shadow-lg',
        'flex items-center gap-3',
        'transition-all duration-200 ease-out',
        variantClasses,
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2',
      ].join(' ')}
    >
      {/* Message */}
      <span className="text-sm font-medium">{message}</span>

      {/* Close button */}
      <button
        onClick={() => {
          setVisible(false)
          setTimeout(onDismiss, 200)
        }}
        className="ml-1 text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white rounded"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}
