/**
 * Button — Unified button primitive for the AnonEmote design system.
 *
 * Renders a styled <button> element with consistent variants, states,
 * and responsive touch targets across the application.
 *
 * Variants: primary, secondary, ghost, destructive, cta
 * States: default, hover, focus-visible, disabled, loading
 *
 * @param {Object} props
 * @param {'primary'|'secondary'|'ghost'|'destructive'|'cta'} [props.variant='primary'] - Visual style variant
 * @param {boolean} [props.loading=false] - Shows inline spinner, disables interaction
 * @param {boolean} [props.disabled=false] - Disables interaction with reduced opacity
 * @param {boolean} [props.fullWidth=false] - Stretches button to 100% width
 * @param {string} [props.className=''] - Additional Tailwind classes to merge
 * @param {React.ReactNode} props.children - Button content
 * @param {Object} props.rest - All additional props forwarded to the <button> element
 */

import { useIsSmallScreen } from '../../lib/device'

/** Tailwind class strings for each button variant. */
const VARIANT_CLASSES = {
  primary:
    'border border-white/30 text-white rounded-sm uppercase tracking-[0.15em] text-xs px-4 py-2 hover:bg-white hover:text-[#050510] transition-all duration-200',
  secondary:
    'border border-white/[0.12] text-slate-300 rounded-sm uppercase tracking-[0.15em] text-xs px-4 py-2 hover:text-white hover:border-white/25 transition-all duration-200',
  ghost:
    'text-slate-400 hover:text-white text-xs px-2 py-1 transition-colors duration-200',
  destructive:
    'bg-gradient-to-r from-red-700 to-rose-700 text-white rounded-xl px-4 py-2 hover:from-red-600 hover:to-rose-600 transition-all duration-200',
  cta:
    'bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium px-5 py-2.5 transition-colors duration-200',
}

/** Focus-visible ring applied to all variants for keyboard navigation (WCAG 2.4.7). */
const FOCUS_CLASSES =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70'

/** Disabled state — reduces opacity and prevents interaction. */
const DISABLED_CLASSES = 'opacity-40 cursor-not-allowed pointer-events-none'

/** Loading state — slightly reduced opacity, prevents interaction. */
const LOADING_CLASSES = 'opacity-70 pointer-events-none'

/**
 * Small inline spinner SVG shown during loading state.
 * Uses CSS animation for smooth rotation.
 */
function Spinner() {
  return (
    <svg
      className="inline-block w-3.5 h-3.5 animate-spin"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="2"
      />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Button({
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  className = '',
  children,
  ...rest
}) {
  const isSmall = useIsSmallScreen()

  // Resolve the variant classes (fall back to primary if invalid variant passed)
  const variantClasses = VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary

  // Build the class list
  const classes = [
    // Base layout
    'inline-flex items-center justify-center gap-2',
    // Variant styling
    variantClasses,
    // Focus-visible ring (always applied, only visible on keyboard focus)
    FOCUS_CLASSES,
    // State overrides
    disabled ? DISABLED_CLASSES : '',
    !disabled && loading ? LOADING_CLASSES : '',
    // Full width
    fullWidth ? 'w-full' : '',
    // Mobile touch target — 44px minimum height on viewports < 768px
    isSmall ? 'min-h-[44px]' : '',
    // User-supplied overrides
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
