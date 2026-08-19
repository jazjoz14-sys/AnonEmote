import { useEffect, useRef } from 'react'

/**
 * ConfirmDialog — A centered confirmation modal for destructive actions.
 *
 * Used by PostModal and DoodleModal to confirm discarding unsaved content.
 * Renders a fixed overlay with semi-transparent backdrop. Backdrop click
 * does NOT dismiss — the user must make an explicit choice.
 *
 * Props:
 * - open (boolean) — whether the dialog is visible
 * - onConfirm (function) — called when the destructive action is confirmed (e.g., Discard)
 * - onCancel (function) — called when the user wants to keep working
 * - confirmLabel (string) — label for the destructive button (default: "Discard")
 * - cancelLabel (string) — label for the safe button (default: "Keep Writing")
 * - message (string) — the question/message displayed to the user
 *
 * Requirements: 7.1, 7.2, 7.4, 7.5
 */
export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  confirmLabel = 'Discard',
  cancelLabel = 'Keep Writing',
  message = 'Discard your draft?',
}) {
  const cancelRef = useRef(null)

  // Auto-focus the cancel button when dialog opens (safer default)
  useEffect(() => {
    if (open && cancelRef.current) {
      cancelRef.current.focus()
    }
  }, [open])

  // Trap Escape key to trigger cancel (explicit choice via keyboard)
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
    >
      {/* Backdrop — clicking does NOT close (user must choose explicitly) */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Dialog card */}
      <div className="relative z-10 w-full max-w-sm mx-4 rounded-lg border border-white/10
                      bg-slate-900/95 backdrop-blur-md shadow-2xl p-6 flex flex-col gap-5
                      animate-pop-in">
        {/* Message */}
        <p
          id="confirm-dialog-message"
          className="text-sm text-slate-200 text-center leading-relaxed"
        >
          {message}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          {/* Cancel (safe action) — auto-focused */}
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-md text-xs tracking-[0.1em] uppercase
                       text-slate-300 border border-white/15
                       hover:text-white hover:border-white/30
                       focus:outline-none focus:ring-2 focus:ring-white/20
                       transition-all duration-150"
          >
            {cancelLabel}
          </button>

          {/* Confirm (destructive action) */}
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-md text-xs tracking-[0.1em] uppercase font-medium
                       text-white bg-red-600/80 border border-red-500/40
                       hover:bg-red-500 hover:border-red-400/60
                       focus:outline-none focus:ring-2 focus:ring-red-400/40
                       transition-all duration-150"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
