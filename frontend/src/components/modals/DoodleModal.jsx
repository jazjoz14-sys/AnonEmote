import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import { isSmallScreen } from '../../lib/device'
import DrawingCanvas from '../ui/DrawingCanvas'

/**
 * DoodleModal — canvas-based post composer for the Doodle Drift planet.
 *
 * Instead of a textarea, users get a freeform drawing surface. The drawing is
 * stored as a base64 data URL in the `drawing` column.
 *
 * AI moderation cannot scan images, so drawings are not auto-moderated. The
 * community reports path handles inappropriate content — same thresholds and
 * admin review workflow as text posts.
 */
export default function DoodleModal() {
  const { selectedPlanet, setPostModalOpen, sessionId, addPost } = useAppStore()

  const [drawing, setDrawing] = useState(null)
  const [status, setStatus] = useState('idle') // idle | sending | success | error
  const [errorMsg, setErrorMsg] = useState('')

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
    setPostModalOpen(false)
    setDrawing(null)
    setStatus('idle')
  }

  const canvasSize = isSmallScreen
    ? Math.min(320, window.innerWidth - 48)
    : 360

  return (
    <div
      className={isSmallScreen
        ? 'fixed bottom-0 left-0 right-0 z-50 glass-dark rounded-t-3xl p-4 safe-bottom animate-slide-up'
        : 'fixed z-50 glass-dark rounded-3xl p-5 shadow-2xl shadow-black/60 animate-pop-in'}
      style={isSmallScreen
        ? { maxHeight: '90vh', border: `1px solid ${selectedPlanet?.color}44`, borderBottom: 'none' }
        : {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: canvasSize + 40,
            border: `1px solid ${selectedPlanet?.color}44`,
          }}
      role="dialog"
      aria-label="Draw on Doodle Drift"
    >
      <div className="flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
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
  )
}
