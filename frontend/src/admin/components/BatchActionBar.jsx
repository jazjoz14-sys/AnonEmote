import React, { useState, useEffect } from 'react'

/**
 * BatchActionBar — Fixed-bottom bar showing batch actions when items are selected.
 *
 * Appears with a slide-up animation when one or more report cards are selected.
 * Provides Dismiss, Hide, and Delete bulk operations. Delete requires explicit
 * confirmation via a dialog overlay before executing.
 *
 * ARIA live region announces selection count to screen readers when the bar appears.
 *
 * @param {{
 *   selectedCount: number,
 *   onDismiss: () => void,
 *   onHide: () => void,
 *   onDelete: () => void,
 *   disabled: boolean
 * }} props
 */
export default function BatchActionBar({ selectedCount, onDismiss, onHide, onDelete, disabled = false }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [visible, setVisible] = useState(false)

  // Trigger slide-up entrance animation when selectedCount becomes > 0
  useEffect(() => {
    if (selectedCount > 0) {
      // Small delay for the initial render so CSS transition kicks in
      const frame = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(frame)
    } else {
      setVisible(false)
      setConfirmingDelete(false)
    }
  }, [selectedCount])

  /** Handle delete button click — opens confirmation dialog */
  const handleDeleteClick = () => {
    setConfirmingDelete(true)
  }

  /** Confirm deletion and execute the onDelete callback */
  const handleConfirmDelete = () => {
    setConfirmingDelete(false)
    onDelete()
  }

  /** Cancel the delete confirmation */
  const handleCancelDelete = () => {
    setConfirmingDelete(false)
  }

  return (
    <>
      {/* ARIA live region — always in DOM so announcements work correctly */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {selectedCount > 0 && `${selectedCount} reports selected. Batch actions available.`}
      </div>

      {/* Floating action bar — only renders when items are selected */}
      {selectedCount > 0 && (
        <div
          className={[
            'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9990]',
            'rounded-2xl px-6 py-3',
            'bg-white/[0.06] backdrop-blur-xl border border-white/[0.05]',
            'shadow-2xl',
            'flex items-center gap-4',
            'transition-all duration-300 ease-out',
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
          ].join(' ')}
        >
          {/* Selection count label */}
          <span className="text-sm font-medium text-slate-200 whitespace-nowrap">
            {selectedCount} selected
          </span>

          {/* Divider */}
          <div className="w-px h-5 bg-white/10" aria-hidden="true" />

          {/* Dismiss button */}
          <button
            onClick={onDismiss}
            disabled={disabled}
            className="text-sm font-medium px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 focus:ring-offset-transparent"
          >
            Dismiss
          </button>

          {/* Hide button */}
          <button
            onClick={onHide}
            disabled={disabled}
            className="text-sm font-medium px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1 focus:ring-offset-transparent"
          >
            Hide
          </button>

          {/* Delete button — triggers confirmation dialog */}
          <button
            onClick={handleDeleteClick}
            disabled={disabled}
            className="text-sm font-medium px-3 py-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-transparent"
          >
            Delete
          </button>
        </div>
      )}

      {/* Delete confirmation dialog overlay */}
      {confirmingDelete && (
        <div
          className="fixed inset-0 z-[9995] flex items-center justify-center bg-black/50"
          onClick={handleCancelDelete}
          role="presentation"
        >
          <div
            className="rounded-2xl bg-[#1a1a2e] border border-white/10 p-6 max-w-sm w-full mx-4 shadow-2xl"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="batch-delete-title"
            aria-describedby="batch-delete-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="batch-delete-title" className="text-lg font-semibold text-slate-100 mb-2">
              Confirm deletion
            </h3>
            <p id="batch-delete-desc" className="text-sm text-slate-400 mb-6">
              This will permanently delete {selectedCount} selected report{selectedCount !== 1 ? 's' : ''} and their associated posts. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                className="text-sm font-medium px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-red-500/90 text-white hover:bg-red-500 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete {selectedCount} item{selectedCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
