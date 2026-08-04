import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import useDraggable from '../../hooks/useDraggable'
import { apiFetch } from '../../lib/api'

const MAX_CHARS = 280
const PANEL_W = 480

/**
 * PostModal — a draggable floating composer panel.
 *
 * Deliberately has no full-screen backdrop: the user can still see and
 * navigate the star system while drafting, and can reposition the panel
 * anywhere on screen by its header.
 *
 * Submits to POST /api/moderate, which moderates AND inserts in one call.
 *   403 → crisis modal
 *   406 → blocked message shown inline
 *   200 → post added to local state
 */
export default function PostModal() {
  const {
    selectedPlanet,
    setPostModalOpen,
    openCrisis,
    crisis,
    sessionId,
    addPost,
    checkIn,
  } = useAppStore()

  // If the user came through the check-in, show the prompt matched to the
  // nuance they picked instead of the generic placeholder.
  const nuanceMatchesPlanet = checkIn?.feeling === selectedPlanet?.id
  const tailoredPrompt = nuanceMatchesPlanet ? checkIn.prompt : null

  const { position, isDragging, dragProps, handleProps } = useDraggable({
    width: PANEL_W,
    height: 440,
  })

  // Seed from a preserved crisis draft, so choosing "Keep writing" returns the
  // user to exactly what they had typed.
  const [text, setText] = useState(() => crisis?.draft || '')
  const [status, setStatus] = useState('idle') // idle | checking | blocked | success | error
  const [errorMsg, setErrorMsg] = useState('')

  const remaining = MAX_CHARS - text.length

  const handleSubmit = async () => {
    if (!text.trim() || status === 'checking') return
    setStatus('checking')
    setErrorMsg('')

    try {
      const res = await apiFetch('/api/moderate', {
        method: 'POST',
        body: JSON.stringify({
          text: text.trim(),
          planet_id: selectedPlanet.id,
          session_id: sessionId,
        }),
      })

      const data = await res.json()

      // Crisis detected. Hand the draft to the crisis flow rather than
      // discarding it — the user decides what happens to their own words.
      if (res.status === 403) {
        setStatus('idle')
        openCrisis({ draft: text, referral: data.referral })
        setPostModalOpen(false)
        return
      }

      if (res.status === 406) {
        setStatus('blocked')
        setErrorMsg(data.error || 'Your message was flagged and cannot be posted.')
        return
      }

      if (!res.ok) throw new Error(data.error || 'Server error')

      addPost(data.post)
      setStatus('success')
      setTimeout(() => {
        setPostModalOpen(false)
        setText('')
        setStatus('idle')
      }, 1200)

    } catch (err) {
      console.error('[PostModal]', err)
      setStatus('error')
      setErrorMsg('Could not reach the server. Make sure the backend is running.')
    }
  }

  const handleClose = () => {
    setPostModalOpen(false)
    setStatus('idle')
    setErrorMsg('')
    // Keep a crisis-preserved draft in the store so closing the panel does not
    // destroy writing the user has not yet decided about.
    if (crisis?.draft) {
      useAppStore.setState((s) => ({ crisis: { ...s.crisis, draft: text } }))
    } else {
      setText('')
    }
  }

  return (
    <div
      {...dragProps}
      className="fixed z-50 glass-dark rounded-3xl flex flex-col gap-4 p-5
                 shadow-2xl shadow-black/60"
      style={{
        ...dragProps.style,
        left: position.x,
        top: position.y,
        width: PANEL_W,
        maxWidth: 'calc(100vw - 24px)',
        border: `1px solid ${selectedPlanet?.color}44`,
        // Lift the panel while it's being moved
        boxShadow: isDragging
          ? '0 30px 60px -12px rgba(0,0,0,0.9)'
          : '0 20px 40px -12px rgba(0,0,0,0.7)',
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      role="dialog"
      aria-label={`Broadcast to ${selectedPlanet?.label}`}
    >
      {/* ── Drag handle / header ─────────────────────────────────────────── */}
      <div
        {...handleProps}
        className="flex items-center justify-between gap-3 -m-1 p-1 rounded-xl
                   select-none focus:outline-none focus:ring-1 focus:ring-violet-500/50"
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Grip affordance */}
          <span className="text-slate-600 text-base leading-none shrink-0" aria-hidden="true">
            ⠿
          </span>
          <span className="text-2xl shrink-0">{selectedPlanet?.emoji}</span>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-base leading-tight truncate">
              Broadcast Anonymously
            </h2>
            <p className="text-xs text-slate-400 truncate">
              to the{' '}
              <span className="font-semibold" style={{ color: selectedPlanet?.color }}>
                {selectedPlanet?.label}
              </span>{' '}
              planet
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          data-no-drag
          className="text-slate-500 hover:text-white transition-colors text-xl
                     leading-none shrink-0 px-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* ── Tailored prompt from the check-in ────────────────────────────── */}
      {tailoredPrompt && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: `${selectedPlanet?.color}14`,
            border: `1px solid ${selectedPlanet?.color}33`,
          }}
        >
          <p className="text-slate-200 font-medium">{tailoredPrompt}</p>
          <p className="text-xs text-slate-500 mt-1">
            Write as much or as little as you want.
          </p>
        </div>
      )}

      {/* ── Textarea ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) setText(e.target.value)
            if (status === 'blocked') setStatus('idle')
          }}
          placeholder={
            tailoredPrompt
              ? 'Write freely — this is yours alone…'
              : `What's on your mind? Share anonymously to the ${selectedPlanet?.label} space...`
          }
          rows={6}
          autoFocus
          // Keep browser extensions (Grammarly etc.) out of the composer.
          // They inject overlays that swallow pointer events, and anonymous
          // posts should not be sent to third-party services.
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          spellCheck={false}
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3
                     text-slate-200 placeholder-slate-600 text-sm resize-none
                     focus:outline-none focus:border-violet-500/60
                     focus:ring-1 focus:ring-violet-500/30 transition-colors"
          aria-label="Post content"
          disabled={status === 'checking' || status === 'success'}
        />
        <span className={`absolute bottom-3 right-3 text-xs font-mono
          ${remaining < 30 ? 'text-orange-400' : 'text-slate-600'}`}>
          {remaining}
        </span>
      </div>

      {/* ── Status banners ───────────────────────────────────────────────── */}
      {status === 'blocked' && (
        <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/40
                        rounded-xl px-4 py-3 text-sm text-red-300">
          <span>🚫</span>
          <p>{errorMsg}</p>
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-start gap-2 bg-orange-900/30 border border-orange-700/40
                        rounded-xl px-4 py-3 text-sm text-orange-300">
          <span>⚠️</span>
          <p>{errorMsg}</p>
        </div>
      )}
      {status === 'success' && (
        <div className="flex items-center gap-2 bg-emerald-900/30 border border-emerald-700/40
                        rounded-xl px-4 py-3 text-sm text-emerald-300">
          <span>✅</span>
          <p>Your message has been broadcast to the stars.</p>
        </div>
      )}

      {/* ── Disclaimer ───────────────────────────────────────────────────── */}
      <p className="text-xs text-slate-600 leading-relaxed">
        🤖 All posts pass through AI moderation before being visible.
        Harmful content is blocked. Your session is never linked to your identity.
      </p>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <button
          onClick={handleClose}
          className="flex-1 py-3 rounded-xl text-sm text-slate-400 glass
                     hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || status === 'checking' || status === 'success'}
          className="flex-1 py-3 rounded-xl font-semibold text-white text-sm
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-500 hover:to-indigo-500
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200"
          aria-busy={status === 'checking'}
        >
          {status === 'checking' ? '⏳ Scanning...' : status === 'success' ? '✓ Sent!' : '✦ Broadcast'}
        </button>
      </div>
    </div>
  )
}
