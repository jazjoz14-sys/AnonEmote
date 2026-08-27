import { useState, useEffect, useRef, useCallback } from 'react'
import useAppStore from '../../store/useAppStore'
import { apiFetch } from '../../lib/api'
import { useIsSmallScreen } from '../../lib/device'
import ModalShell from '../ui/ModalShell'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import Banner from '../ui/Banner'
import ConfirmDialog from '../ui/ConfirmDialog'
import { Z } from '../../design/tokens'

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
 * Uses ModalShell for unified responsive layout:
 * - Mobile portrait: BottomSheet (55dvh max)
 * - Landscape mobile: centered card (480px max-width, 90dvh max-height)
 * - Desktop: draggable floating panel (480px width)
 *
 * Submits to POST /api/moderate, which moderates AND inserts in one call.
 *   403 → crisis modal
 *   406 → blocked message shown inline
 *   200 → post added to local state
 */
export default function PostModal() {
  const isSmallScreen = useIsSmallScreen()

  const {
    postModalOpen,
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

  // Seed from a preserved crisis draft, so choosing "Keep writing" returns the
  // user to exactly what they had typed.
  const [text, setText] = useState(() => crisis?.draft || '')
  const [status, setStatus] = useState('idle') // idle | checking | blocked | success | error
  const [errorMsg, setErrorMsg] = useState('')
  const [rocketPhase, setRocketPhase] = useState(null) // null | 'rumble' | 'launch' | 'fail'
  const [showConfirm, setShowConfirm] = useState(false)

  // Textarea ref for auto-grow and focus
  const textareaRef = useRef(null)

  // Keyboard offset for mobile (visualViewport handling)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  const remaining = MAX_CHARS - text.length

  // ─── visualViewport keyboard handling ───────────────────────────────────
  useEffect(() => {
    if (!isSmallScreen || !postModalOpen) return

    const vv = window.visualViewport
    if (!vv) return // Fallback: stay fixed at bottom

    const handleResize = () => {
      // The difference between layout viewport and visual viewport = keyboard height
      const keyboardHeight = window.innerHeight - vv.height
      setKeyboardOffset(keyboardHeight > 50 ? keyboardHeight : 0)
    }

    vv.addEventListener('resize', handleResize)
    return () => vv.removeEventListener('resize', handleResize)
  }, [isSmallScreen, postModalOpen])

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

      // Crisis detected — HTTP 403
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

      // Blocked content — HTTP 406
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

  // ─── Dirty-close: show confirm dialog if there's unsaved text ───────────
  const handleDirtyClose = () => {
    if (text.trim().length > 0) {
      setShowConfirm(true)
      return
    }
    doClose()
  }

  // Actual close logic — called directly when text is empty, or when user confirms discard
  const doClose = () => {
    setPostModalOpen(false)
    setStatus('idle')
    setErrorMsg('')
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
    setKeyboardOffset(0)
  }

  // "Keep Writing" — user wants to return to the composer
  const handleCancelDiscard = () => {
    setShowConfirm(false)
  }

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      <ModalShell
        open={postModalOpen}
        onClose={handleDirtyClose}
        type="panel"
        zIndex={Z.POST_MODAL}
        maxHeight="55dvh"
        draggable
        desktopWidth={420}
        ariaLabel={`Broadcast to ${selectedPlanet?.label}`}
      >
        <div
          className="flex flex-col gap-3 p-4"
          style={{
            transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
            transition: keyboardOffset > 0 ? 'transform 0.15s ease-out' : undefined,
          }}
        >
          {/* ── Header: planet label ───────────────────────────────────────── */}
          <div className="flex items-center gap-2 min-w-0">
            <p className="text-xs tracking-[0.15em] uppercase text-slate-400">
              Broadcast to{' '}
              <span className="text-white font-medium">{selectedPlanet?.label}</span>
            </p>
          </div>

          {/* ── Rocket animation overlay ───────────────────────────────────── */}
          {rocketPhase ? (
            <RocketAnimation phase={rocketPhase} />
          ) : (
            <>
              {/* ── Tailored prompt from the check-in ──────────────────────── */}
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

              {/* ── Textarea ───────────────────────────────────────────────── */}
              <div className="relative">
                <Textarea
                  ref={textareaRef}
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
                  rows={isSmallScreen ? 3 : 5}
                  autoFocus={!isSmallScreen}
                  disabled={status === 'checking' || status === 'success'}
                  aria-label="Post content"
                  className=""
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
                  spellCheck={false}
                />
                <span className={`absolute bottom-3 right-3 text-xs font-mono
                  ${remaining < 30 ? 'text-orange-400' : 'text-slate-500'}`}>
                  {remaining}
                </span>
              </div>

              {/* ── Status banners ─────────────────────────────────────────── */}
              {status === 'blocked' && (
                <Banner type="error">
                  <div className="flex items-start gap-2">
                    <span>🚫</span>
                    <p>{errorMsg}</p>
                  </div>
                </Banner>
              )}
              {status === 'error' && (
                <Banner type="warning">
                  <div className="flex items-start gap-2">
                    <span>⚠️</span>
                    <p>{errorMsg}</p>
                  </div>
                </Banner>
              )}
              {status === 'success' && (
                <Banner type="success">
                  <div className="flex items-center gap-2">
                    <span>✅</span>
                    <p>Your message has been broadcast to the stars.</p>
                  </div>
                </Banner>
              )}

              {/* ── Disclaimer (hidden on mobile) ──────────────────────────── */}
              {!isSmallScreen && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  AI-moderated for safety. Just Express yourself with respect.
                </p>
              )}

              {/* ── Actions ────────────────────────────────────────────────── */}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handleDirtyClose}
                  fullWidth
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!text.trim() || status === 'success'}
                  loading={status === 'checking'}
                  fullWidth
                >
                  {status === 'success' ? '✓ Sent' : 'Broadcast'}
                </Button>
              </div>
            </>
          )}
        </div>
      </ModalShell>

      {/* ── Confirm discard dialog ────────────────────────────────────────── */}
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
