import React from 'react'
import useAppStore from '../../store/useAppStore'
import { SHAPES, AURA_COLORS, PARTICLE_EFFECTS } from '../../data/avatarOptions'

/**
 * AvatarCustomizer — glassmorphism overlay for building the abstract avatar.
 *
 * Positioned over the <Canvas> so the user sees their form update live behind
 * the controls. Every option is deliberately non-representational: no human
 * traits are offered, which keeps the avatar incapable of implying identity.
 */

/** Shared option-button styling with a selected state. */
function OptionButton({ selected, onClick, children, accent, className = '' }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-2xl px-4 py-3 text-sm transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-violet-400/60
                  ${selected
                    ? 'bg-white/15 text-white ring-1'
                    : 'bg-white/[0.06] text-slate-400 hover:bg-white/10 hover:text-slate-200'}
                  ${className}`}
      style={selected && accent ? { '--tw-ring-color': accent } : undefined}
    >
      {children}
    </button>
  )
}

function Section({ label, children }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </span>
      {children}
    </div>
  )
}

export default function AvatarCustomizer() {
  const { avatar, setAvatar, setPhase } = useAppStore()

  return (
    <div className="absolute inset-0 z-20 flex items-end md:items-center md:justify-end
                    p-4 md:p-8 pointer-events-none overflow-y-auto">

      {/* Panel — pointer events re-enabled here so the canvas stays
          interactive everywhere else */}
      <div
        className="pointer-events-auto w-full md:w-[360px] rounded-3xl p-5
                   flex flex-col gap-5 animate-slide-up"
        style={{
          background: 'rgba(250, 250, 250, 0.10)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          border: '1px solid rgba(232, 232, 232, 0.22)',
          boxShadow: '0 20px 50px -12px rgba(0,0,0,0.7)',
        }}
      >
        {/* Header */}
        <header className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-white">Shape your presence</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            You are an energy form here — no name, no face, nothing that points
            back to you.
          </p>
        </header>

        {/* ── Shape ─────────────────────────────────────────────────────── */}
        <Section label="Form">
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map((s) => (
              <OptionButton
                key={s.id}
                selected={avatar.shape === s.id}
                onClick={() => setAvatar({ shape: s.id })}
                accent={avatar.auraColor}
                className="flex flex-col items-center gap-1 py-3"
              >
                <span className="text-lg leading-none">{s.icon}</span>
                <span className="font-medium">{s.label}</span>
                <span className="text-[10px] text-slate-500 leading-tight text-center">
                  {s.hint}
                </span>
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* ── Aura colour ───────────────────────────────────────────────── */}
        <Section label="Aura">
          <div className="flex flex-wrap gap-2">
            {AURA_COLORS.map((c) => {
              const selected = avatar.auraColor === c.hex
              return (
                <button
                  key={c.id}
                  onClick={() => setAvatar({ auraColor: c.hex })}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={selected}
                  className={`w-10 h-10 rounded-full transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-offset-2
                              focus:ring-offset-transparent focus:ring-white/50
                              ${selected
                                ? 'scale-110 ring-2 ring-white shadow-lg'
                                : 'ring-1 ring-white/20 hover:scale-105'}`}
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: selected ? `0 0 18px ${c.hex}88` : undefined,
                  }}
                />
              )
            })}
          </div>
          <span className="text-[11px] text-slate-500">
            {AURA_COLORS.find((c) => c.hex === avatar.auraColor)?.label || 'Custom'}
          </span>
        </Section>

        {/* ── Particles ─────────────────────────────────────────────────── */}
        <Section label="Presence effect">
          <div className="grid grid-cols-3 gap-2">
            {PARTICLE_EFFECTS.map((p) => (
              <OptionButton
                key={p.id}
                selected={avatar.particles === p.id}
                onClick={() => setAvatar({ particles: p.id })}
                accent={avatar.auraColor}
                className="flex flex-col items-center gap-0.5 py-3"
              >
                <span className="font-medium text-xs">{p.label}</span>
                <span className="text-[10px] text-slate-500 leading-tight text-center">
                  {p.hint}
                </span>
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* ── Scale ─────────────────────────────────────────────────────── */}
        <Section label={`Size — ${avatar.scale.toFixed(1)}×`}>
          <input
            type="range"
            min="0.6"
            max="1.6"
            step="0.1"
            value={avatar.scale}
            onChange={(e) => setAvatar({ scale: parseFloat(e.target.value) })}
            className="w-full accent-violet-400"
            aria-label="Avatar size"
          />
        </Section>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <button
          onClick={() => setPhase('checkin')}
          className="w-full py-3.5 rounded-2xl font-semibold text-white
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-500 hover:to-indigo-500
                     transition-all duration-300 shadow-lg shadow-violet-900/40
                     focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          Continue →
        </button>

        <button
          onClick={() => setPhase('landing')}
          className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
