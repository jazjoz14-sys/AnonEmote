import React, { useState, useEffect } from 'react'
import useAppStore from '../../store/useAppStore'
import useDraggable from '../../hooks/useDraggable'
import { apiFetch } from '../../lib/api'
import { isSmallScreen } from '../../lib/device'

const MAX_CHARS = 280
const PANEL_W = isSmallScreen ? Math.min(440, window.innerWidth - 16) : 480

/**
 * Rocket animation overlay — shown during moderation check.
 */
function RocketAnimation({ phase }) {
  // phase: 'rumble' | 'launch' | 'fail'
  const animClass = phase === 'launch'
    ? 'animate-rocket-launch'
    : phase === 'fail'
      ? 'animate-rocket-fail'
      : 'animate-rocket-rumble'

  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-8 ${animClass}`}>
      {/* Rocket body */}
      <div className="relative flex flex-col items-center">
        {/* Nose cone */}
        <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px]
                        border-l-transparent border-r-transparent border-b-white" />
        {/* Body */}
        <div className="w-6 h-16 bg-gradient-to-b from-white to-slate-300 rounded-sm" />
        {/* Fins */}
        <div className="flex">
          <div className="w-3 h-4 bg-violet-400 -skew-x-12 rounded-b-sm" />
          <div className="w-6" />
          <div className="w-3 h-4 bg-violet-400 skew-x-12 rounded-b-sm" />
        </div>
        {/* Exhaust flame — only during rumble */}
        {phase === 'rumble' && (
          <div className="flex flex-col items-center animate-exhaust">
            <div className="w-3 h-6 bg-gradient-to-b from-orange-400 via-orange-500 to-transparent rounded-b-full opacity-90" />
            <div className="w-2 h-4 bg-gradient-to-b from-yellow-300 to-transparent rounded-b-full -mt-3 opacity-70" />
          </div>
        )}
        {/* Big exhaust on launch */}
        {phase === 'launch' && (
          <div className="flex flex-col items-center">
            <div className="w-5 h-12 bg-gradient-to-b from-orange-400 via-red-500 to-transparent rounded-b-full opacity-95" />
            <div className="w-3 h-8 bg-gradient-to-b from-yellow-200 to-transparent rounded-b-full -mt-6 opacity-80" />
          </div>
        )}
      </div>

      {/* Status text */}
      <p className="text-xs tracking-[0.15em] uppercase text-slate-400 mt-2">
        {phase === 'rumble' && 'Scanning your message...'}
        {phase === 'launch' && 'Broadcast successful!'}
        {phase === 'fail' && 'Launch failed'}
      </p>
    </div>
  )
}

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
  const [rocketPhase, setRocketPhase] = useState(null) // null | 'rumble' | 'launch' | 'fail'

  const remaining = MAX_CHARS - text.length

  const handleSubmit = async () => {
    if (!text.trim() || status === 'checking') return
    setStatus('checking')
    setRocketPhase('rumble')
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

      // Crisis detected
      if (res.status === 403) {
        setRocketPhase('fail')
        setTimeout(() => {
          setStatus('idle')
          setRocketPhase(null)
          openCrisis({ draft: text, referral: data.referral })
          setPostModalOpen(false)
        }, 700)
        return
      }

      if (res.status === 406) {
        setRocketPhase('fail')
        setTimeout(() => {
          setStatus('blocked')
          setRocketPhase(null)
          setErrorMsg(data.error || 'Your message was flagged and cannot be posted.')
        }, 700)
        return
      }

      if (!res.ok) throw new Error(data.error || 'Server error')

      // Success — launch the rocket!
      addPost(data.post)
      setStatus('success')
      setRocketPhase('launch')
      setTimeout(() => {
        setPostModalOpen(false)
        setText('')
        setStatus('idle')
        setRocketPhase(null)
      }, 1000)

    } catch (err) {
      console.error('[PostModal]', err)
      setRocketPhase('fail')
      setTimeout(() => {
        setStatus('error')
        setRocketPhase(null)
        setErrorMsg('Could not reach the server. Make sure the backend is running.')
      }, 700)
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

  // On mobile: fixed bottom sheet, no dragging needed
  const wrapperClass = isSmallScreen
    ? 'fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-3 p-4 safe-bottom animate-slide-up'
    : 'fixed z-50 flex flex-col gap-3 p-5 animate-pop-in'

  const wrapperStyle = isSmallScreen
    ? {
        maxHeight: '80vh',
        background: 'rgba(10,10,26,0.92)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderBottom: 'none',
        borderRadius: '16px 16px 0 0',
        backdropFilter: 'blur(16px)',
      }
    : {
        ...dragProps.style,
        left: position.x,
        top: position.y,
        width: PANEL_W,
        maxWidth: 'calc(100vw - 24px)',
        background: 'rgba(10,10,26,0.92)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '4px',
        backdropFilter: 'blur(16px)',
        boxShadow: isDragging
          ? '0 30px 60px -12px rgba(0,0,0,0.9)'
          : '0 20px 40px -12px rgba(0,0,0,0.8)',
        cursor: isDragging ? 'grabbing' : 'default',
      }

  return (
    <div
      {...(isSmallScreen ? {} : dragProps)}
      className={wrapperClass}
      style={wrapperStyle}
      role="dialog"
      aria-label={`Broadcast to ${selectedPlanet?.label}`}
    >
      {/* ── Drag handle / header ─────────────────────────────────────────── */}
      <div
        {...handleProps}
        className="flex items-center justify-between gap-3 select-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-slate-600 text-xs leading-none shrink-0" aria-hidden="true">
            ⠿
          </span>
          <div className="min-w-0">
            <p className="text-xs tracking-[0.15em] uppercase text-slate-400">
              Broadcast to
            </p>
            <h2 className="text-base font-medium text-white truncate">
              {selectedPlanet?.label}
            </h2>
          </div>
        </div>

        <button
          onClick={handleClose}
          data-no-drag
          className="text-slate-600 hover:text-white transition-colors text-sm
                     leading-none shrink-0 px-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* ── Rocket animation overlay ─────────────────────────────────────── */}
      {rocketPhase ? (
        <RocketAnimation phase={rocketPhase} />
      ) : (
      <>
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
              : `What's on your mind?`
          }
          rows={5}
          autoFocus
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          spellCheck={false}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-3
                     text-slate-200 placeholder-slate-600 text-sm resize-none
                     focus:outline-none focus:border-white/20 transition-colors"
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
      <p className="text-xs text-slate-400 leading-relaxed">
        AI-moderated for safety. Your session is never linked to your identity.
      </p>

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={handleClose}
          className="flex-1 py-2.5 rounded-sm text-xs tracking-[0.1em] uppercase
                     text-slate-300 border border-white/[0.15]
                     hover:text-white hover:border-white/30 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || status === 'checking' || status === 'success'}
          className="flex-1 py-2.5 rounded-sm text-xs tracking-[0.1em] uppercase font-medium
                     text-white border border-white/30
                     hover:bg-white hover:text-[#050510]
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all duration-200"
          aria-busy={status === 'checking'}
        >
          {status === 'checking' ? 'Scanning...' : status === 'success' ? '✓ Sent' : 'Broadcast'}
        </button>
      </div>
      </>
      )}
    </div>
  )
}
