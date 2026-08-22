/**
 * Card — Surface primitive for the AnonEmote design system.
 *
 * Renders a styled container element with consistent card variants
 * following the cosmic monochrome + violet accent theme.
 *
 * Variants: default, interactive, elevated, selected
 * - default: Transparent with subtle border
 * - interactive: Adds hover effect and cursor-pointer (for clickable cards)
 * - elevated: Solid dark background with shadow (for modals, sheets)
 * - selected: Violet accent border with tinted background
 *
 * The `selected` prop can override any variant to apply the selected styling,
 * making it easy to combine interactive behavior with selection state.
 *
 * @param {Object} props
 * @param {'default'|'interactive'|'elevated'|'selected'} [props.variant='default'] - Visual style variant
 * @param {boolean} [props.selected=false] - Overrides border/bg with violet accent (selection state)
 * @param {string} [props.className=''] - Additional Tailwind classes to merge
 * @param {React.ReactNode} props.children - Card content
 * @param {Object} props.rest - All additional props forwarded to the container element
 */

/** Tailwind class strings for each card variant. */
const VARIANT_CLASSES = {
  default: 'bg-transparent border border-white/[0.08] rounded-xl',
  interactive:
    'bg-transparent border border-white/[0.08] rounded-xl hover:border-white/20 transition-all duration-200 cursor-pointer',
  elevated: 'bg-[#0d0d2b] border border-white/[0.08] shadow-xl rounded-xl',
  selected: 'border-violet-500/50 bg-violet-500/10 rounded-xl',
}

/** Selected state classes — applied when the `selected` prop is true, overriding the variant border/bg. */
const SELECTED_CLASSES = 'border-violet-500/50 bg-violet-500/10'

/** Focus-visible ring for keyboard navigation on interactive cards (WCAG 2.4.7). */
const FOCUS_CLASSES =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70'

export default function Card({
  variant = 'default',
  selected = false,
  className = '',
  children,
  ...rest
}) {
  // Resolve the variant classes (fall back to default if invalid variant passed)
  const variantClasses = VARIANT_CLASSES[variant] || VARIANT_CLASSES.default

  // Build the class list
  const classes = [
    // Variant styling (provides base border, bg, radius, and interaction styles)
    variantClasses,
    // Selected state override — replaces variant border/bg with violet accent
    selected ? SELECTED_CLASSES : '',
    // Focus-visible ring only on interactive variant (cards that receive focus)
    variant === 'interactive' ? FOCUS_CLASSES : '',
    // User-supplied overrides
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  )
}
