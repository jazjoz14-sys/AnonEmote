import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import useDraggable from '../../hooks/useDraggable'
import { apiFetch } from '../../lib/api'
import { useIsSmallScreen, useIsLandscape } from '../../lib/device'
import DrawingCanvas from '../ui/DrawingCanvas'
import ConfirmDialog from '../ui/ConfirmDialog'

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
 * Landscape adaptation (Requirement 11.7):
 *   - Centered card, 90% viewport width, 85dvh max height
 *   - Canvas maintains 1:1 aspect ratio sized to fit within available space
 */
export default function DoodleModal() {
  const { selectedPlanet, setPostModalOpen, sessionId, addPost } = useAppStore()
  const isMobile = useIsSmallScreen()
  const isLandscape = useIsLandscape()

  const [drawing, setDrawing] = useState(null)
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

  // In landscape: canvas fits within the centered card (85dvh - header/actions ~120px)
  // In portrait mobile: constrained to viewport width
  const canvasSize = isLandscape && isMobile
    ? Math.min(Math.floor(window.innerHeight * 0.85 - 120), Math.floor(window.innerWidth * 0.9 - 48))
    : isMobile
      ? Math.min(280, window.innerWidth - 48)
      : 340

  const PANEL_W = canvasSize + 40

  const { position, isDragging, dragProps, handleProps } = useDraggable({
    width: PANEL_W,
    height: canvasSize + 200,
  })

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
   *
   * This does NOT affect text posts — those still go through the full three-layer
   * hybrid moderation pipeline (crisis → vernacular → Perspective API).
   */
  const handleSubmit = async () => {
    if (!drawing || status === 'sending') return
    setStatus('sending')
    setErrorMsg('')

    try {
      // Drawings bypass the text moderation engine (there's no text to scan).
      // They go directly to the posts table with content set to a placeholder.
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

  const handleClose = () => {
    // If the canvas has content, show confirmation dialog instead of closing immediately
    if (drawing) {
      setShowConfirm(true)
      return
    }
    // Canvas is blank — close immediately without confirmation
    doClose()
  }

  // Actual close logic — called when canvas is blank or user confirms discard
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

  // On mobile landscape: centered card, 90% width, 85dvh
  // On mobile portrait: fixed bottom sheet, no dragging
  // On desktop: draggable floating panel
  const wrapperClass = isLandscape && isMobile
    ? 'fixed inset-0 z-50 flex items-center justify-center'
    : isMobile
      ? 'fixed bottom-0 left-0 right-0 z-50 glass-dark rounded-t-3xl p-4 safe-bottom animate-slide-up'
      : 'fixed z-50 glass-dark rounded-3xl p-5 shadow-2xl shadow-black/60 animate-pop-in'

  const wrapperStyle = isLandscape && isMobile
    ? {}
    : isMobile
      ? { maxHeight: '90vh', border: `1px solid ${selectedPlanet?.color}44`, borderBottom: 'none' }
      : {
          ...dragProps.style,
          left: position.x,
          top: position.y,
          width: PANEL_W,
          maxWidth: 'calc(100vw - 24px)',
          border: `1px solid ${selectedPlanet?.color}44`,
          boxShadow: isDragging
            ? '0 25px 60px rgba(0,0,0,0.7)'
            : '0 12px 40px rgba(0,0,0,0.5)',
        }

  // Inner card for landscape mode
  const innerCardStyle = isLandscape && isMobile
    ? {
        maxWidth: '90vw',
        maxHeight: '85dvh',
        width: PANEL_W + 'px',
        border: `1px solid ${selectedPlanet?.color}44`,
      }
    : undefined

  return (
    <>
    <div
      className={wrapperClass}
      style={wrapperStyle}
      role="dialog"
      aria-label="Draw on Doodle Drift"
      {...(!isMobile ? dragProps : {})}
    >
      <div
        className={isLandscape && isMobile
          ? 'glass-dark rounded-3xl p-4 shadow-2xl shadow-black/60 flex flex-col overflow-hidden'
          : 'flex flex-col gap-3'}
        style={innerCardStyle}
      >
        {/* Header — drag handle */}
        <div
          className="flex items-center justify-between"
          {...(!isMobile ? handleProps : {})}
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎨</span>
            <div>
              <h2 className="font-bold text-white text-sm">Doodle Drift</h2>
              <p className="text-xs text-slate-400">Draw what you feel</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-500 hover:text-white text-lg px-2"
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

        {/* Status */}
        {status === 'success' && (
          <p className="text-sm text-emerald-300 text-center">
            ✅ Your doodle has been broadcast to the stars.
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-orange-300 text-center">⚠ {errorMsg}</p>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-slate-600 leading-relaxed">
          Drawings cannot be auto-moderated by AI. If someone posts something
          inappropriate, use the report button — the same community review
          process applies.
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleClose}
            className="flex-1 py-3 rounded-xl text-sm text-slate-400 glass
                       hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!drawing || status === 'sending' || status === 'success'}
            className="flex-1 py-3 rounded-xl font-semibold text-white text-sm
                       bg-gradient-to-r from-orange-500 to-amber-500
                       hover:from-orange-400 hover:to-amber-400
                       disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {status === 'sending' ? '⏳ Saving...' : status === 'success' ? '✓ Sent!' : '🎨 Broadcast'}
          </button>
        </div>
      </div>
    </div>

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
