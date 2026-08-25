import { useEffect, useRef, useCallback } from 'react'

/**
 * BreathingMoment — a 3-second calming entrance animation overlay.
 *
 * Plays a pulsing glow (opacity cycling 0.4–0.8) with a reflective prompt
 * that fades in within the first 1 second. The animation naturally slows
 * the user's pace before the MoodSpace becomes interactive.
 *
 * Behavior:
 * - 3-second total duration with CSS keyframe pulse animation
 * - Reflective prompt fades in within the first 1s
 * - Skippable on any pointer event (tap, click) or keypress
 * - Calls `onComplete` when the timer ends or the user skips
 * - Replays on every mount (no session caching / "already seen" logic)
 * - Respects `prefers-reduced-motion`: skips pulse, shows prompt instantly,
 *   still waits 3s (or allows skip)
 *
 * @param {Object} props
 * @param {() => void} props.onComplete - Called when animation finishes or is skipped
 */
export default function BreathingMoment({ onComplete }) {
  const timerRef = useRef(null)
  const completedRef = useRef(false)

  /**
   * Fires onComplete exactly once, cleans up timer.
   * The ref guard prevents double-invocation from overlapping
   * timeout + user-skip scenarios.
   */
  const finish = useCallback(() => {
    if (completedRef.current) return
    completedRef.current = true
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    onComplete()
  }, [onComplete])

  useEffect(() => {
    // Start 3-second auto-completion timer
    timerRef.current = setTimeout(finish, 3000)

    // Skip handlers — any pointer or key event ends the breathing early
    const handleSkip = () => finish()

    document.addEventListener('pointerdown', handleSkip)
    document.addEventListener('keydown', handleSkip)

    return () => {
      // Cleanup on unmount
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      document.removeEventListener('pointerdown', handleSkip)
      document.removeEventListener('keydown', handleSkip)
    }
  }, [finish])

  // Detect reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center"
      aria-label="Breathing moment — tap or press any key to skip"
      role="status"
    >
      {/* Pulsing glow backdrop */}
      <div
        className={`absolute inset-0 ${
          prefersReducedMotion ? 'opacity-60' : 'animate-breathing-pulse'
        }`}
        aria-hidden="true"
      />

      {/* Reflective prompt text */}
      <p
        className={`relative text-white/70 text-sm font-semibold text-center px-6 select-none ${
          prefersReducedMotion ? 'opacity-100' : 'animate-prompt-fade'
        }`}
      >
        Take a breath. How does right now feel?
      </p>

      {/* CSS keyframe definitions — scoped via a <style> tag */}
      <style>{`
        @keyframes breathing-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }

        @keyframes prompt-fade {
          0% { opacity: 0; }
          33.3% { opacity: 1; }
          100% { opacity: 1; }
        }

        .animate-breathing-pulse {
          animation: breathing-pulse 1.5s ease-in-out infinite;
        }

        .animate-prompt-fade {
          animation: prompt-fade 1s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
