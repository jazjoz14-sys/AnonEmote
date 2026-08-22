import React from 'react'

/**
 * AlertBanner — Dashboard alert notification displayed when pending reports or
 * crisis detections require attention.
 *
 * Two visual variants:
 * - 'reports': amber/yellow tint, shows pending count + clickable "Review →" link
 * - 'crisis': violet/purple tint, shows crisis detection count
 *
 * Renders nothing when count is 0.
 *
 * @param {{
 *   variant: 'reports' | 'crisis',
 *   count: number,
 *   onNavigate?: () => void
 * }} props
 */
export default function AlertBanner({ variant, count, onNavigate }) {
  // Don't render anything if there's nothing to alert about
  if (count === 0) return null

  /** Variant-specific styling and content configuration */
  const variants = {
    reports: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      textColor: 'text-amber-200',
      accentColor: 'text-amber-400',
      icon: '⚑',
      message: `${count} pending report${count !== 1 ? 's' : ''}`,
      showLink: true,
    },
    crisis: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      textColor: 'text-violet-200',
      accentColor: 'text-violet-400',
      icon: '🚨',
      message: `${count} crisis detection${count !== 1 ? 's' : ''}`,
      showLink: false,
    },
  }

  const config = variants[variant]

  return (
    <div
      className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${config.bg} ${config.border}`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {config.icon}
        </span>
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.message}
        </span>
      </div>

      {config.showLink && onNavigate && (
        <button
          onClick={onNavigate}
          className={`text-sm font-medium ${config.accentColor} hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 focus:ring-offset-transparent rounded px-1`}
        >
          Review →
        </button>
      )}
    </div>
  )
}
