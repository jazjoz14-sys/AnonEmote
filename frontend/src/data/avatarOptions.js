/**
 * Abstract avatar options.
 *
 * Deliberately non-human: no faces, skin tones, body types or gendered forms.
 * Users customise an energy form instead, so nothing about the avatar can leak
 * or imply identity. This is the visual expression of the zero-knowledge
 * architecture, not just a style choice.
 */

/**
 * Default model constraints for avatar GLB files.
 * @type {{ maxTris: number, maxFileSize: number }}
 */
const AVATAR_MODEL_CONFIG = { maxTris: 3000, maxFileSize: 1 * 1024 * 1024 }

/**
 * Default programmatic animation parameters for all avatar shapes.
 * @type {{ mode: string, rotationAxis: number[], rotationSpeed: number, rotationSpeedX: number, bobAmplitude: number, bobFrequency: number, blendWeight: number, activeClip: string|null }}
 */
const AVATAR_ANIMATION_CONFIG = {
  mode: 'programmatic',
  rotationAxis: [0, 1, 0],
  rotationSpeed: 0.4,
  rotationSpeedX: 0.15,
  bobAmplitude: 0.25,
  bobFrequency: 0.9,
  blendWeight: 0.5,
  activeClip: null,
}

export const SHAPES = [
  // ── Nature forms ─────────────────────────────────────────────────────────
  {
    id: 'clover',
    label: 'Clover',
    hint: 'Gentle and grounded',
    icon: '🍀',
    geo: 'icosahedron',         // fallback geometry
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
  {
    id: 'droplet',
    label: 'Droplet',
    hint: 'Fluid and adaptive',
    icon: '💧',
    geo: 'sphere',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
  {
    id: 'spirit',
    label: 'Spirit',
    hint: 'Soft and drifting',
    icon: '❋',
    geo: 'capsule',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },

  // ── Celestial forms ──────────────────────────────────────────────────────
  {
    id: 'moon',
    label: 'Moon',
    hint: 'Calm and reflective',
    icon: '🌙',
    geo: 'sphere',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
  {
    id: 'spark',
    label: 'Spark',
    hint: 'Bright and fleeting',
    icon: '✦',
    geo: 'cone',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
  {
    id: 'crystal',
    label: 'Crystal',
    hint: 'Structured clarity',
    icon: '💎',
    geo: 'dodecahedron',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },

  // ── Symbolic forms ───────────────────────────────────────────────────────
  {
    id: 'heart',
    label: 'Heart',
    hint: 'Warm and caring',
    icon: '💗',
    geo: 'sphere',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
  {
    id: 'ribbon',
    label: 'Ribbon',
    hint: 'Flowing and free',
    icon: '🎀',
    geo: 'capsule',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
  {
    id: 'ring',
    label: 'Ring',
    hint: 'Connected and whole',
    icon: '◎',
    geo: 'torus',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
  {
    id: 'shard',
    label: 'Shard',
    hint: 'Raw and unpolished',
    icon: '🔷',
    geo: 'tetrahedron',
    model: { ...AVATAR_MODEL_CONFIG },
    animation: { ...AVATAR_ANIMATION_CONFIG },
  },
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
  shape: 'spirit',
  auraColor: '#C4B5FD',
  particles: 'stardust',
  scale: 1,
}
