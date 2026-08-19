/**
 * Device capability detection.
 *
 * Used to scale the 3D scene down on mobile so it stays playable rather than
 * dropping frames or losing the WebGL context.
 *
 * Static exports (`isMobile`, `qualityTier`, `sceneConfig`) are computed once
 * at page load — quality tier should not shift mid-session.
 *
 * Reactive hooks (`useIsSmallScreen`, `useViewportSize`) update on viewport
 * changes (orientation, resize) so components can adapt layout dynamically.
 */

import { useState, useEffect } from 'react'

/** True on phones and most tablets. */
export const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini/i.test(
  navigator.userAgent
)

/** Viewport width at load. Catches small tablets that report as desktop UA. */
export const isSmallScreen = window.innerWidth < 768

/** True if either heuristic fires. */
export const isLowEnd = isMobile || isSmallScreen

// ─── Reactive Hooks ─────────────────────────────────────────────────────────

/**
 * Non-React getter for code that can't use hooks (Zustand selectors, etc.).
 * Returns the current small-screen state based on live viewport width.
 * @returns {boolean}
 */
export function getIsSmallScreen() {
  return window.innerWidth < 768
}

/**
 * Reactive hook that tracks whether the viewport is below 768px.
 * Uses `matchMedia` for efficient threshold detection (no polling).
 * Updates within one frame of the viewport crossing the 768px boundary.
 * @returns {boolean}
 */
export function useIsSmallScreen() {
  const [small, setSmall] = useState(() => window.matchMedia('(max-width: 767px)').matches)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    const handler = (e) => setSmall(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return small
}

/**
 * Reactive hook that tracks whether the viewport is below 380px (very narrow phones).
 * Uses `matchMedia` for efficient threshold detection.
 * @returns {boolean}
 */
export function useIsNarrow() {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 379px)').matches)

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 379px)')
    const handler = (e) => setNarrow(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return narrow
}

/**
 * Reactive hook that tracks whether the viewport is in landscape orientation.
 * Convenience wrapper around matchMedia('(orientation: landscape)') for
 * components that only need the boolean without the full useOrientation() object.
 * @returns {boolean}
 */
export function useIsLandscape() {
  const [landscape, setLandscape] = useState(
    () => window.matchMedia('(orientation: landscape)').matches
  )

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)')
    const handler = (e) => setLandscape(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return landscape
}

/**
 * Reactive hook returning current viewport dimensions.
 * Debounces resize events at 100ms to avoid excessive re-renders.
 * @returns {{ width: number, height: number }}
 */
export function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  useEffect(() => {
    let timeoutId = null

    const handler = () => {
      if (timeoutId !== null) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setSize({ width: window.innerWidth, height: window.innerHeight })
        timeoutId = null
      }, 100)
    }

    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('resize', handler)
      if (timeoutId !== null) clearTimeout(timeoutId)
    }
  }, [])

  return size
}

/**
 * Attempt to read the GPU renderer string via WebGL debug info.
 * Returns the unmasked renderer string or null if unavailable.
 */
function detectGpuRenderer() {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return null
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return null
    const renderer = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
    // Clean up the WebGL context to avoid hitting browser limits
    const loseCtx = gl.getExtension('WEBGL_lose_context')
    if (loseCtx) loseCtx.loseContext()
    return renderer || null
  } catch {
    return null
  }
}

const gpuRenderer = detectGpuRenderer()

/**
 * True when we detect a dedicated desktop GPU that can handle shadows.
 * ANGLE, SwiftShader, and llvmpipe are software/translation layers that
 * have known instability with cube shadow maps.
 */
const isCapableDesktopGpu = gpuRenderer &&
  !/ANGLE|SwiftShader|llvmpipe/i.test(gpuRenderer)

/**
 * Scene quality tier.
 *
 *   'high'   — desktop with a real GPU (NVIDIA, known-stable AMD)
 *   'medium' — tablet or AMD ANGLE (cube shadows are unstable)
 *   'low'    — phone or very small viewport
 */
export const qualityTier = isSmallScreen
  ? 'low'
  : isMobile
    ? 'medium'
    : isCapableDesktopGpu
      ? 'high'
      : 'medium'

/**
 * Derived scene parameters that scale with quality tier.
 */
export const SCENE_CONFIG = {
  high: {
    starCount: 3500,
    planetDetail: 4,
    decorEnabled: true,
    shadowMapSize: 1024,
    bloomEnabled: true,
    dpr: [1, 1.5],
  },
  medium: {
    starCount: 2500,
    planetDetail: 3,
    decorEnabled: true,
    shadowMapSize: 0,      // shadows disabled — AMD ANGLE context loss
    bloomEnabled: true,
    dpr: [1, 1.25],
  },
  low: {
    starCount: 800,
    planetDetail: 2,
    decorEnabled: false,
    shadowMapSize: 0,
    bloomEnabled: false,
    dpr: [1, 1],
  },
}

export const sceneConfig = SCENE_CONFIG[qualityTier]
