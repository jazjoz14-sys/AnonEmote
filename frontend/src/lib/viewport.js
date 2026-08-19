/**
 * Viewport provider — CSS custom properties, orientation hooks, body scroll lock.
 *
 * Sets a collection of CSS custom properties on :root that encode the app's
 * viewport budget. All layout components reference these variables so they
 * stay in sync without prop drilling.
 *
 * Custom properties set:
 *   --app-height      Actual viewport height (dvh fallback via window.innerHeight)
 *   --hud-height      40px on mobile (<768px), 56px on desktop
 *   --nav-height      44px on mobile (<768px), 52px on desktop
 *   --safe-top        env(safe-area-inset-top) value (read from computed style)
 *   --safe-bottom     env(safe-area-inset-bottom) value (read from computed style)
 *   --content-height  Calculated remaining space for content
 */

import { useState, useEffect, useRef } from 'react'

// ─── Constants ──────────────────────────────────────────────────────────────

const MOBILE_BREAKPOINT = 768

const MOBILE_HUD_HEIGHT = 40
const DESKTOP_HUD_HEIGHT = 56
const MOBILE_NAV_HEIGHT = 44
const DESKTOP_NAV_HEIGHT = 52

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Determines whether the viewport is currently in "mobile" territory.
 * @returns {boolean}
 */
function isMobileViewport() {
  return window.innerWidth < MOBILE_BREAKPOINT
}

/**
 * Reads a CSS env() value from a temporary element.
 * Returns the pixel value as a string (e.g. "20px") or "0px" if unsupported.
 * @param {string} envVar - e.g. "safe-area-inset-top"
 * @returns {string}
 */
function readSafeAreaInset(envVar) {
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.left = '0'
  el.style.top = '0'
  el.style.height = `env(${envVar}, 0px)`
  el.style.visibility = 'hidden'
  el.style.pointerEvents = 'none'
  document.body.appendChild(el)
  const value = getComputedStyle(el).height || '0px'
  document.body.removeChild(el)
  return value
}

// ─── initViewportProperties ─────────────────────────────────────────────────

/**
 * Sets CSS custom properties on :root for viewport calculations and
 * attaches resize/orientationchange listeners to keep --app-height updated.
 *
 * Call once at app startup (e.g. in main.jsx before ReactDOM.render).
 *
 * @returns {() => void} Cleanup function that removes event listeners
 */
export function initViewportProperties() {
  const root = document.documentElement

  function update() {
    const mobile = isMobileViewport()

    // --app-height: dvh fallback using window.innerHeight
    const appHeight = window.innerHeight
    root.style.setProperty('--app-height', `${appHeight}px`)

    // --hud-height / --nav-height: responsive to viewport width
    const hudHeight = mobile ? MOBILE_HUD_HEIGHT : DESKTOP_HUD_HEIGHT
    const navHeight = mobile ? MOBILE_NAV_HEIGHT : DESKTOP_NAV_HEIGHT
    root.style.setProperty('--hud-height', `${hudHeight}px`)
    root.style.setProperty('--nav-height', `${navHeight}px`)

    // --safe-top / --safe-bottom: read from env() via a probe element
    const safeTop = readSafeAreaInset('safe-area-inset-top')
    const safeBottom = readSafeAreaInset('safe-area-inset-bottom')
    root.style.setProperty('--safe-top', safeTop)
    root.style.setProperty('--safe-bottom', safeBottom)

    // --content-height: remaining space for scrollable/interactive content
    // Calculation: appHeight - hud - nav - safeTop - safeBottom
    root.style.setProperty(
      '--content-height',
      `calc(var(--app-height) - var(--hud-height) - var(--nav-height) - var(--safe-top) - var(--safe-bottom))`
    )
  }

  // Set initial values
  update()

  // Listen for viewport changes
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)

  // Return cleanup function
  return () => {
    window.removeEventListener('resize', update)
    window.removeEventListener('orientationchange', update)
  }
}

// ─── useOrientation ─────────────────────────────────────────────────────────

/**
 * Reactive hook returning the current device orientation.
 * Uses matchMedia for efficient threshold detection without polling.
 *
 * @returns {{ isLandscape: boolean, isPortrait: boolean }}
 */
export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(
    () => window.matchMedia('(orientation: landscape)').matches
  )

  useEffect(() => {
    const mql = window.matchMedia('(orientation: landscape)')
    const handler = (e) => setIsLandscape(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  return { isLandscape, isPortrait: !isLandscape }
}

// ─── useBodyLock ────────────────────────────────────────────────────────────

/**
 * Global body-lock reference counter. Tracks how many active lock holders
 * exist so that the body is only unlocked when ALL holders release.
 * This prevents a race condition when multiple BottomSheets are open:
 * closing one must not unlock the body while others remain open.
 */
let lockCount = 0
let savedOverflow = null

/**
 * Resets the body lock state. For testing purposes only.
 */
export function _resetBodyLock() {
  lockCount = 0
  savedOverflow = null
}

export function acquireBodyLock() {
  if (lockCount === 0) {
    savedOverflow = document.body.style.overflow || ''
    document.body.style.overflow = 'hidden'
  }
  lockCount++
}

export function releaseBodyLock() {
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0 && savedOverflow !== null) {
    document.body.style.overflow = savedOverflow
    savedOverflow = null
  }
}

/**
 * Manages body scroll locking. When `shouldLock` is true, acquires a lock
 * that sets document.body.style.overflow to 'hidden'. The lock uses a global
 * reference counter so the body remains locked while ANY holder is active,
 * and is only unlocked when ALL holders release (within the same synchronous
 * React commit — well under 100ms).
 *
 * Safe to use from multiple components simultaneously.
 *
 * @param {boolean} shouldLock - Whether to lock body scroll
 */
export function useBodyLock(shouldLock) {
  const isLocked = useRef(false)

  useEffect(() => {
    if (shouldLock && !isLocked.current) {
      acquireBodyLock()
      isLocked.current = true
    } else if (!shouldLock && isLocked.current) {
      releaseBodyLock()
      isLocked.current = false
    }

    // Cleanup: release lock if component unmounts while holding
    return () => {
      if (isLocked.current) {
        releaseBodyLock()
        isLocked.current = false
      }
    }
  }, [shouldLock])
}
