import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { SHAPES, AURA_COLORS, PARTICLE_EFFECTS } from '../../data/avatarOptions'
import { useIsSmallScreen, useViewportSize } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'

/**
 * AvatarCustomizer — glassmorphism overlay for building the abstract avatar.
 *
 * Mobile (< 768px) Portrait:
 *   Renders as a bottom-anchored panel at max 55dvh. Panel is scrollable
 *   with overscroll-behavior-y: contain. "Continue" button is sticky at bottom.
 *   When viewport height < 600px (landscape phones): reduce to 45dvh max,
 *   collapse accordions by default.
 *
 * Mobile Landscape:
 *   Right-aligned side panel at max 320px width. Canvas fills remaining left.
 *
 * Desktop (≥ 768px):
 *   Original overlaid glassmorphism panel on the right.
 *
 * Shape grid always uses 5-column layout with compact padding on mobile.
 */

/** Shared option-button styling with a selected state. */
function OptionButton({ selected, onClick, children, accent, className = '', style }) {
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
      style={{ ...(selected && accent ? { '--tw-ring-color': accent } : {}), ...style }}
    >
      {children}
    </button>
  )
}

/**
 * Collapsible section accordion.
 * On mobile landscape (< 600px height), defaults to closed to minimize initial height.
 */
function Section({ label, children, defaultOpen = true, forceCollapsed = false }) {
  const [open, setOpen] = useState(forceCollapsed ? false : defaultOpen)
  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="tap-compact flex items-center justify-between text-xs font-semibold uppercase tracking-[0.15em] text-slate-500
                   hover:text-slate-300 transition-colors"
      >
        <span>{label}</span>
        <span className="text-[10px]">{open ? '▾' : '▸'}</span>
      </button>
      {open && children}
    </div>
  )
}

export default function AvatarCustomizer({ landscape = false }) {
  const { avatar, setAvatar, setPhase } = useAppStore()
  const isMobile = useIsSmallScreen()
  const { height: viewportHeight } = useViewportSize()
  const { isLandscape } = useOrientation()

  // Determine if we're in a short viewport (landscape phone scenario)
  const isShortViewport = viewportHeight < 600

  // Determine if sections should be collapsed by default
  // Landscape (< 600px height): collapse all accordions by default
  const forceCollapsed = isMobile && isShortViewport

  // ── Mobile Landscape: Right-aligned side panel ──────────────────────────
  if (landscape || (isMobile && isLandscape)) {
    return (
      <div
        className="h-full flex flex-col"
        style={{
          width: '320px',
          maxWidth: '320px',
          background: 'rgba(10, 10, 26, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '-10px 0 30px -12px rgba(0,0,0,0.6)',
        }}
      >
        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto p-4 flex flex-col gap-3"
          style={{
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Header */}
          <header className="flex flex-col gap-0.5">
            <h1 className="text-base font-semibold text-white">Shape your presence</h1>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              You are an energy form — no name, no face.
            </p>
          </header>

          {/* Shape */}
          <Section label="Form" forceCollapsed={forceCollapsed}>
            <div className="grid grid-cols-5 gap-1">
              {SHAPES.map((s) => (
                <OptionButton
                  key={s.id}
                  selected={avatar.shape === s.id}
                  onClick={() => setAvatar({ shape: s.id })}
                  accent={avatar.auraColor}
                  className="flex flex-col items-center gap-0.5 py-2 px-0.5"
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="font-medium text-[10px] leading-tight">{s.label}</span>
                </OptionButton>
              ))}
            </div>
          </Section>

          {/* Aura */}
          <Section label="Aura" defaultOpen={false} forceCollapsed={forceCollapsed}>
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
                    className={`tap-compact swatch w-7 h-7 rounded-full transition-all duration-200
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

          {/* Particles */}
          <Section label="Presence effect" defaultOpen={false} forceCollapsed={forceCollapsed}>
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

          {/* Scale */}
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
        </div>

        {/* Sticky action buttons at bottom */}
        <div className="flex-shrink-0 p-4 pt-2 border-t border-white/5">
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
            className="tap-compact w-full mt-2 text-[11px] text-slate-600 hover:text-slate-400 transition-colors text-center"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ── Mobile Portrait: Bottom-anchored panel ──────────────────────────────
  if (isMobile) {
    // Max height: 55dvh default, 45dvh if viewport height < 600px
    const maxHeight = isShortViewport ? '45dvh' : '55dvh'

    return (
      <div
        className="flex flex-col animate-slide-up"
        style={{
          maxHeight,
          background: 'rgba(10, 10, 26, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 -10px 30px -12px rgba(0,0,0,0.6)',
          borderRadius: '16px 16px 0 0',
        }}
      >
        {/* Scrollable options area with overscroll containment */}
        <div
          className="flex-1 overflow-y-auto p-3 pb-0 flex flex-col gap-2"
          style={{
            overscrollBehaviorY: 'contain',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Header */}
          <header className="flex flex-col gap-0.5">
            <h1 className="text-sm font-semibold text-white">Shape your presence</h1>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              You are an energy form — no name, no face.
            </p>
          </header>

          {/* Shape — 5-column, 40×40px tap area per button, 4px spacing (44px center-to-center) */}
          <Section label="Form" forceCollapsed={forceCollapsed}>
            <div className="grid grid-cols-5 gap-1">
              {SHAPES.map((s) => (
                <OptionButton
                  key={s.id}
                  selected={avatar.shape === s.id}
                  onClick={() => setAvatar({ shape: s.id })}
                  accent={avatar.auraColor}
                  className="tap-compact flex flex-col items-center gap-0.5 py-2 px-0.5 rounded-xl"
                  style={{ minWidth: '40px', minHeight: '40px' }}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="font-medium text-[9px] leading-tight">{s.label}</span>
                </OptionButton>
              ))}
            </div>
          </Section>

          {/* Aura */}
          <Section label="Aura" defaultOpen={false} forceCollapsed={forceCollapsed}>
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
                    className={`tap-compact swatch w-6 h-6 rounded-full transition-all duration-200
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

          {/* Particles */}
          <Section label="Presence effect" defaultOpen={false} forceCollapsed={forceCollapsed}>
            <div className="grid grid-cols-3 gap-1.5">
              {PARTICLE_EFFECTS.map((p) => (
                <OptionButton
                  key={p.id}
                  selected={avatar.particles === p.id}
                  onClick={() => setAvatar({ particles: p.id })}
                  accent={avatar.auraColor}
                  className="flex flex-col items-center gap-0.5 py-2"
                >
                  <span className="font-medium text-[11px]">{p.label}</span>
                  <span className="text-[9px] text-slate-500 leading-tight text-center">
                    {p.hint}
                  </span>
                </OptionButton>
              ))}
            </div>
          </Section>

          {/* Scale */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
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
        </div>

        {/* Sticky "Continue" button at panel bottom */}
        <div className="flex-shrink-0 px-3 py-2 border-t border-white/5">
          <button
            onClick={() => setPhase('checkin')}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-white
                       border border-white/20
                       hover:bg-white hover:text-[#050510]
                       transition-all duration-300
                       focus:outline-none focus:ring-2 focus:ring-violet-400"
          >
            Continue →
          </button>
          <button
            onClick={() => setPhase('landing')}
            className="tap-compact w-full mt-1.5 text-[11px] text-slate-600 hover:text-slate-400 transition-colors text-center"
          >
            ← Back
          </button>
        </div>
      </div>
    )
  }

  // ── Desktop: Original overlaid panel ────────────────────────────────────
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
