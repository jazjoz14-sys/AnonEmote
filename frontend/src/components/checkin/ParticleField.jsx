/**
 * ParticleField — Ambient CSS-animated particles for the Mood Space.
 *
 * Renders small floating divs positioned absolutely within the MoodSpace container.
 * Particle opacity reacts to the cursor's pleasantness position via the CSS custom
 * property `--particle-opacity` set on the parent container — no prop changes trigger
 * re-renders, so CSS animations never restart mid-drag.
 *
 * Quality tier controls:
 *   'high'   → ~50 particles (range 20–80)
 *   'medium' → ~30 particles (range 20–40)
 *   'low'    → 0 particles (returns null)
 *
 * Requirements: 2.2, 2.3, 2.5, 2.6, 9.3, 9.5, 9.6
 */

import { useMemo } from 'react'

// ─── Seeded PRNG (mulberry32) ──────────────────────────────────────────────────

/**
 * Creates a seeded pseudo-random number generator (mulberry32).
 * Produces deterministic sequences for consistent particle placement across renders.
 *
 * @param {number} seed - Integer seed value
 * @returns {() => number} Function returning pseudo-random floats in [0, 1)
 */
function createPRNG(seed) {
  let s = seed | 0
  return function rand() {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Particle Count by Tier ────────────────────────────────────────────────────

/**
 * Returns the number of particles to render for a given quality tier.
 *
 * @param {'low' | 'medium' | 'high'} tier
 * @returns {number} Particle count (0 for low, ~30 for medium, ~50 for high)
 */
export function getParticleCount(tier) {
  switch (tier) {
    case 'high': return 50
    case 'medium': return 30
    case 'low': return 0
    default: return 30 // safe fallback
  }
}

// ─── CSS Keyframe Injection ────────────────────────────────────────────────────

/** Track whether the keyframe style has already been injected into the document. */
let keyframesInjected = false

/**
 * Injects the `particle-drift` CSS keyframe animation into the document head.
 * Called once on first render — subsequent calls are no-ops.
 */
function injectKeyframes() {
  if (keyframesInjected) return
  keyframesInjected = true

  const style = document.createElement('style')
  style.setAttribute('data-particle-field', '')
  style.textContent = `
    @keyframes particle-drift {
      0% {
        transform: translate(0, 0);
        opacity: var(--particle-opacity, 0.5);
      }
      25% {
        transform: translate(var(--drift-x), calc(var(--drift-y) * -1));
        opacity: calc(var(--particle-opacity, 0.5) * 0.7);
      }
      50% {
        transform: translate(calc(var(--drift-x) * -0.5), var(--drift-y));
        opacity: var(--particle-opacity, 0.5);
      }
      75% {
        transform: translate(calc(var(--drift-x) * -1), calc(var(--drift-y) * 0.5));
        opacity: calc(var(--particle-opacity, 0.5) * 0.8);
      }
      100% {
        transform: translate(0, 0);
        opacity: var(--particle-opacity, 0.5);
      }
    }
  `
  document.head.appendChild(style)
}

// ─── Particle Generation ───────────────────────────────────────────────────────

/**
 * Generates an array of particle descriptors with deterministic positions and
 * animation parameters. Uses a seeded PRNG so the layout is stable across
 * re-renders (only changes when tier changes).
 *
 * @param {number} count - Number of particles to generate
 * @param {number} seed - Seed for deterministic placement
 * @returns {Array<{ id: number, x: number, y: number, size: number, duration: number, delay: number, driftX: number, driftY: number }>}
 */
function generateParticles(count, seed) {
  const rand = createPRNG(seed)
  const particles = []

  for (let i = 0; i < count; i++) {
    particles.push({
      id: i,
      x: rand() * 100,            // % position left
      y: rand() * 100,            // % position top
      size: 2 + rand() * 4,       // 2–6px diameter
      duration: 4 + rand() * 8,   // 4–12s base animation cycle
      delay: rand() * 6,          // 0–6s stagger
      driftX: 3 + rand() * 6,     // 3–9px horizontal drift
      driftY: 3 + rand() * 6,     // 3–9px vertical drift
    })
  }

  return particles
}

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * ParticleField renders ambient floating particles within the MoodSpace.
 * All animation is CSS-driven — no rAF loops.
 *
 * Opacity is controlled by the `--particle-opacity` CSS custom property set on the
 * parent container (MoodSpace). This means cursor movement does NOT cause re-renders
 * of ParticleField — CSS animations continue uninterrupted.
 *
 * @param {Object} props
 * @param {'low' | 'medium' | 'high'} props.qualityTier - Device capability tier
 * @returns {JSX.Element | null}
 */
export default function ParticleField({ qualityTier = 'medium' }) {
  // Low tier: render nothing
  if (qualityTier === 'low') return null

  // Inject CSS keyframes on first meaningful render
  injectKeyframes()

  // Generate particles deterministically (stable across re-renders for same tier)
  const count = getParticleCount(qualityTier)
  const particles = useMemo(
    () => generateParticles(count, 42),
    [count]
  )

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: 'rgba(139, 92, 246, 0.8)', // violet-500 core
            boxShadow: `0 0 ${p.size}px rgba(139, 92, 246, 0.4)`,
            '--drift-x': `${p.driftX}px`,
            '--drift-y': `${p.driftY}px`,
            // Fixed duration per particle — never changes, so animation never restarts.
            // Opacity reads from parent's --particle-opacity CSS variable via the keyframe.
            animation: `particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite`,
            opacity: 'var(--particle-opacity, 0.5)',
            willChange: 'transform, opacity',
          }}
        />
      ))}
    </div>
  )
}
