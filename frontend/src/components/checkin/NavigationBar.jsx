/**
 * NavigationBar — Always-visible skip + back affordances for the check-in flow.
 *
 * Renders two keyboard-accessible buttons:
 *  - "Back" returns the user to the avatar screen (calls onBack)
 *  - "Skip" skips the check-in entirely (calls onSkip)
 *
 * Both buttons enforce 44×44px minimum touch targets (WCAG 2.5.5) and provide
 * a visible 2px violet-500/60 focus ring for keyboard navigation (WCAG 2.4.7).
 *
 * Positioned at the bottom of the screen via fixed/absolute layout so it
 * remains visible without scrolling on viewports ≥ 360×640.
 *
 * @param {Object} props
 * @param {() => void} props.onSkip - Skip check-in entirely, enter star system
 * @param {() => void} props.onBack - Return to avatar screen
 */
export default function NavigationBar({ onSkip, onBack }) {
  return (
    <nav
      className="flex items-center justify-between w-full px-4 py-3"
      aria-label="Check-in navigation"
    >
      {/* Back to avatar button */}
      <button
        type="button"
        onClick={onBack}
        className={[
          'min-w-[44px] min-h-[44px] px-3 py-2',
          'flex items-center justify-center',
          'text-sm text-white/60 hover:text-white/80',
          'rounded-lg border border-white/[0.08] bg-transparent',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-violet-500/60',
        ].join(' ')}
        aria-label="Back to avatar"
      >
        <span aria-hidden="true" className="mr-1">←</span>
        <span>Back</span>
      </button>

      {/* Skip button */}
      <button
        type="button"
        onClick={onSkip}
        className={[
          'min-w-[44px] min-h-[44px] px-3 py-2',
          'flex items-center justify-center',
          'text-sm text-white/60 hover:text-white/80',
          'rounded-lg border border-white/[0.08] bg-transparent',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-violet-500/60',
        ].join(' ')}
        aria-label="Skip check-in"
      >
        <span>Skip</span>
      </button>
    </nav>
  )
}
