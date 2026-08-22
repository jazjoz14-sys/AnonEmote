import React from 'react'
import { useIsSmallScreen } from '../../lib/device'

/**
 * Textarea primitive with design-system styling.
 *
 * Same base styling as Input but with resize-none.
 * Default 3 rows, max-height 25dvh on mobile.
 *
 * @param {Object} props
 * @param {string} [props.error] - Error message to display below
 * @param {boolean} [props.disabled]
 * @param {number} [props.rows] - Visible rows (default 3)
 * @param {string} [props.className] - Additional classes
 * @param {React.Ref} ref - Forwarded ref
 */
const Textarea = React.forwardRef(function Textarea(
  { error, disabled = false, rows = 3, className = '', ...rest },
  ref
) {
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
    'focus:border-white/25',
    'focus:outline-none',
    'transition-colors',
    'duration-200',
    'resize-none',
    'w-full',
  ]

  if (isSmall) {
    baseClasses.push('min-h-[44px]', 'max-h-[25dvh]')
  }

  if (disabled) {
    baseClasses.push('opacity-50', 'cursor-not-allowed')
  }

  return (
    <div>
      <textarea
        ref={ref}
        rows={rows}
        disabled={disabled}
        className={`${baseClasses.join(' ')} ${className}`}
        {...rest}
      />
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
})

export default Textarea
