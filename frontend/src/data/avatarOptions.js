/**
 * Abstract avatar options.
 *
 * Deliberately non-human: no faces, skin tones, body types or gendered forms.
 * Users customise an energy form instead, so nothing about the avatar can leak
 * or imply identity. This is the visual expression of the zero-knowledge
 * architecture, not just a style choice.
 */

export const SHAPES = [
  {
    id: 'orb',
    label: 'Orb',
    hint: 'Steady and whole',
    icon: '⬤',
  },
  {
    id: 'prism',
    label: 'Prism',
    hint: 'Sharp and faceted',
    icon: '◆',
  },
  {
    id: 'spirit',
    label: 'Spirit',
    hint: 'Soft and drifting',
    icon: '❋',
  },
]

export const AURA_COLORS = [
  { id: 'silver',    label: 'Soft Silver',     hex: '#F3F4F6' },
  { id: 'gold',      label: 'Warm Gold',       hex: '#FEF08A' },
  { id: 'mint',      label: 'Pale Mint',       hex: '#A7F3D0' },
  { id: 'starlight', label: 'Starlight White', hex: '#FFFFFF' },
  // Two extras drawn from the project palette so avatars stay distinguishable
  // from one another at a glance in the star system
  { id: 'violet',    label: 'Dusk Violet',     hex: '#C4B5FD' },
  { id: 'rose',      label: 'Quiet Rose',      hex: '#FBCFE8' },
]

export const PARTICLE_EFFECTS = [
  { id: 'stardust', label: 'Stardust',      hint: 'Drifting motes' },
  { id: 'rings',    label: 'Pulsing Rings', hint: 'Expanding halos' },
  { id: 'none',     label: 'None',          hint: 'Just the form' },
]

/** Defaults used on first visit. */
export const DEFAULT_AVATAR = {
  shape: 'orb',
  auraColor: '#C4B5FD',
  particles: 'stardust',
  scale: 1,
}
