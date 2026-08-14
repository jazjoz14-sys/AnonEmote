import React, { useState } from 'react'
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

function Section({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.15em] text-slate-500
                   hover:text-slate-300 transition-colors"
      >
        <span>{label}</span>
        <span className="text-[10px]">{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  )
}

export default function AvatarCustomizer() {
  const { avatar, setAvatar, setPhase } = useAppStore()

  return (
    <div className="absolute inset-0 z-20 flex items-end md:items-center md:justify-end
                    p-3 md:p-6 pointer-events-none overflow-y-auto">

      {/* Panel — pointer events re-enabled here so the canvas stays
          interactive everywhere else */}
      <div
        className="pointer-events-auto w-full md:w-[340px] md:max-h-[90vh] rounded-2xl p-4 md:p-5
                   flex flex-col gap-3 animate-slide-up"
        style={{
          background: 'rgba(10, 10, 26, 0.85)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 20px 50px -12px rgba(0,0,0,0.8)',
          maxHeight: 'calc(100vh - 24px)',
        }}
      >
        {/* Header */}
        <header className="flex flex-col gap-0.5">
          <h1 className="text-base font-semibold text-white">Shape your presence</h1>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            You are an energy form — no name, no face.
          </p>
        </header>

        {/* ── Shape ─────────────────────────────────────────────────────── */}
        <Section label="Form">
          <div className="grid grid-cols-5 gap-1.5">
            {SHAPES.map((s) => (
              <OptionButton
                key={s.id}
                selected={avatar.shape === s.id}
                onClick={() => setAvatar({ shape: s.id })}
                accent={avatar.auraColor}
                className="flex flex-col items-center gap-0.5 py-2.5 px-1"
              >
                <span className="text-base leading-none">{s.icon}</span>
                <span className="font-medium text-[10px] leading-tight">{s.label}</span>
              </OptionButton>
            ))}
          </div>
        </Section>

        {/* ── Aura colour ───────────────────────────────────────────────── */}
        <Section label="Aura" defaultOpen={false}>
          <div className="flex flex-wrap gap-1.5">
            {AURA_COLORS.map((c) => {
              const selected = avatar.auraColor === c.hex
              return (
                <button
                  key={c.id}
                  onClick={() => setAvatar({ auraColor: c.hex })}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={selected}
                  className={`w-7 h-7 rounded-full transition-all duration-200
                              focus:outline-none focus:ring-2 focus:ring-offset-1
                              focus:ring-offset-transparent focus:ring-white/50
                              ${selected
                                ? 'scale-125 ring-2 ring-white shadow-lg'
                                : 'ring-1 ring-white/20 hover:scale-110'}`}
                  style={{
                    backgroundColor: c.hex,
                    boxShadow: selected ? `0 0 14px ${c.hex}88` : undefined,
                  }}
                />
              )
            })}
          </div>
          <span className="text-[10px] text-slate-500">
            {AURA_COLORS.find((c) => c.hex === avatar.auraColor)?.label || 'Custom'}
          </span>
        </Section>

        {/* ── Particles ─────────────────────────────────────────────────── */}
        <Section label="Presence effect" defaultOpen={false}>
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
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Size — {avatar.scale.toFixed(1)}×
          </span>
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
        </div>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <button
          onClick={() => setPhase('checkin')}
          className="w-full py-3 rounded-xl text-sm font-medium text-white
                     border border-white/20
                     hover:bg-white hover:text-[#050510]
                     transition-all duration-300
                     focus:outline-none focus:ring-2 focus:ring-violet-400"
        >
          Continue →
        </button>

        <button
          onClick={() => setPhase('landing')}
          className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors text-center"
        >
          ← Back
        </button>
      </div>
    </div>
  )
}
