import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { PLANETS } from '../../data/planets'
import { isSmallScreen } from '../../lib/device'
import PrivateNotesPanel from './PrivateNotesPanel'

/**
 * HUD — overlay interface on the SpaceScreen.
 *
 * On desktop: top bar, side controls hint, bottom planet strip.
 * On mobile: compact top bar, bottom planet strip with larger touch targets,
 *            no controls hint, no floating buttons that overlap the 3D scene.
 */
export default function HUD() {
  const { setPhase, sessionId, setSelectedPlanet, privateNotes } = useAppStore()
  const [notesOpen, setNotesOpen] = useState(false)

  const shortId = sessionId ? sessionId.slice(0, 8).toUpperCase() : '--------'

  return (
    <>
      {/* ── Top bar ────────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center
                      justify-between px-3 py-2 md:px-5 md:py-3 safe-top">

        {/* Left: back + notes */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setPhase('avatar')}
            className="glass px-3 py-2 rounded-xl text-xs text-slate-400
                       hover:text-white transition-colors"
            aria-label="Back to avatar"
          >
            ←
          </button>

          {privateNotes.length > 0 && (
            <button
              onClick={() => setNotesOpen((v) => !v)}
              className="glass px-3 py-2 rounded-xl text-xs text-slate-400
                         hover:text-white transition-colors"
              aria-label="My private notes"
            >
              🔒 <span className="text-violet-300 ml-0.5">{privateNotes.length}</span>
            </button>
          )}
        </div>

        {/* Centre: branding */}
        <div className="glass px-3 py-1.5 md:px-5 md:py-2.5 rounded-2xl
                        flex items-center gap-2">
          <span className="text-base md:text-lg font-bold text-white">✦</span>
          <span className="hidden md:inline text-sm font-bold text-white">AnonEmote</span>
          <span className="hidden md:inline w-px h-4 bg-white/10" />
          <span className="text-[10px] md:text-xs text-slate-400 font-mono">
            {shortId}
          </span>
        </div>

        {/* Right: controls hint (desktop only) */}
        <div className="hidden md:block glass px-3 py-2 rounded-xl text-xs
                        text-slate-500 leading-relaxed">
          <p>🖱 Drag to rotate</p>
          <p>⚙ Scroll to zoom</p>
          <p>🪐 Tap planet to focus</p>
        </div>

        {/* Right spacer on mobile so the top bar stays centred */}
        <div className="w-10 md:hidden" />
      </div>

      {/* ── Planet navigation — bottom ─────────────────────────────────────
          On mobile this is the primary way to reach a planet, since tapping
          a small sphere is unreliable on touch. Horizontally scrollable
          with large touch targets. */}
      <div className="absolute bottom-0 left-0 right-0 z-20 safe-bottom">
        <div className="flex gap-1.5 md:gap-2 px-3 pb-3 pt-2 md:px-4 md:pb-4
                        overflow-x-auto no-scrollbar justify-start md:justify-center
                        snap-x snap-mandatory">
          {PLANETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlanet(p)}
              className="glass px-3 py-2.5 md:px-3 md:py-1.5 rounded-2xl md:rounded-full
                         text-xs font-medium text-slate-300
                         hover:text-white transition-all duration-200
                         hover:scale-105 active:scale-95
                         shrink-0 snap-start"
              style={{ borderColor: p.color + '44' }}
              aria-label={`Focus on ${p.label} planet`}
            >
              <span className="text-sm md:text-xs">{p.emoji}</span>{' '}
              <span className="text-xs">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Private notes panel */}
      {notesOpen && <PrivateNotesPanel onClose={() => setNotesOpen(false)} />}
    </>
  )
}
