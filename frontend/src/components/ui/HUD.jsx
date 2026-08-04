import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { PLANETS } from '../../data/planets'
import PrivateNotesPanel from './PrivateNotesPanel'

/**
 * HUD — The glassmorphism overlay on the SpaceScreen.
 * Shows the planet legend, session info, and back button.
 */
export default function HUD() {
  const { setPhase, sessionId, setSelectedPlanet, privateNotes } = useAppStore()
  const [notesOpen, setNotesOpen] = useState(false)

  const shortId = sessionId ? sessionId.slice(0, 8).toUpperCase() : '--------'

  return (
    <>
      {/* Top bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 glass px-5 py-2.5 rounded-2xl">
        <span className="text-lg font-bold text-white">✦ AnonEmote</span>
        <span className="w-px h-4 bg-white/10" />
        <span className="text-xs text-slate-400 font-mono">ID: {shortId}</span>
      </div>

      {/* Back button */}
      <button
        onClick={() => setPhase('avatar')}
        className="absolute top-4 left-4 z-20 glass px-4 py-2 rounded-xl text-sm text-slate-400
                   hover:text-white transition-colors"
        aria-label="Back to avatar customization"
      >
        ← Avatar
      </button>

      {/* Private notes — only shown once the user has saved something */}
      {privateNotes.length > 0 && (
        <button
          onClick={() => setNotesOpen((v) => !v)}
          className="absolute top-16 left-4 z-20 glass px-4 py-2 rounded-xl text-sm
                     text-slate-400 hover:text-white transition-colors"
          aria-label="My private notes"
        >
          🔒 My notes
          <span className="ml-1 text-xs text-violet-300">{privateNotes.length}</span>
        </button>
      )}

      {notesOpen && <PrivateNotesPanel onClose={() => setNotesOpen(false)} />}

      {/* Planet legend — bottom */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 flex-wrap justify-center max-w-2xl px-4">
        {PLANETS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlanet(p)}
            className="glass px-3 py-1.5 rounded-full text-xs font-medium text-slate-300
                       hover:text-white transition-all duration-200 hover:scale-105"
            style={{ borderColor: p.color + '44' }}
            aria-label={`Focus on ${p.label} planet`}
          >
            <span>{p.emoji}</span> {p.label}
          </button>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute top-4 right-4 z-20 glass px-3 py-2 rounded-xl text-xs text-slate-500 leading-relaxed">
        <p>🖱 Drag to rotate</p>
        <p>⚙ Scroll to zoom</p>
        <p>🪐 Click a planet to focus</p>
        <p>✦ Click space to zoom out</p>
      </div>
    </>
  )
}
