/**
 * Abstract avatar options.
 *
 * Deliberately non-human: no faces, skin tones, body types or gendered forms.
 * Users customise an energy form instead, so nothing about the avatar can leak
 * or imply identity. This is the visual expression of the zero-knowledge
 * architecture, not just a style choice.
 */

export const SHAPES = [
  // ── Smooth forms ─────────────────────────────────────────────────────────
  { id: 'orb',       label: 'Orb',       hint: 'Steady and whole',       icon: '⬤',  geo: 'icosahedron' },
  { id: 'spirit',    label: 'Spirit',    hint: 'Soft and drifting',      icon: '❋',  geo: 'capsule' },
  { id: 'droplet',   label: 'Droplet',   hint: 'Fluid and adaptive',    icon: '💧', geo: 'sphere' },

  // ── Angular forms ────────────────────────────────────────────────────────
  { id: 'prism',     label: 'Prism',     hint: 'Sharp and faceted',      icon: '◆',  geo: 'octahedron' },
  { id: 'crystal',   label: 'Crystal',   hint: 'Structured clarity',     icon: '💎', geo: 'dodecahedron' },
  { id: 'shard',     label: 'Shard',     hint: 'Raw and unpolished',     icon: '🔷', geo: 'tetrahedron' },

  // ── Ring / toroid forms ──────────────────────────────────────────────────
  { id: 'halo',      label: 'Halo',      hint: 'Open and receptive',     icon: '◎',  geo: 'torus' },
  { id: 'knot',      label: 'Knot',      hint: 'Intertwined layers',     icon: '∞',  geo: 'torusKnot' },

  // ── Irregular forms ──────────────────────────────────────────────────────
  { id: 'nebula',    label: 'Nebula',    hint: 'Expanding outward',      icon: '☁️', geo: 'icosahedronLow' },
  { id: 'spark',     label: 'Spark',     hint: 'Bright and fleeting',    icon: '✦',  geo: 'cone' },
]

export const AURA_COLORS = [
  // ── Cool tones ───────────────────────────────────────────────────────────
  { id: 'silver',      label: 'Soft Silver',       hex: '#F3F4F6' },
  { id: 'starlight',   label: 'Starlight White',   hex: '#FFFFFF' },
  { id: 'ice',         label: 'Ice Blue',          hex: '#BAE6FD' },
  { id: 'mint',        label: 'Pale Mint',         hex: '#A7F3D0' },
  { id: 'lavender',    label: 'Lavender',          hex: '#DDD6FE' },
  { id: 'violet',      label: 'Dusk Violet',       hex: '#C4B5FD' },
  { id: 'periwinkle',  label: 'Periwinkle',        hex: '#A5B4FC' },
  { id: 'aqua',        label: 'Aqua',              hex: '#67E8F9' },

  // ── Warm tones ───────────────────────────────────────────────────────────
  { id: 'gold',        label: 'Warm Gold',         hex: '#FEF08A' },
  { id: 'amber',       label: 'Amber Glow',        hex: '#FCD34D' },
  { id: 'peach',       label: 'Soft Peach',        hex: '#FECACA' },
  { id: 'rose',        label: 'Quiet Rose',        hex: '#FBCFE8' },
  { id: 'coral',       label: 'Living Coral',      hex: '#FDA4AF' },
  { id: 'sunset',      label: 'Sunset',            hex: '#FCA5A5' },

  // ── Deep tones (still emissive — these glow against dark space) ──────────
  { id: 'emerald',     label: 'Deep Emerald',      hex: '#6EE7B7' },
  { id: 'sapphire',    label: 'Sapphire',          hex: '#93C5FD' },
  { id: 'magenta',     label: 'Electric Magenta',  hex: '#F0ABFC' },
  { id: 'crimson',     label: 'Soft Crimson',      hex: '#FCA5A5' },
]

export const PARTICLE_EFFECTS = [
  { id: 'stardust', label: 'Stardust',      hint: 'Drifting motes' },
  { id: 'rings',    label: 'Pulsing Rings', hint: 'Expanding halos' },
  { id: 'firefly',  label: 'Fireflies',     hint: 'Slow dancing lights' },
  { id: 'none',     label: 'None',          hint: 'Just the form' },
]

/** Defaults used on first visit. */
export const DEFAULT_AVATAR = {
  shape: 'orb',
  auraColor: '#C4B5FD',
  particles: 'stardust',
  scale: 1,
}
