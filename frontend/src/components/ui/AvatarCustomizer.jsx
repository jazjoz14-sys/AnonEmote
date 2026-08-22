import React, { useState } from 'react'
import useAppStore from '../../store/useAppStore'
import { SHAPES, AURA_COLORS, PARTICLE_EFFECTS } from '../../data/avatarOptions'
import { useIsSmallScreen, useViewportSize } from '../../lib/device'
import { useOrientation } from '../../lib/viewport'
import Card from './Card'
import Button from './Button'

/**
 * AvatarCustomizer — panel for building the abstract avatar.
 *
 * Mobile (< 768px) Portrait:
 *   Renders as a bottom-anchored panel filling remaining viewport below the 45dvh canvas.
 *   Panel is independently scrollable with overscroll-behavior-y: contain.
 *   "Continue" button is sticky at bottom.
 *
 * Mobile Landscape:
 *   Right-aligned side panel at max 320px width. Canvas fills remaining left.
 *
 * Desktop (>= 768px):
 *   Overlaid panel on the right with bg-[#0d0d2b] solid background.
 *
 * NO glass-morphism: solid bg-[#0d0d2b] with border border-white/[0.08].
 * Selection options use Card variant="interactive" with selected state.
 */

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
  const forceCollapsed = isMobile && isShortViewport

  // ── Mobile Landscape: Right-aligned side panel ──────────────────────────
  if (landscape || (isMobile && isLandscape)) {
    return (
      <div
        className="h-full flex flex-col bg-[#0d0d2b] border-l border-white/[0.08]"
        style={{ width: '320px', maxWidth: '320px' }}
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
                <Card
                  key={s.id}
                  variant="interactive"
                  selected={avatar.shape === s.id}
                  className="flex flex-col items-center gap-0.5 py-2 px-0.5 cursor-pointer"
                  onClick={() => setAvatar({ shape: s.id })}
                  role="button"
                  aria-pressed={avatar.shape === s.id}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="font-medium text-[10px] leading-tight text-slate-300">{s.label}</span>
                </Card>
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
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
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
                <Card
                  key={p.id}
                  variant="interactive"
                  selected={avatar.particles === p.id}
                  className="flex flex-col items-center gap-0.5 py-3 cursor-pointer"
                  onClick={() => setAvatar({ particles: p.id })}
                  role="button"
                  aria-pressed={avatar.particles === p.id}
                >
                  <span className="font-medium text-xs text-slate-300">{p.label}</span>
                  <span className="text-[10px] text-slate-500 leading-tight text-center">
                    {p.hint}
                  </span>
                </Card>
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
        <div className="flex-shrink-0 p-4 pt-2 border-t border-white/[0.08]">
          <Button
            variant="primary"
            fullWidth
            onClick={() => setPhase('checkin')}
          >
            Continue →
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setPhase('landing')}
            className="mt-2"
          >
            ← Back
          </Button>
        </div>
      </div>
    )
  }

  // ── Mobile Portrait: Bottom-anchored panel ──────────────────────────────
  if (isMobile) {
    return (
      <div
        className="flex-1 flex flex-col bg-[#0d0d2b] border-t border-white/[0.08] rounded-t-2xl animate-slide-up"
        style={{ overflow: 'hidden' }}
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

          {/* Shape — 5-column grid */}
          <Section label="Form" forceCollapsed={forceCollapsed}>
            <div className="grid grid-cols-5 gap-1">
              {SHAPES.map((s) => (
                <Card
                  key={s.id}
                  variant="interactive"
                  selected={avatar.shape === s.id}
                  className="tap-compact flex flex-col items-center gap-0.5 py-2 px-0.5 cursor-pointer"
                  onClick={() => setAvatar({ shape: s.id })}
                  role="button"
                  aria-pressed={avatar.shape === s.id}
                  style={{ minWidth: '40px', minHeight: '40px' }}
                >
                  <span className="text-base leading-none">{s.icon}</span>
                  <span className="font-medium text-[9px] leading-tight text-slate-300">{s.label}</span>
                </Card>
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
                                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
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
                <Card
                  key={p.id}
                  variant="interactive"
                  selected={avatar.particles === p.id}
                  className="flex flex-col items-center gap-0.5 py-2 cursor-pointer"
                  onClick={() => setAvatar({ particles: p.id })}
                  role="button"
                  aria-pressed={avatar.particles === p.id}
                >
                  <span className="font-medium text-[11px] text-slate-300">{p.label}</span>
                  <span className="text-[9px] text-slate-500 leading-tight text-center">
                    {p.hint}
                  </span>
                </Card>
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
        <div className="flex-shrink-0 px-3 py-2 border-t border-white/[0.08]">
          <Button
            variant="primary"
            fullWidth
            onClick={() => setPhase('checkin')}
          >
            Continue →
          </Button>
          <Button
            variant="ghost"
            fullWidth
            onClick={() => setPhase('landing')}
            className="mt-1.5"
          >
            ← Back
          </Button>
        </div>
      </div>
    )
  }

  // ── Desktop: Overlaid panel ─────────────────────────────────────────────
  return (
    <div className="absolute inset-0 z-20 flex items-end md:items-center md:justify-end
                    p-3 md:p-6 pointer-events-none overflow-y-auto">

      {/* Panel — pointer events re-enabled here so the canvas stays
          interactive everywhere else */}
      <div
        className="pointer-events-auto w-full md:w-[340px] md:max-h-[90vh] rounded-2xl p-4 md:p-5
                   flex flex-col gap-3 animate-slide-up bg-[#0d0d2b] border border-white/[0.08]"
        style={{ maxHeight: 'calc(100vh - 24px)' }}
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
              <Card
                key={s.id}
                variant="interactive"
                selected={avatar.shape === s.id}
                className="flex flex-col items-center gap-0.5 py-2.5 px-1 cursor-pointer"
                onClick={() => setAvatar({ shape: s.id })}
                role="button"
                aria-pressed={avatar.shape === s.id}
              >
                <span className="text-base leading-none">{s.icon}</span>
                <span className="font-medium text-[10px] leading-tight text-slate-300">{s.label}</span>
              </Card>
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
                              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70
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
              <Card
                key={p.id}
                variant="interactive"
                selected={avatar.particles === p.id}
                className="flex flex-col items-center gap-0.5 py-3 cursor-pointer"
                onClick={() => setAvatar({ particles: p.id })}
                role="button"
                aria-pressed={avatar.particles === p.id}
              >
                <span className="font-medium text-xs text-slate-300">{p.label}</span>
                <span className="text-[10px] text-slate-500 leading-tight text-center">
                  {p.hint}
                </span>
              </Card>
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
        <Button
          variant="primary"
          fullWidth
          onClick={() => setPhase('checkin')}
        >
          Continue →
        </Button>

        <Button
          variant="ghost"
          fullWidth
          onClick={() => setPhase('landing')}
        >
          ← Back
        </Button>
      </div>
    </div>
  )
}
