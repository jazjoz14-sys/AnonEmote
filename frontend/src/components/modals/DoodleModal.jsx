import { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import { useIsSmallScreen, useViewportSize } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'
import { Z } from '../../design/tokens'
import DrawingCanvas from '../ui/DrawingCanvas'
import ConfirmDialog from '../ui/ConfirmDialog'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'

/**
 * DoodleModal — canvas-based post composer for the Doodle Drift planet.
 *
 * Instead of a textarea, users get a freeform drawing surface. The drawing is
 * stored as a base64 data URL in the `drawing` column.
 *
 * AI moderation cannot scan images, so drawings are not auto-moderated. The
 * community reports path handles inappropriate content — same thresholds and
 * admin review workflow as text posts.
 *
 * Layout modes (handled by ModalShell):
 *   - Mobile portrait: bottom sheet, canvas = min(vw-48, 280) square
 *   - Landscape mobile: centered card (90vw, 85dvh), canvas fits height-120px
 *   - Desktop: draggable panel, canvas 340×340, panel width = canvas+40px
 *
 * Requirements: 11.1–11.8
 */
export default function DoodleModal() {
  const { selectedPlanet, setPostModalOpen, sessionId, addPost } = useAppStore()
  const isMobile = useIsSmallScreen()
  const { isLandscape } = useOrientation()
  const { width: viewportWidth, height: viewportHeight } = useViewportSize()

  const [drawing, setDrawing] = useState(null)
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  // ─── Canvas sizing logic ──────────────────────────────────────────────────
  // Landscape mobile: canvas fits within available height minus header/actions (~120px)
  // Portrait mobile: min(vw - 48, 280) square
  // Desktop: fixed 340×340px
  const isLandscapeMobile = isMobile && isLandscape && viewportHeight < 500
  const canvasSize = isLandscapeMobile
    ? Math.min(Math.floor(viewportHeight * 0.85 - 120), Math.floor(viewportWidth * 0.9 - 48))
    : isMobile
      ? Math.min(280, viewportWidth - 48)
      : 340

  // Desktop panel width = canvas + 40px padding
  const PANEL_W = canvasSize + 40

  /**
   * KNOWN LIMITATION: Drawing moderation bypass
   *
   * Drawings bypass the AI text moderation engine because there is no image
   * scanning capability available. The text placeholder '[drawing]' always
   * passes the moderation filter.
   *
   * Backstop: The community report system (same thresholds and admin review
   * workflow as text posts) handles inappropriate drawings. Multiple independent
   * reports trigger auto-quarantine.
   */
  const handleSubmit = async () => {
    if (!drawing || status === 'sending') return
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await apiFetch('/api/moderate', {
        method: 'POST',
        body: JSON.stringify({
          text: '[drawing]',    // placeholder — moderation will pass this
          planet_id: 'doodle',
          session_id: sessionId,
          drawing,              // base64 data URL
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save drawing')
      }

      addPost(data.post)
      setStatus('success')
      setTimeout(() => {
        setPostModalOpen(false)
        setDrawing(null)
        setStatus('idle')
      }, 1200)
    } catch (err) {
      console.error('[DoodleModal]', err)
      setStatus('error')
      setErrorMsg(err.message || 'Could not save the drawing.')
    }
  }

  // ─── Close / dirty-close logic ────────────────────────────────────────────
  const handleClose = () => {
    // Requirement 11.5: non-null drawing → show ConfirmDialog
    if (drawing) {
      setShowConfirm(true)
      return
    }
    // Requirement 11.6: blank canvas → close immediately without confirm
    doClose()
  }

  const doClose = () => {
    setPostModalOpen(false)
    setDrawing(null)
    setStatus('idle')
  }

  // "Discard" — user confirmed they want to discard the drawing
  const handleConfirmDiscard = () => {
    setShowConfirm(false)
    setDrawing(null)
    setPostModalOpen(false)
    setStatus('idle')
  }

  // "Keep Drawing" — user wants to return to the canvas
  const handleCancelDiscard = () => {
    setShowConfirm(false)
  }

  return (
    <>
      <ModalShell
        open={true}
        onClose={handleClose}
        type="panel"
        zIndex={Z.DOODLE_MODAL}
        draggable
        desktopWidth={PANEL_W}
        ariaLabel="Draw on Doodle Drift"
      >
        <div className="flex flex-col gap-3 p-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl" aria-hidden="true">🎨</span>
              <div>
                <h2 className="font-bold text-white text-sm">Doodle Drift</h2>
                <p className="text-xs text-slate-400">Draw what you feel</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-white text-sm transition-colors
                         flex items-center justify-center"
              style={{ width: '44px', height: '44px' }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Canvas */}
          <DrawingCanvas
            width={canvasSize}
            height={canvasSize}
            onChange={setDrawing}
          />

          {/* Status messages */}
          {status === 'success' && (
            <p className="text-sm text-emerald-300 text-center">
              Your doodle has been broadcast to the stars.
            </p>
          )}
          {status === 'error' && (
            <p className="text-sm text-orange-300 text-center">{errorMsg}</p>
          )}

          {/* Disclaimer */}
          <p className="text-[10px] text-slate-600 leading-relaxed">
            Drawings cannot be auto-moderated by AI. If someone posts something
            inappropriate, use the report button — the same community review
            process applies.
          </p>

          {/* Actions — Requirement 11.7, 11.8 */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              onClick={handleSubmit}
              disabled={!drawing || status === 'sending' || status === 'success'}
              loading={status === 'sending'}
            >
              {status === 'success' ? '✓ Sent!' : '🎨 Broadcast'}
            </Button>
          </div>
        </div>
      </ModalShell>

      {/* Confirmation dialog — shown when closing with a non-blank canvas */}
      <ConfirmDialog
        open={showConfirm}
        message="Discard your drawing?"
        cancelLabel="Keep Drawing"
        confirmLabel="Discard"
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
    </>
  )
}
