import { useEffect, useRef } from 'react'

/**
 * EvaluationNotification — Non-blocking floating toast that invites
 * the user to provide feedback about their AnonEmote experience.
 *
 * Positioned bottom-right, auto-hides after 30s if not interacted with.
 * Uses pointer-events-none on the wrapper so only the card captures clicks,
 * allowing the 3D canvas beneath to remain interactive.
 *
 * @param {Object} props
 * @param {boolean} props.visible - Whether to show the notification
 * @param {() => void} props.onAccept - "Share Feedback" button handler
 * @param {() => void} props.onDismiss - Dismiss (×) button handler
 */
export default function EvaluationNotification({ visible, onAccept, onDismiss }) {
  const timerRef = useRef(null)

  // Auto-dismiss after 30 seconds of no interaction
  useEffect(() => {
    if (!visible) {
      clearTimeout(timerRef.current)
      return
    }

    timerRef.current = setTimeout(() => {
      handleDismiss()
    }, 30000)

    return () => clearTimeout(timerRef.current)
  }, [visible]) // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Handles both manual and auto-dismiss.
   * Persists dismissal to sessionStorage so the notification
   * never reappears in the same session.
   */
  function handleDismiss() {
    try {
      sessionStorage.setItem('anonemote_eval_dismissed', 'true')
    } catch {
      // sessionStorage unavailable (private browsing edge case) — degrade gracefully
    }
    onDismiss()
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none">
      <div
        className={[
          'pointer-events-auto',
          'flex flex-col gap-3 p-4 w-[300px] max-w-[calc(100vw-2rem)]',
          'bg-slate-900/95 backdrop-blur-sm border border-white/10',
          'rounded-lg shadow-lg shadow-black/30',
          'animate-slide-in-right',
        ].join(' ')}
        role="alert"
        aria-live="polite"
      >
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-500 hover:text-slate-300 transition-colors text-lg leading-none p-1"
          aria-label="Dismiss feedback invitation"
        >
          ×
        </button>

        {/* Invitation text (<100 chars) */}
        <p className="text-sm text-slate-200 pr-6">
          How's your journey through the stars? We'd love your feedback.
        </p>

        {/* Share Feedback action */}
        <button
          onClick={onAccept}
          className={[
            'self-start px-4 py-2 text-xs font-medium uppercase tracking-wider',
            'bg-violet-600 hover:bg-violet-500 text-white rounded-lg',
            'transition-colors duration-200',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70',
          ].join(' ')}
        >
          Share Feedback
        </button>
      </div>
    </div>
  )
}
