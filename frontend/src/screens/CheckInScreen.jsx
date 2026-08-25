import { useState, useRef, useCallback, useEffect } from 'react'
import useAppStore from '../store/useAppStore'
import { getFeelingById } from '../data/emotions'
import { getPlanetById } from '../data/planets'
import { useIsSmallScreen, useIsLandscape } from '../lib/device'
import PreloadManager from '../components/3d/models/PreloadManager'
import BreathingMoment from '../components/checkin/BreathingMoment.jsx'
import MoodSpace from '../components/checkin/MoodSpace.jsx'
import NuanceConstellation from '../components/checkin/NuanceConstellation.jsx'
import NavigationBar from '../components/checkin/NavigationBar.jsx'
import AriaAnnouncer from '../components/checkin/AriaAnnouncer.jsx'

/**
 * StarfieldBackground — Canvas-based twinkling starfield matching the landing page.
 * Renders 150 twinkling white stars and 15 floating violet accent dots.
 */
function StarfieldBackground() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.0 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
      twinkleSpeed: Math.random() * 0.015 + 0.003,
      phase: Math.random() * Math.PI * 2,
    }))

    const dots = Array.from({ length: 15 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.4,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.08 - 0.03,
      alpha: Math.random() * 0.25 + 0.05,
    }))

    let frame = 0
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++

      for (const s of stars) {
        const twinkle = Math.sin(frame * s.twinkleSpeed + s.phase) * 0.3 + 0.7
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${s.alpha * twinkle})`
        ctx.fill()
      }

      for (const d of dots) {
        d.x += d.vx; d.y += d.vy
        if (d.x < 0) d.x = canvas.width
        if (d.x > canvas.width) d.x = 0
        if (d.y < 0) d.y = canvas.height
        if (d.y > canvas.height) d.y = 0
        ctx.beginPath()
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(139,92,246,${d.alpha})`
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(animRef.current) }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" aria-hidden="true" />
}

/**
 * CheckInScreen — immersive spatial mood interaction using the Yale Mood Meter
 * quadrant model (energy × pleasantness).
 *
 * 3-step state machine:
 *   breathing → mood (MoodSpace interactive) → nuance (NuanceConstellation)
 *
 * The breathing overlay sits on top of the MoodSpace (which is rendered
 * non-interactive behind it) so the ambient visual is already visible during
 * the calming entrance animation.
 *
 * On completion, writes to Zustand in exact order:
 *   1. setSelectedPlanet (skipped if getPlanetById returns undefined)
 *   2. setCheckIn({ feeling, nuance, prompt })
 *   3. setPhase('space')
 *   4. setPostModalOpen(true)
 *
 * Skip from any step: setPhase('space') only — no other store writes.
 * Back: setPhase('avatar')
 *
 * Visual: cosmic monochrome + violet accent (#8b5cf6).
 *   - Solid #050510 background, no glass-morphism, no backdrop-filter
 *   - Fade-out transition 300ms (opacity + translateY, GPU-compositable)
 *   - Landscape <768px: side-by-side layout
 *
 * Requirements: 1.6, 2.4, 3.3, 3.4, 5.1–5.7, 6.1–6.3, 6.6, 7.5, 9.1, 9.2, 9.4, 10.1, 10.5–10.7
 */
