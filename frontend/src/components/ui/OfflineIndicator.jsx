import { useEffect, useState } from 'react'
import useAppStore from '../../store/useAppStore'

/**
 * Fixed top banner shown when the app detects offline state.
 * Positioned below the HUD (which is max 40px + safe-area-inset-top on mobile).
 * Auto-hides with a slide/fade transition when connectivity returns.
 */
export default function OfflineIndicator() {
  const isOffline = useAppStore((s) => s.isOffline)

  // Local visible state drives the CSS transition.
  // We keep the element mounted briefly after going back online
  // so the exit animation can play before unmounting.
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    if (isOffline) {
      setMounted(true)
      // Small delay so the browser can paint the element before animating in
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      // Trigger exit animation
      setVisible(false)
      // Unmount after transition completes
      const timer = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOffline])

  if (!mounted) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'fixed left-0 right-0 z-[25] flex items-center justify-center px-4 py-2',
        'bg-gray-900/90 backdrop-blur-sm border-b border-gray-700/50',
        'text-gray-200 text-xs sm:text-sm text-center',
        'transition-all duration-300 ease-in-out',
        visible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 -translate-y-2',
      ].join(' ')}
      style={{
        top: 'calc(40px + env(safe-area-inset-top, 0px))',
      }}
    >
      <svg
        className="w-4 h-4 mr-2 flex-shrink-0 text-yellow-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072M12 12h.01"
        />
      </svg>
      <span>You're offline. New content will load when connectivity returns.</span>
    </div>
  )
}
