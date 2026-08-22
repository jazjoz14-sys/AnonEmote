import { useEffect } from 'react'
import Button from './Button'
import FocusTrap from './FocusTrap'
import { Z } from '../../design/tokens'

/**
 * ConfirmDialog — A centered confirmation modal for destructive actions.
 *
 * Used by PostModal and DoodleModal to confirm discarding unsaved content.
 * Renders a fixed overlay with semi-transparent backdrop. Backdrop click
 * does NOT dismiss — the user must make an explicit choice.
 *
 * Uses FocusTrap to contain keyboard focus within the dialog, auto-focusing
 * the cancel (safe) button. Uses Button primitives for consistent styling.
 *
 * Props:
 * - open (boolean) — whether the dialog is visible
 * - onConfirm (function) — called when the destructive action is confirmed (e.g., Discard)
 * - onCancel (function) — called when the user wants to keep working
 * - confirmLabel (string) — label for the destructive button (default: "Discard")
 * - cancelLabel (string) — label for the safe button (default: "Keep Writing")
 * - message (string) — the question/message displayed to the user
 * - destructive (boolean) — if true, confirm uses destructive variant; otherwise primary
 *
 * Requirements: 16.2, 16.3, 16.7, 16.8
 */
export default function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  confirmLabel = 'Discard',
  cancelLabel = 'Keep Writing',
  message = 'Discard your draft?',
  destructive = true,
}) {
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
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: Z.CONFIRM_DIALOG }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-message"
    >
      {/* Backdrop — clicking does NOT close (user must choose explicitly) */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dialog card with FocusTrap — auto-focuses the cancel button */}
      <FocusTrap active={open} initialFocus="[data-confirm-cancel]">
        <div className="relative z-10 w-full max-w-sm mx-4 rounded-xl border border-white/[0.08]
                        bg-[#0d0d2b] shadow-2xl p-6 flex flex-col gap-5
                        animate-pop-in">
          {/* Message */}
          <p
            id="confirm-dialog-message"
            className="text-sm text-slate-300 text-center leading-relaxed"
          >
            {message}
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            {/* Cancel (safe action) — auto-focused via FocusTrap initialFocus */}
            <Button
              variant="secondary"
              data-confirm-cancel
              onClick={onCancel}
              fullWidth
            >
              {cancelLabel}
            </Button>

            {/* Confirm (destructive/primary action) */}
            <Button
              variant={destructive ? 'destructive' : 'primary'}
              onClick={onConfirm}
              fullWidth
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </FocusTrap>
    </div>
  )
}
