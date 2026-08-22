/**
 * Reactive graphics config selector hook and non-reactive getter.
 *
 * Provides 3D components with the current graphics settings in the same shape
 * as the legacy static `sceneConfig` from `device.js`, but driven by the
 * Zustand graphics store slice so changes apply in real-time.
 *
 * Two exports:
 * - `useGraphicsConfig()` — React hook with shallow equality; triggers re-render
 *   only when an actual setting value changes.
 * - `getGraphicsConfig()` — Direct store snapshot for use inside `useFrame` and
 *   other non-reactive contexts where subscribing would be wasteful.
 *
 * @module useGraphicsConfig
 */

import useAppStore from '../store/useAppStore'

/**
 * Custom equality function for the selector output.
 *
 * We can't use Zustand's built-in `shallow` because the `dpr` field is a new
 * array reference on every selector call (`[1, state.dpr]`). This comparator
 * checks all primitive fields directly and compares `dpr` by its second element.
 *
 * @param {object} a - Previous selector result
 * @param {object} b - Next selector result
 * @returns {boolean} True if the configs are semantically equal
 */
function graphicsConfigEqual(a, b) {
  return (
    a.starCount === b.starCount &&
    a.planetDetail === b.planetDetail &&
    a.decorEnabled === b.decorEnabled &&
    a.shadowMapSize === b.shadowMapSize &&
    a.bloomEnabled === b.bloomEnabled &&
    a.dpr[1] === b.dpr[1]
  )
}

/**
 * Selector that extracts the sceneConfig-shaped object from store state.
 *
 * @param {object} state - Zustand store state
 * @returns {{ starCount: number, planetDetail: number, decorEnabled: boolean,
 *             shadowMapSize: number, bloomEnabled: boolean, dpr: [number, number] }}
 */
function selectGraphicsConfig(state) {
  return {
    starCount: state.starCount,
    planetDetail: state.planetDetail,
    decorEnabled: state.decorEnabled,
    shadowMapSize: state.shadowMapSize,
    bloomEnabled: state.bloomEnabled,
    dpr: [1, state.dpr],
  }
}

/**
 * Reactive Zustand selector hook that returns the current graphics configuration
 * in the same shape as the legacy SCENE_CONFIG entries.
 *
 * Uses a custom equality function to avoid unnecessary re-renders — only triggers
 * when an actual setting value changes, not when unrelated store fields update.
 *
 * The `dpr` field is returned as `[1, value]` (a floor/ceiling range) matching
 * what the React Three Fiber `<Canvas dpr={...}>` prop expects.
 *
 * @returns {{ starCount: number, planetDetail: number, decorEnabled: boolean,
 *             shadowMapSize: number, bloomEnabled: boolean, dpr: [number, number] }}
 */
export function useGraphicsConfig() {
  return useAppStore(selectGraphicsConfig, graphicsConfigEqual)
}

/**
 * Non-reactive getter for use in `useFrame` callbacks, event handlers, and other
 * contexts where subscribing to the store would be wasteful or cause stale-closure
 * issues.
 *
 * Reads directly from `useAppStore.getState()` without creating a subscription.
 * Always returns the latest values at the moment of the call.
 *
 * @returns {{ starCount: number, planetDetail: number, decorEnabled: boolean,
 *             shadowMapSize: number, bloomEnabled: boolean, dpr: [number, number] }}
 */
export function getGraphicsConfig() {
  return selectGraphicsConfig(useAppStore.getState())
}
