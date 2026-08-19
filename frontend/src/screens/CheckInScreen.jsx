import React, { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { FEELINGS } from '../data/emotions'
import { getPlanetById } from '../data/planets'
import { useIsSmallScreen, useIsNarrow } from '../lib/device'
import PreloadManager from '../components/3d/models/PreloadManager'

/**
 * CheckInScreen — a brief emotional triage before entering the star system.
 *
 * Step 1: broad feeling  → determines which planet the user is routed to
 * Step 2: nuanced word   → sets a tailored writing prompt
 *
 * Naming a feeling precisely is regulating in itself, so the nuance step serves
 * the user as much as it serves routing. Skipping is always available — nobody
 * should be forced to categorise their distress before being allowed to speak.
 *
 * Responsive breakpoints:
 *   < 380px (narrow): 1-column grid, horizontal cards (emoji left, text right)
 *   380–767px (mobile): 2-column grid, 10px gap, 80px min-height cards
 *   ≥ 768px (desktop): existing 3-column grid layout
 */
export default function CheckInScreen() {
  const { setPhase, setSelectedPlanet, setCheckIn, setPostModalOpen } = useAppStore()

  const [step, setStep] = useState(1)
  const [feeling, setFeeling] = useState(null)

  const isMobile = useIsSmallScreen()
  const isNarrow = useIsNarrow()

  /** Route into the star system with the matching planet focused. */
  const enterSpace = ({ withComposer, feelingId, nuance }) => {
    if (feelingId) {
      const planet = getPlanetById(feelingId)
      if (planet) setSelectedPlanet(planet)
      setCheckIn({ feeling: feelingId, nuance: nuance?.id || null, prompt: nuance?.prompt || null })
    }
    setPhase('space')
    if (withComposer) setPostModalOpen(true)
  }

  const chooseFeeling = (f) => {
    setFeeling(f)
    setStep(2)
  }

  const chooseNuance = (n) => {
    enterSpace({ withComposer: true, feelingId: feeling.id, nuance: n })
  }

  // Determine grid classes based on breakpoint
  const getStep1GridClass = () => {
    if (isNarrow) return 'grid grid-cols-1 gap-2'
    if (isMobile) return 'grid grid-cols-2 gap-[10px]'
    return 'grid grid-cols-2 md:grid-cols-3 gap-3'
  }

  const getStep2GridClass = () => {
    if (isMobile) return 'grid grid-cols-2 gap-[10px]'
    return 'grid grid-cols-2 md:grid-cols-3 gap-3'
  }

  return (
    <>
      <PreloadManager />
      <div
        className="relative w-full h-full flex items-start justify-center p-4 md:p-6 overflow-y-auto"
        style={{ background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1a 100%)' }}
      >
      {/* Soft nebula accents behind the panel */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/5 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute bottom-1/5 right-1/5 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
      </div>

      <div
        className="relative z-10 w-full max-w-2xl flex flex-col gap-4 md:gap-6 animate-fade-in"
        style={isMobile ? { paddingTop: '4vh' } : undefined}
      >

        {/* ── Step 1: broad feeling ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <header className="text-center flex flex-col gap-1 md:gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Step 1 of 2
              </p>
              <h1
                className={`font-semibold text-white leading-snug ${
                  isMobile ? 'text-[1.25rem] line-clamp-3' : 'text-2xl md:text-3xl'
                }`}
              >
                No one needs to know but you.
                <br />
                <span className="text-violet-300">What are you truly feeling right now?</span>
              </h1>
              <p className="text-sm text-slate-500">
                This only guides where your words land. There is no wrong answer.
              </p>
            </header>

            <div
              className={getStep1GridClass()}
              style={isNarrow ? { maxHeight: '55vh', overflowY: 'auto' } : undefined}
            >
              {FEELINGS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => chooseFeeling(f)}
                  className={`glass rounded-2xl transition-all duration-200 hover:bg-white/10 hover:scale-[1.03]
                             focus:outline-none focus:ring-2 focus:ring-violet-400/60
                             ${isNarrow
                               ? 'flex flex-row items-center gap-3 p-3 min-h-[44px]'
                               : isMobile
                                 ? 'flex flex-col items-center gap-2 text-center p-3 min-h-[80px]'
                                 : 'p-3 sm:p-4 min-h-[44px] min-w-[44px] flex flex-col items-center gap-2 text-center'
                             }`}
                  style={{ borderColor: `${f.color}44` }}
                >
                  <span className={isNarrow ? 'text-2xl flex-shrink-0' : 'text-3xl'}>{f.emoji}</span>
                  <div className={isNarrow ? 'flex flex-col items-start text-left' : ''}>
                    <span className="font-semibold text-white text-sm">{f.label}</span>
                    <span className="text-xs text-slate-500 leading-snug">{f.sub}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: nuance ────────────────────────────────────────────── */}
        {step === 2 && feeling && (
          <>
            <header className="text-center flex flex-col gap-1 md:gap-2">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Step 2 of 2
              </p>
              <h1
                className={`font-semibold text-white leading-snug ${
                  isMobile ? 'text-[1.25rem] line-clamp-3' : 'text-2xl md:text-3xl'
                }`}
              >
                Let&apos;s get specific.
                <br />
                <span style={{ color: feeling.color }}>
                  Which word captures the nuance?
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Naming it more precisely often makes it easier to carry.
              </p>
            </header>

            <div className={getStep2GridClass()}>
              {feeling.nuances.map((n) => (
                <button
                  key={n.id}
                  onClick={() => chooseNuance(n)}
                  className={`glass rounded-2xl font-medium text-slate-200
                             transition-all duration-200 hover:bg-white/10 hover:scale-[1.03]
                             hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400/60
                             ${isMobile
                               ? 'px-3 py-3 min-h-[44px] text-[13px]'
                               : 'px-3 sm:px-4 py-4 sm:py-5 min-h-[44px] min-w-[44px] text-sm'
                             }`}
                  style={{ borderColor: `${feeling.color}44` }}
                >
                  {n.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setStep(1); setFeeling(null) }}
              className="text-xs text-slate-500 hover:text-slate-400 transition-colors self-center min-h-[44px] flex items-center"
            >
              ← Choose a different feeling
            </button>
          </>
        )}

        {/* ── Escape hatches ───────────────────────────────────────────────
            Always allow bypassing the questions. Someone in distress should
            never be gated behind a form. */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <button
            onClick={() => enterSpace({ withComposer: false })}
            className="glass px-5 py-2.5 rounded-xl text-sm text-slate-400
                       hover:text-white transition-colors min-h-[44px] flex items-center"
          >
            Skip — let me explore the star system
          </button>
          <button
            onClick={() => setPhase('avatar')}
            className="text-xs text-slate-700 hover:text-slate-500 transition-colors min-h-[44px] flex items-center"
          >
            ← Back to avatar
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