export default function CheckInScreen() {
  const { setPhase, setSelectedPlanet, setCheckIn, setPostModalOpen } = useAppStore()

  // ─── Local State Machine ────────────────────────────────────────────────────
  const [step, setStep] = useState('breathing') // 'breathing' | 'mood' | 'nuance'
  const [selectedFeeling, setSelectedFeeling] = useState(null)
  const [isFadingOut, setIsFadingOut] = useState(false)

  // ─── Refs ───────────────────────────────────────────────────────────────────
  const announcerRef = useRef(null)

  // ─── Responsive Detection ───────────────────────────────────────────────────
  const isMobile = useIsSmallScreen()
  const isLandscape = useIsLandscape()
  const useSideBySide = isMobile && isLandscape

  // ─── Fade-Out Helper ────────────────────────────────────────────────────────
  /**
   * Applies a 300ms fade-out (opacity + translateY) before executing a callback.
   * Uses GPU-compositable properties only (opacity, transform).
   */
  const fadeOutThen = useCallback((callback) => {
    setIsFadingOut(true)
    setTimeout(() => {
      callback()
    }, 300)
  }, [])

  // ─── Complete Check-In ──────────────────────────────────────────────────────
  /**
   * Called when the user selects a nuance. Writes to store in exact order:
   * setSelectedPlanet → setCheckIn → setPhase('space') → setPostModalOpen(true)
   *
   * Handles getPlanetById returning undefined gracefully.
   */
  const completeCheckIn = useCallback((feelingId, nuance) => {
    fadeOutThen(() => {
      const planet = getPlanetById(feelingId)
      if (planet) setSelectedPlanet(planet)
      setCheckIn({ feeling: feelingId, nuance: nuance.id, prompt: nuance.prompt })
      setPhase('space')
      setPostModalOpen(true)
    })
  }, [fadeOutThen, setSelectedPlanet, setCheckIn, setPhase, setPostModalOpen])

  // ─── Skip Check-In ─────────────────────────────────────────────────────────
  /**
   * Skip from any step — only calls setPhase('space'), no other store writes.
   * Discards any partial feeling selection.
   */
  const skipCheckIn = useCallback(() => {
    fadeOutThen(() => {
      setPhase('space')
    })
  }, [fadeOutThen, setPhase])

  // ─── Back to Avatar ─────────────────────────────────────────────────────────
  const goBack = useCallback(() => {
    fadeOutThen(() => {
      setPhase('avatar')
    })
  }, [fadeOutThen, setPhase])

  // ─── Feeling Selected (mood → nuance transition) ───────────────────────────
  const handleFeelingSelected = useCallback((feelingId) => {
    const feeling = getFeelingById(feelingId)
    if (feeling) {
      setSelectedFeeling(feeling)
      setStep('nuance')

      // Announce transition for screen readers
      if (announcerRef.current) {
        announcerRef.current.announceAssertive(
          `${feeling.label} selected. Choose a nuance word that resonates.`
        )
      }
    }
  }, [])

  // ─── Quadrant Change (for AriaAnnouncer) ───────────────────────────────────
  const handleQuadrantChange = useCallback((_quadrant, _feelings) => {
    // Quadrant change announcements are handled internally by MoodSpace
    // via the announcerRef. This callback is available for additional
    // orchestrator-level logic if needed in the future.
  }, [])

  // ─── Nuance Selected ───────────────────────────────────────────────────────
  const handleNuanceSelect = useCallback((nuance) => {
    if (selectedFeeling) {
      completeCheckIn(selectedFeeling.id, nuance)
    }
  }, [selectedFeeling, completeCheckIn])

  // ─── Breathing Complete ─────────────────────────────────────────────────────
  const handleBreathingComplete = useCallback(() => {
    setStep('mood')
  }, [])

  // ─── Step Indicator Text ────────────────────────────────────────────────────
  const getStepIndicator = () => {
    if (step === 'breathing' || step === 'mood') return 'Step 1 of 2'
    if (step === 'nuance') return 'Step 2 of 2'
    return ''
  }

  const getHeading = () => {
    if (step === 'breathing' || step === 'mood') {
      return 'Where does your energy sit right now?'
    }
    if (step === 'nuance' && selectedFeeling) {
      return 'Which word captures the nuance?'
    }
    return ''
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* PreloadManager: calls useGLTF.preload() only, no Canvas/WebGL */}
      <PreloadManager />

      <div
        className={[
          'relative w-full h-full flex flex-col bg-[#050510] overflow-hidden',
          'transition-all duration-300 ease-out',
          isFadingOut ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
        ].join(' ')}
        style={{ minHeight: '100dvh' }}
      >
        {/* Starfield background — twinkling stars + violet dots */}
        <StarfieldBackground />

        {/* AriaAnnouncer — live regions for screen reader announcements */}
        <AriaAnnouncer ref={announcerRef} />

        {/* Navigation (always visible) — positioned at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <NavigationBar onSkip={skipCheckIn} onBack={goBack} />
        </div>

        {/* Main content area */}
        <div
          className={[
            'flex-1 flex items-center justify-center p-4',
            useSideBySide ? 'flex-row gap-4' : 'flex-col gap-4',
          ].join(' ')}
          style={{ paddingBottom: '72px' }} // space for NavigationBar
        >
          {/* Text column (heading + step indicator) */}
          <div
            className={[
              'flex flex-col gap-1 z-10',
              useSideBySide ? 'w-1/3 items-start' : 'w-full max-w-[600px] items-center text-center',
            ].join(' ')}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/50 font-semibold">
              {getStepIndicator()}
            </p>
            <h1 className="font-semibold text-white text-lg sm:text-xl md:text-2xl leading-snug">
              {getHeading()}
            </h1>
            {step === 'mood' && (
              <p className="text-sm text-white/60 mt-1">
                Drag or tap to place yourself. No wrong answers.
              </p>
            )}
            {step === 'nuance' && (
              <p className="text-sm text-white/60 mt-1">
                Naming it precisely often makes it easier to carry.
              </p>
            )}
          </div>

          {/* Interactive area */}
          <div
            className={[
              'relative',
              useSideBySide ? 'w-2/3 h-full' : 'w-full max-w-[600px]',
            ].join(' ')}
          >
            {/* MoodSpace — visible during breathing (non-interactive) and mood (interactive) */}
            {(step === 'breathing' || step === 'mood') && (
              <MoodSpace
                interactive={step === 'mood'}
                onFeelingSelected={handleFeelingSelected}
                onQuadrantChange={handleQuadrantChange}
                announcerRef={announcerRef}
              />
            )}

            {/* Breathing overlay — sits on top of MoodSpace */}
            {step === 'breathing' && (
              <BreathingMoment onComplete={handleBreathingComplete} />
            )}

            {/* NuanceConstellation — shown after feeling is selected */}
            {step === 'nuance' && selectedFeeling && (
              <div className="w-full h-[50vh] min-h-[200px] md:h-[60vh]">
                <NuanceConstellation
                  nuances={selectedFeeling.nuances}
                  onSelect={handleNuanceSelect}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
