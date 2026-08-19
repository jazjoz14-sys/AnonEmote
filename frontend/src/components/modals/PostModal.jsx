import { useState, useEffect, useRef, useCallback } from 'react'
import useAppStore from '../../store/useAppStore'
import useDraggable from '../../hooks/useDraggable'
import { apiFetch } from '../../lib/api'
import { useIsSmallScreen, useViewportSize } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'
import BottomSheet from '../ui/BottomSheet'
import ConfirmDialog from '../ui/ConfirmDialog'

const MAX_CHARS = 280

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
 * PostModal — composer panel for broadcasting to a planet.
 *
 * Mobile (< 768px): renders as a BottomSheet (bottom-anchored, 55dvh max,
 * keyboard-aware repositioning via visualViewport API).
 *
 * Desktop (≥ 768px): draggable floating panel (unchanged from original).
 *
 * Landscape mobile: centered card (420px max width, 85dvh max height).
 *
 * Submits to POST /api/moderate, which moderates AND inserts in one call.
 *   403 → crisis modal
 *   406 → blocked message shown inline
 *   200 → post added to local state
 */
export default function PostModal() {
  const isSmallScreen = useIsSmallScreen()
  const { isLandscape } = useOrientation()
  const { width: viewportWidth } = useViewportSize()
  const panelWidth = isSmallScreen ? Math.min(440, viewportWidth - 16) : 480

  const {
    selectedPlanet,
    setPostModalOpen,
    openCrisis,
    crisis,
    sessionId,
    addPost,
    checkIn,
    showToast,
  } = useAppStore()

  // If the user came through the check-in, show the prompt matched to the
  // nuance they picked instead of the generic placeholder.
  const nuanceMatchesPlanet = checkIn?.feeling === selectedPlanet?.id
  const tailoredPrompt = nuanceMatchesPlanet ? checkIn.prompt : null

  const { position, isDragging, dragProps, handleProps } = useDraggable({
    width: panelWidth,
    height: 440,
  })

  // Seed from a preserved crisis draft, so choosing "Keep writing" returns the
  // user to exactly what they had typed.
  const [text, setText] = useState(() => crisis?.draft || '')
  const [status, setStatus] = useState('idle') // idle | checking | blocked | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [rocketPhase, setRocketPhase] = useState(null) // null | 'rumble' | 'launch' | 'fail'
  const [showConfirm, setShowConfirm] = useState(false)

  // Auto-grow textarea state
  const [textareaRows, setTextareaRows] = useState(3)
  const textareaRef = useRef(null)

  // Keyboard offset for mobile (visualViewport handling)
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const sheetRef = useRef(null)

  const remaining = MAX_CHARS - text.length

  // ─── Auto-grow textarea logic ───────────────────────────────────────────
  const handleTextareaAutoGrow = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea || !isSmallScreen) return

    // Temporarily reset to minimum to get accurate scrollHeight
    textarea.style.height = 'auto'
    const scrollHeight = textarea.scrollHeight
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 20
    const currentVisibleHeight = lineHeight * textareaRows

    if (scrollHeight > currentVisibleHeight) {
      // Grow by 1 row, capped at max 25dvh equivalent
      const maxHeight = window.innerHeight * 0.25
      const newRows = Math.min(textareaRows + 1, Math.floor(maxHeight / lineHeight))
      setTextareaRows(newRows)
    }

    // Restore proper height
    textarea.style.height = ''
  }, [isSmallScreen, textareaRows])

  // ─── visualViewport keyboard handling ───────────────────────────────────
  useEffect(() => {
    if (!isSmallScreen) return

    const vv = window.visualViewport
    if (!vv) return // Fallback: stay fixed at bottom

    const handleResize = () => {
      // The difference between layout viewport and visual viewport = keyboard height
      const keyboardHeight = window.innerHeight - vv.height
      setKeyboardOffset(keyboardHeight > 50 ? keyboardHeight : 0)
    }

    vv.addEventListener('resize', handleResize)
    return () => vv.removeEventListener('resize', handleResize)
  }, [isSmallScreen])

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
        showToast({ message: 'Post broadcast successfully!', type: 'success' })
        setText('')
        setStatus('idle')
        setRocketPhase(null)
        setTextareaRows(3)
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
    // If there's text content, show the confirm dialog instead of closing immediately
    if (text.trim().length > 0) {
      setShowConfirm(true)
      return
    }
    // Empty text — close immediately
    doClose()
  }

  // Actual close logic — called directly when text is empty, or when user confirms discard
  const doClose = () => {
    setPostModalOpen(false)
    setStatus('idle')
    setErrorMsg('')
    setTextareaRows(3)
    setKeyboardOffset(0)
    // Keep a crisis-preserved draft in the store so closing the panel does not
    // destroy writing the user has not yet decided about.
    if (crisis?.draft) {
      useAppStore.setState((s) => ({ crisis: { ...s.crisis, draft: text } }))
    } else {
      setText('')
    }
  }

  // "Discard" — user confirmed they want to discard the draft
  const handleConfirmDiscard = () => {
    setShowConfirm(false)
    setText('')
    setPostModalOpen(false)
    setStatus('idle')
    setErrorMsg('')
    setTextareaRows(3)
    setKeyboardOffset(0)
  }

  // "Keep Writing" — user wants to return to the composer
  const handleCancelDiscard = () => {
    setShowConfirm(false)
  }

  // ─── Shared content (used in both mobile and desktop layouts) ───────────
  const renderContent = () => (
    <>
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
          {!isSmallScreen && (
            <p className="text-xs text-slate-500 mt-1">
              Write as much or as little as you want.
            </p>
          )}
        </div>
      )}

      {/* ── Textarea ─────────────────────────────────────────────────────── */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) setText(e.target.value)
            if (status === 'blocked') setStatus('idle')
            // Trigger auto-grow on next frame
            if (isSmallScreen) {
              requestAnimationFrame(handleTextareaAutoGrow)
            }
          }}
          placeholder={
            tailoredPrompt
              ? 'Write freely — this is yours alone…'
              : `What's on your mind?`
          }
          rows={isSmallScreen ? textareaRows : 5}
          autoFocus={!isSmallScreen}
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          spellCheck={false}
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-sm px-3 py-3
                     text-slate-200 placeholder-slate-600 text-sm resize-none
                     focus:outline-none focus:border-white/20 transition-colors"
          style={{
            maxHeight: isSmallScreen ? '25dvh' : undefined,
            overscrollBehavior: isSmallScreen ? 'contain' : undefined,
          }}
          aria-label="Post content"
          disabled={status === 'checking' || status === 'success'}
        />
        <span className={`absolute bottom-3 right-3 text-xs font-mono
          ${remaining < 30 ? 'text-orange-400' : 'text-slate-500'}`}>
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

      {/* ── Disclaimer (hidden on mobile) ────────────────────────────────── */}
      {!isSmallScreen && (
        <p className="text-xs text-slate-400 leading-relaxed">
          AI-moderated for safety. Your session is never linked to your identity.
        </p>
      )}

      {/* ── Actions ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <button
          onClick={handleClose}
          className={`flex-1 rounded-sm tracking-[0.1em] uppercase
                     text-slate-300 border border-white/[0.15]
                     hover:text-white hover:border-white/30 transition-all
                     ${isSmallScreen
                       ? 'py-2.5 text-[10px] min-h-[44px]'
                       : 'py-2.5 text-xs'}`}
          style={isSmallScreen ? { minHeight: '44px', paddingTop: '10px', paddingBottom: '10px', fontSize: '10px' } : undefined}
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!text.trim() || status === 'checking' || status === 'success'}
          className={`flex-1 rounded-sm tracking-[0.1em] uppercase font-medium
                     text-white border border-white/30
                     hover:bg-white hover:text-[#050510]
                     disabled:opacity-30 disabled:cursor-not-allowed
                     transition-all duration-200
                     ${isSmallScreen
                       ? 'py-2.5 text-[10px] min-h-[44px]'
                       : 'py-2.5 text-xs'}`}
          style={isSmallScreen ? { minHeight: '44px', paddingTop: '10px', paddingBottom: '10px', fontSize: '10px' } : undefined}
          aria-busy={status === 'checking'}
        >
          {status === 'checking' ? 'Broadcasting...' : status === 'success' ? '✓ Sent' : 'Broadcast'}
        </button>
      </div>
      </>
      )}
    </>
  )

  // ─── Mobile layout: use BottomSheet ─────────────────────────────────────
  if (isSmallScreen) {
    // Landscape mobile: centered card
    if (isLandscape) {
      return (
        <>
        <BottomSheet
          open={true}
          onClose={handleClose}
          zIndex={50}
          landscape={false}
        >
          <div
            ref={sheetRef}
            className="flex flex-col gap-2 p-3 mx-auto"
            style={{
              maxWidth: '420px',
              maxHeight: '85dvh',
              width: '100%',
            }}
            role="dialog"
            aria-label={`Broadcast to ${selectedPlanet?.label}`}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2" style={{ maxHeight: '40px' }}>
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-500 text-[10px] leading-none" aria-hidden="true">⠿</span>
                <p className="text-[10px] tracking-[0.1em] uppercase text-slate-400 truncate">
                  Broadcast to <span className="text-white font-medium">{selectedPlanet?.label}</span>
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-500 hover:text-white transition-colors shrink-0
                           flex items-center justify-center"
                style={{ width: '44px', height: '44px' }}
                aria-label="Close"
              >
                <span style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✕</span>
              </button>
            </div>

            {renderContent()}
          </div>
        </BottomSheet>
        <ConfirmDialog
          open={showConfirm}
          message="Discard your draft?"
          cancelLabel="Keep Writing"
          confirmLabel="Discard"
          onCancel={handleCancelDiscard}
          onConfirm={handleConfirmDiscard}
        />
        </>
      )
    }

    // Portrait mobile: bottom sheet with keyboard handling
    return (
      <>
      <BottomSheet
        open={true}
        onClose={handleClose}
        zIndex={50}
        maxHeight="55dvh"
      >
        <div
          ref={sheetRef}
          className="flex flex-col gap-2 p-3"
          style={{
            padding: '12px',
            gap: '8px',
            transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
            transition: 'transform 0.15s ease-out',
          }}
          role="dialog"
          aria-label={`Broadcast to ${selectedPlanet?.label}`}
        >
          {/* Header: drag handle + label + planet name + close — ≤ 40px */}
          <div className="flex items-center justify-between gap-2" style={{ maxHeight: '40px' }}>
            <div className="flex items-center gap-2 min-w-0">
              {/* Drag handle indicator */}
              <span className="text-slate-500 text-[10px] leading-none" aria-hidden="true">⠿</span>
              <p className="text-[10px] tracking-[0.1em] uppercase text-slate-400 truncate">
                Broadcast to <span className="text-white font-medium">{selectedPlanet?.label}</span>
              </p>
            </div>
            {/* Close button: 44×44 tap area, ≤ 28×28 visual */}
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-white transition-colors shrink-0
                         flex items-center justify-center"
              style={{ width: '44px', height: '44px' }}
              aria-label="Close"
            >
              <span style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>✕</span>
            </button>
          </div>

          {renderContent()}
        </div>
      </BottomSheet>
      <ConfirmDialog
        open={showConfirm}
        message="Discard your draft?"
        cancelLabel="Keep Writing"
        confirmLabel="Discard"
        onCancel={handleCancelDiscard}
        onConfirm={handleConfirmDiscard}
      />
      </>
    )
  }

  // ─── Desktop layout: draggable floating panel (unchanged) ───────────────
  const wrapperStyle = {
    ...dragProps.style,
    left: position.x,
    top: position.y,
    width: panelWidth,
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
    <>
    <div
      {...dragProps}
      className="fixed z-50 flex flex-col gap-3 p-5 animate-pop-in"
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
          <span className="text-slate-500 text-xs leading-none shrink-0" aria-hidden="true">
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
          className="text-slate-500 hover:text-white transition-colors text-sm
                     leading-none shrink-0 px-1"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {renderContent()}
    </div>
    <ConfirmDialog
      open={showConfirm}
      message="Discard your draft?"
      cancelLabel="Keep Writing"
      confirmLabel="Discard"
      onCancel={handleCancelDiscard}
      onConfirm={handleConfirmDiscard}
    />
    </>
  )
}
