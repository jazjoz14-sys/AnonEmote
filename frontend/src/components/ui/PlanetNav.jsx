import React, { useEffect, useRef, useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { PLANETS } from '../../data/planets'
import { useIsSmallScreen } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'

/**
 * Abbreviated labels for narrow viewports (< 380px).
 * Each ≤ 7 chars so at least 4 fit without overflow.
 */
const NARROW_LABELS = {
  joy: 'Joy',
  vent: 'Vent',
  advice: 'Advice',
  grief: 'Grief',
  anxiety: 'Anx',
  neutral: 'Reflect',
  doodle: 'Doodle',
}

/**
 * Hook that returns true when viewport width is below 380px.
 * @returns {boolean}
 */
function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => window.innerWidth < 380)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 379px)')
    const handler = (e) => setNarrow(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return narrow
}

/**
 * PlanetNav — responsive planet navigation bar.
 *
 * Design tokens applied:
 *   - 44px minimum touch targets on mobile (min-w-[44px] min-h-[44px])
 *   - focus-visible: 2px white/70 outline offset by 2px on all planet buttons
 *   - border-white/30 for active border accent
 *   - Monochrome text + planet color accent on active only
 *
 * Mobile portrait: horizontal scrollable row at bottom (≤ 44px height)
 * Narrow (<380px): abbreviated labels
 * Landscape: vertical column on left edge with emoji-only buttons
 * Desktop: centered row with standard labels
 */
export default function PlanetNav({ showPulseHint = false, onPlanetClick }) {
  const { selectedPlanet, setSelectedPlanet } = useAppStore()
  const isMobile = useIsSmallScreen()
  const isNarrow = useIsNarrow()
  const { isLandscape } = useOrientation()
  const scrollRef = useRef(null)
  const buttonRefs = useRef({})

  /** First planet in orbit order — receives the pulse hint glow */
  const firstPlanetId = PLANETS[0]?.id

  const handleSelect = (planet) => {
    setSelectedPlanet(planet)
    onPlanetClick?.()
  }

  // Auto-scroll active button into view on selection change (mobile only)
  useEffect(() => {
    if (!selectedPlanet || !isMobile || isLandscape) return
    const activeBtn = buttonRefs.current[selectedPlanet.id]
    if (!activeBtn) return

    // Smooth scroll the active button into view within 300ms
    const timeout = setTimeout(() => {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }, 0)

    return () => clearTimeout(timeout)
  }, [selectedPlanet, isMobile, isLandscape])

  const activePlanetId = selectedPlanet?.id ?? null

  // ── Landscape: vertical column on left edge ────────────────────────────
  if (isMobile && isLandscape) {
    return (
      <nav
        data-onboarding="planet-nav"
        className="fixed left-0 top-0 bottom-0 z-20 flex flex-col items-center
                   justify-center gap-1 bg-black/30 backdrop-blur-sm"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
        }}
        aria-label="Planet navigation"
      >
        {PLANETS.map((p) => {
          const isActive = activePlanetId === p.id
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              {...(p.id === 'doodle' ? { 'data-onboarding': 'doodle-planet' } : {})}
              className={`flex items-center justify-center shrink-0
                         transition-all duration-200
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                         ${isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
              style={{
                width: '44px',
                height: '44px',
                fontSize: '18px',
                borderRight: isActive ? `2px solid ${p.color}` : '2px solid transparent',
                ...(showPulseHint && p.id === firstPlanetId && !isActive
                  ? { boxShadow: `0 0 12px 4px ${p.color}88`, animation: 'planet-hint-pulse 1.2s ease-in-out infinite' }
                  : {}),
              }}
              aria-label={`Focus on ${p.label} planet`}
              aria-current={isActive ? 'true' : undefined}
            >
              {p.emoji}
            </button>
          )
        })}
      </nav>
    )
  }

  // ── Mobile portrait: horizontal scrollable row at bottom ───────────────
  if (isMobile) {
    return (
      <nav
        data-onboarding="planet-nav"
        className="fixed bottom-0 left-0 right-0 z-20 bg-black/30 backdrop-blur-sm"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Planet navigation"
      >
        <div
          ref={scrollRef}
          className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory
                     px-2 pt-[6px] pb-[8px] gap-1"
          style={{ maxHeight: '44px' }}
        >
          {PLANETS.map((p) => {
            const isActive = activePlanetId === p.id
            const label = isNarrow ? NARROW_LABELS[p.id] : p.label
            return (
              <button
                key={p.id}
                ref={(el) => { buttonRefs.current[p.id] = el }}
                onClick={() => handleSelect(p)}
                {...(p.id === 'doodle' ? { 'data-onboarding': 'doodle-planet' } : {})}
                className={`tap-compact shrink-0 snap-start px-3 py-1.5 relative
                           tracking-[0.03em] uppercase font-medium
                           transition-all duration-200
                           focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                           ${isActive
                             ? 'text-white'
                             : 'text-slate-300 hover:text-white hover:bg-white/[0.05]'
                           }`}
                style={{
                  fontSize: '10px',
                  minWidth: '44px',
                  minHeight: '44px',
                  lineHeight: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: isActive
                    ? `2px solid ${p.color}`
                    : '2px solid transparent',
                  ...(showPulseHint && p.id === firstPlanetId && !isActive
                    ? { boxShadow: `0 0 12px 4px ${p.color}88`, animation: 'planet-hint-pulse 1.2s ease-in-out infinite' }
                    : {}),
                }}
                aria-label={`Focus on ${p.label} planet`}
                aria-current={isActive ? 'true' : undefined}
              >
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    )
  }

  // ── Desktop: centered row ──────────────────────────────────────────────
  return (
    <nav
      data-onboarding="planet-nav"
      className="absolute bottom-0 left-0 right-0 z-20"
      aria-label="Planet navigation"
    >
      <div className="flex gap-1.5 px-4 pb-4 pt-2 justify-center">
        {PLANETS.map((p) => {
          const isActive = activePlanetId === p.id
          return (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              {...(p.id === 'doodle' ? { 'data-onboarding': 'doodle-planet' } : {})}
              className={`px-4 py-2 rounded-sm text-xs tracking-[0.05em] uppercase
                         font-medium border transition-all duration-200
                         active:scale-95
                         focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
                         ${isActive
                           ? 'text-white border-white/30 bg-white/[0.08]'
                           : 'text-slate-300 border-white/[0.12] hover:text-white hover:border-white/30 hover:bg-white/[0.05]'
                         }`}
              style={{
                borderBottom: isActive ? `2px solid ${p.color}` : undefined,
                ...(showPulseHint && p.id === firstPlanetId && !isActive
                  ? { boxShadow: `0 0 14px 5px ${p.color}88`, animation: 'planet-hint-pulse 1.2s ease-in-out infinite' }
                  : {}),
              }}
              aria-label={`Focus on ${p.label} planet`}
              aria-current={isActive ? 'true' : undefined}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
