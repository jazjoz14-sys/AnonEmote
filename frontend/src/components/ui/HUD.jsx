import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { PLANETS } from '../../data/planets'
import { isSmallScreen } from '../../lib/device'
import PrivateNotesPanel from './PrivateNotesPanel'

/**
 * HUD — minimal overlay on the SpaceScreen.
 *
 * OkayDev-inspired: minimal chrome, uppercase micro-labels, border-only
 * buttons, monochrome with one accent. The 3D scene is the star — the UI
 * stays out of the way.
 */
export default function HUD({ peerCount = 0 }) {
  const { setPhase, setSelectedPlanet, privateNotes } = useAppStore()
  const [notesOpen, setNotesOpen] = useState(false)

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center
                      justify-between px-4 py-3 md:px-6 md:py-4 safe-top">

        {/* Left: back + notes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPhase('avatar')}
            className="px-3 py-1.5 rounded-sm text-xs tracking-[0.1em] uppercase
                       text-slate-300 border border-white/[0.15]
                       hover:text-white hover:border-white/30 transition-all"
            aria-label="Back to avatar"
          >
            ← Back
          </button>

          {privateNotes.length > 0 && (
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className="px-3 py-1.5 rounded-sm text-xs tracking-[0.1em] uppercase
                         text-slate-300 border border-white/[0.15]
                         hover:text-white hover:border-white/30 transition-all"
              aria-label="My private notes"
            >
              🔒 {privateNotes.length}
            </button>
          )}
        </div>

        {/* Centre: logo + online */}
        <div className="flex items-center gap-3">
          <img src="/icons/logo.png" alt="AnonEmote" className="w-6 h-6 opacity-70" draggable={false} />
          {peerCount > 0 && (
            <span className="flex items-center gap-1.5 text-xs tracking-[0.05em] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {peerCount + 1} online
            </span>
          )}
        </div>

        {/* Right: spacer for balance */}
        <div className="w-16" />
      </div>

      {/* ── Planet nav — bottom ────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
        <div className="flex gap-1 md:gap-1.5 px-3 pb-3 pt-2 md:px-4 md:pb-4
                        overflow-x-auto no-scrollbar justify-start md:justify-center
                        snap-x snap-mandatory">
          {PLANETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlanet(p)}
              className="px-4 py-2 md:px-4 md:py-2 rounded-sm
                         text-xs tracking-[0.05em] uppercase
                         font-medium text-slate-300 border border-white/[0.12]
                         hover:text-white hover:border-white/30 hover:bg-white/[0.05]
                         active:scale-95 transition-all duration-200
                         shrink-0 snap-start"
              aria-label={`Focus on ${p.label} planet`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Private notes panel */}
      {notesOpen && <PrivateNotesPanel onClose={() => setNotesOpen(false)} />}
    </>
  )
}
