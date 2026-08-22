import React, { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { FEELINGS } from '../data/emotions'
import { getPlanetById } from '../data/planets'
import { useIsSmallScreen, useIsNarrow } from '../lib/device'
import PreloadManager from '../components/3d/models/PreloadManager'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

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
 *
 * Visual: cosmic monochrome + violet accent (#8b5cf6).
 *   - Solid #050510 background (no gradients)
 *   - Outline-only cards (border-white/[0.08], bg-transparent)
 *   - No glass-morphism, blur effects, or colored border tints
 *   - Focus ring: 2px violet-500/60 on keyboard navigation
 *   - Hover: border-white/20 + subtle scale transform
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
        className="relative w-full h-full flex items-start justify-center p-4 md:p-6 overflow-y-auto overflow-x-hidden bg-[#050510]"
      >

      <div
        className="relative z-10 w-full max-w-2xl flex flex-col gap-4 md:gap-6 animate-fade-in"
        style={isMobile ? { paddingTop: '4vh' } : undefined}
      >

        {/* ── Step 1: broad feeling ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <header className="text-center flex flex-col gap-1 md:gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
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
              <p className="text-sm text-white/60">
                This only guides where your words land. There is no wrong answer.
              </p>
            </header>

            <div
              className={getStep1GridClass()}
              style={isNarrow ? { maxHeight: '55vh', overflowY: 'auto' } : undefined}
            >
              {FEELINGS.map((f) => (
                <Card
                  key={f.id}
                  variant="interactive"
                  onClick={() => chooseFeeling(f)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseFeeling(f) } }}
                  className={`hover:scale-[1.02]
                             ${isNarrow
                               ? 'flex flex-row items-center gap-3 p-3 min-h-[44px]'
                               : isMobile
                                 ? 'flex flex-col items-center gap-2 text-center p-3 min-h-[80px]'
                                 : 'p-3 sm:p-4 min-h-[44px] min-w-[44px] flex flex-col items-center gap-2 text-center'
                             }`}
                >
                  <span className={isNarrow ? 'text-2xl flex-shrink-0' : 'text-3xl'}>{f.emoji}</span>
                  <div className={isNarrow ? 'flex flex-col items-start text-left' : ''}>
                    <span className="font-semibold text-white text-sm">{f.label}</span>
                    <span className="text-xs text-white/60 leading-snug">{f.sub}</span>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: nuance ────────────────────────────────────────────── */}
        {step === 2 && feeling && (
          <>
            <header className="text-center flex flex-col gap-1 md:gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                Step 2 of 2
              </p>
              <h1
                className={`font-semibold text-white leading-snug ${
                  isMobile ? 'text-[1.25rem] line-clamp-3' : 'text-2xl md:text-3xl'
                }`}
              >
                Let&apos;s get specific.
                <br />
                <span className="text-violet-300">
                  Which word captures the nuance?
                </span>
              </h1>
              <p className="text-sm text-white/60">
                Naming it more precisely often makes it easier to carry.
              </p>
            </header>

            <div className={getStep2GridClass()}>
              {feeling.nuances.map((n) => (
                <Card
                  key={n.id}
                  variant="interactive"
                  onClick={() => chooseNuance(n)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseNuance(n) } }}
                  className={`hover:scale-[1.02] font-medium text-white/70 hover:text-white
                             ${isMobile
                               ? 'px-3 py-3 min-h-[44px] text-[13px]'
                               : 'px-3 sm:px-4 py-4 sm:py-5 min-h-[44px] min-w-[44px] text-sm'
                             }`}
                >
                  {n.label}
                </Card>
              ))}
            </div>

            <Button
              variant="ghost"
              onClick={() => { setStep(1); setFeeling(null) }}
              className="self-center"
            >
              ← Choose a different feeling
            </Button>
          </>
        )}

        {/* ── Escape hatches ───────────────────────────────────────────────
            Always allow bypassing the questions. Someone in distress should
            never be gated behind a form. */}
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            variant="secondary"
            onClick={() => enterSpace({ withComposer: false })}
          >
            Skip — let me explore the star system
          </Button>
          <Button
            variant="ghost"
            onClick={() => setPhase('avatar')}
          >
            ← Back to avatar
          </Button>
        </div>
      </div>
    </div>
    </>
  )
}
