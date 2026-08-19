import { useEffect } from 'react'
import useAppStore from '../../store/useAppStore'

/**
 * Toast — Global toast notification container.
 *
 * Reads the `toasts` array from Zustand and renders each notification
 * in a fixed-position container (top-right). Each toast auto-dismisses
 * after its `duration` (default 3000ms).
 *
 * Supports two types:
 * - 'success' → green left border accent
 * - 'error'   → red left border accent
 *
 * Styling follows the cosmic dark theme: dark cards, subtle borders,
 * high z-index to appear above all content.
 *
 * Rendered once in App.jsx as a global container (integration in task 9.1).
 */
export default function Toast() {
  const toasts = useAppStore((s) => s.toasts)

  return (
    <div
      className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}

/**
 * ToastItem — Individual toast notification card.
 * Handles its own auto-dismiss timer via useEffect.
 */
function ToastItem({ toast }) {
  const dismissToast = useAppStore((s) => s.dismissToast)
  const { id, message, type = 'success', duration = 3000 } = toast

  useEffect(() => {
    const timer = setTimeout(() => {
      dismissToast(id)
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, dismissToast])

  const borderColor = type === 'error'
    ? 'border-l-red-500'
    : 'border-l-emerald-400'

  const iconColor = type === 'error'
    ? 'text-red-400'
    : 'text-emerald-400'

  const icon = type === 'error' ? '✕' : '✓'

  return (
    <div
      className={[
        'pointer-events-auto',
        'flex items-center gap-3 px-4 py-3 min-w-[260px] max-w-[360px]',
        'bg-slate-900/95 backdrop-blur-sm border border-white/10 border-l-4',
        borderColor,
        'rounded-lg shadow-lg shadow-black/30',
        'animate-slide-in-right',
        'text-sm text-slate-200',
      ].join(' ')}
      role="alert"
    >
      <span className={`flex-shrink-0 font-bold text-base ${iconColor}`} aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1">{message}</span>
      <button
        onClick={() => dismissToast(id)}
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition-colors ml-2"
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  )
}
