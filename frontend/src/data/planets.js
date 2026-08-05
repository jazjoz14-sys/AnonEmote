/**
 * Emotion Planets configuration.
 *
 * Each planet is a geographically isolated sphere in the 3D star system
 * representing a distinct emotional state.
 *
 * ── Orbital mechanics ──────────────────────────────────────────────────────
 * Speeds are derived from Kepler's third law rather than hand-picked, so the
 * system behaves like a real solar system: planets close to the star sweep
 * around quickly, distant ones crawl.
 *
 *   T² ∝ a³        (orbital period squared ∝ semi-major axis cubed)
 *   ω = 2π / T  ⇒  ω ∝ r^(-3/2)
 *
 * So angular velocity is ORBITAL_CONSTANT / r^1.5, in radians per second.
 * Multiplied by frame delta at render time, making it frame-rate independent.
 */

/**
 * Scales the whole system's pace. Raise it to speed every planet up while
 * preserving the correct relative ratios between them.
 *
 * At 7.46 the innermost planet (r=12) takes ~35s per revolution and the
 * outermost (r=52) takes ~5min — a visible contrast without the far planets
 * appearing frozen.
 */
export const ORBITAL_CONSTANT = 7.46

/** Kepler's third law: angular velocity from orbital radius. */
export function orbitalSpeed(radius) {
  return ORBITAL_CONSTANT / Math.pow(radius, 1.5)
}

/** Orbital period in seconds — handy for tuning and for the admin dashboard. */
export function orbitalPeriod(radius) {
  return (2 * Math.PI) / orbitalSpeed(radius)
}

/**
 * Self-rotation rate. Inner planets are tidally stressed more by the star, so
 * giving them slightly faster spin adds to the sense of physical plausibility.
 */
function spinSpeed(radius) {
  return 0.34 - (radius / 52) * 0.2
}

const BASE_PLANETS = [
  {
    id: 'joy',
    label: 'Joy',
    emoji: '✨',
    description: 'Share your wins, gratitude, and happy moments.',
    color: '#f59e0b',
    emissive: '#78350f',
    orbitRadius: 12,
    size: 1.4,
    position: [12, 0, 0],
    ringColor: 'rgba(245,158,11,0.3)',
  },
  {
    id: 'vent',
    label: 'Venting',
    emoji: '🌧️',
    description: 'Let it out — frustrations, stress, academic burnout.',
    color: '#3b82f6',
    emissive: '#1e3a8a',
    orbitRadius: 20,
    size: 1.7,
    position: [-20, 2, -5],
    ringColor: 'rgba(59,130,246,0.3)',
  },
  {
    id: 'advice',
    label: 'Seek Advice',
    emoji: '🌿',
    description: 'Ask for guidance, perspective, and peer wisdom.',
    color: '#10b981',
    emissive: '#064e3b',
    orbitRadius: 28,
    size: 1.5,
    position: [5, -3, -28],
    ringColor: 'rgba(16,185,129,0.3)',
  },
  {
    id: 'grief',
    label: 'Grief & Loss',
    emoji: '🌑',
    description: 'A quiet space to process sadness and loss.',
    color: '#6366f1',
    emissive: '#312e81',
    orbitRadius: 36,
    size: 1.6,
    position: [-10, 4, 34],
    ringColor: 'rgba(99,102,241,0.3)',
  },
  {
    id: 'anxiety',
    label: 'Anxiety',
    emoji: '🌀',
    description: 'Share racing thoughts, worries, and overwhelm.',
    color: '#ec4899',
    emissive: '#831843',
    orbitRadius: 44,
    size: 1.3,
    position: [40, -2, -18],
    ringColor: 'rgba(236,72,153,0.3)',
  },
  {
    id: 'neutral',
    label: 'Reflections',
    emoji: '🪐',
    description: 'Calm observations, random thoughts, day-to-day musings.',
    color: '#94a3b8',
    emissive: '#334155',
    orbitRadius: 52,
    size: 2.0,
    position: [-48, 0, 20],
    ringColor: 'rgba(148,163,184,0.3)',
  },
  {
    id: 'doodle',
    label: 'Doodle Drift',
    emoji: '🎨',
    description: 'Draw what you feel — no words needed.',
    color: '#fb923c',
    emissive: '#7c2d12',
    orbitRadius: 62,
    size: 1.8,
    position: [58, 0, -22],
    ringColor: 'rgba(251,146,60,0.3)',
  },
]

/**
 * Final planet list with derived orbital values attached.
 *
 * Resulting periods (approx):
 *   Joy         r=12  →   35s
 *   Venting     r=20  →   75s
 *   Advice      r=28  →  125s
 *   Grief       r=36  →  182s
 *   Anxiety     r=44  →  246s
 *   Reflections r=52  →  317s
 */
export const PLANETS = BASE_PLANETS.map((p) => ({
  ...p,
  orbitSpeed: orbitalSpeed(p.orbitRadius),
  spinSpeed: spinSpeed(p.orbitRadius),
  periodSeconds: Math.round(orbitalPeriod(p.orbitRadius)),
}))

export const getPlanetById = (id) => PLANETS.find((p) => p.id === id)
