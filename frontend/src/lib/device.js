/**
 * Device capability detection.
 *
 * Used to scale the 3D scene down on mobile so it stays playable rather than
 * dropping frames or losing the WebGL context. All checks are static at page
 * load — no runtime polling.
 */

/** True on phones and most tablets. */
export const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini/i.test(
  navigator.userAgent
)

/** Viewport width at load. Catches small tablets that report as desktop UA. */
export const isSmallScreen = window.innerWidth < 768

/** True if either heuristic fires. */
export const isLowEnd = isMobile || isSmallScreen

/**
 * Scene quality tier.
 *
 *   'high'   — desktop with a real GPU
 *   'medium' — tablet or low-res desktop
 *   'low'    — phone or very small viewport
 */
export const qualityTier = isSmallScreen
  ? 'low'
  : isMobile
    ? 'medium'
    : 'high'

/**
 * Derived scene parameters that scale with quality tier.
 * Components import these and use them at creation time.
 */
export const SCENE_CONFIG = {
  high: {
    starCount: 3500,
    planetDetail: 4,       // icosahedron subdivisions
    decorEnabled: true,
    shadowMapSize: 1024,
    bloomEnabled: true,
    dpr: [1, 1.5],
  },
  medium: {
    starCount: 1800,
    planetDetail: 3,
    decorEnabled: true,
    shadowMapSize: 512,
    bloomEnabled: true,
    dpr: [1, 1.25],
  },
  low: {
    starCount: 800,
    planetDetail: 2,
    decorEnabled: false,   // decor props are the most expensive part
    shadowMapSize: 0,      // no shadows on phones
    bloomEnabled: false,   // no post-processing on phones
    dpr: [1, 1],
  },
}

export const sceneConfig = SCENE_CONFIG[qualityTier]
