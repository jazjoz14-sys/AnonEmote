import React from 'react'
import { useIsSmallScreen } from '../../lib/device'

/**
 * Text input primitive with design-system styling.
 *
 * Applies cosmic monochrome + violet accent design tokens:
 * - Transparent dark background with subtle border
 * - Focus transition to brighter border within 200ms
 * - Error message rendered below the input when provided
 * - 44px minimum height on mobile for touch targets
 *
 * @param {Object} props
 * @param {string} [props.error] - Error message to display below the input
 * @param {boolean} [props.disabled] - Disables the input with reduced opacity
 * @param {string} [props.className] - Additional classes to merge
 * @param {React.Ref} ref - Forwarded ref to the input element
 */
const Input = React.forwardRef(function Input({ error, disabled, className = '', ...rest }, ref) {
  const isSmall = useIsSmallScreen()

  const baseClasses = [
    'bg-white/[0.03]',
    'border',
    'border-white/[0.1]',
    'rounded-sm',
    'px-4',
    'py-3',
    'text-sm',
    'text-white',
    'placeholder-slate-600',
    'w-full',
    'transition-colors',
    'duration-200',
  ]

  // Focus state (only when not disabled)
  const focusClasses = disabled
    ? []
    : ['focus:border-white/25', 'focus:outline-none']

  // Disabled state
  const disabledClasses = disabled
    ? ['opacity-50', 'cursor-not-allowed']
    : []

  // Mobile touch target
  const mobileClasses = isSmall ? ['min-h-[44px]'] : []

  const inputClassName = [
    ...baseClasses,
    ...focusClasses,
    ...disabledClasses,
    ...mobileClasses,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div>
      <input
        ref={ref}
        disabled={disabled}
        className={inputClassName}
        {...rest}
      />
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
})

export default Input
