/**
 * Graphics Settings Zustand Slice.
 *
 * Manages the reactive graphics configuration state for AnonEmote's 3D scene.
 * Replaces the static `sceneConfig` import pattern with a dynamic, user-controllable
 * store that persists to localStorage and supports live preview, preset switching,
 * and stability tracking for WebGL context loss recovery.
 *
 * Designed to be spread into the main `useAppStore` create() call:
 *   create((set, get) => ({ ...createGraphicsSlice(set, get), ...otherSlices }))
 *
 * @module graphicsSlice
 */

import { qualityTier, SCENE_CONFIG } from '../lib/device'
import {
  loadGraphicsSettings,
  saveGraphicsSettings,
  detectActivePreset,
  GRAPHICS_PRESETS,
} from '../lib/graphicsPersistence'

// ─── Module-level debounce timer for persistence ────────────────────────────
let _persistTimer = null

/**
 * Debounce persistence writes at 500ms to avoid excessive localStorage writes
 * during slider drags.
 * @param {object} config - The graphics config to persist
 */
function debouncedPersist(config) {
  if (_persistTimer !== null) {
    clearTimeout(_persistTimer)
  }
  _persistTimer = setTimeout(() => {
    saveGraphicsSettings(config)
    _persistTimer = null
  }, 500)
}

// ─── Validation / Clamping Helpers ──────────────────────────────────────────

/** Valid shadow map sizes. */
const VALID_SHADOW_SIZES = [0, 512, 1024]

/** Valid planet detail subdivisions. */
const VALID_PLANET_DETAILS = [2, 3, 4]

/**
 * Snap a number to the nearest value in a sorted array of valid options.
 * @param {number} value
 * @param {number[]} options - Sorted ascending
 * @returns {number}
 */
function snapToNearest(value, options) {
  let closest = options[0]
  let minDist = Math.abs(value - closest)
  for (let i = 1; i < options.length; i++) {
    const dist = Math.abs(value - options[i])
    if (dist < minDist) {
      minDist = dist
      closest = options[i]
    }
  }
  return closest
}

/**
 * Clamp a number to [min, max].
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Validate and clamp a graphics setting value based on its key.
 * Ensures the store always contains valid values regardless of input.
 *
 * @param {string} key - Setting name
 * @param {*} value - Raw value from user input
 * @returns {*} Clamped/validated value
 */
function validateAndClamp(key, value) {
  switch (key) {
    case 'bloomEnabled':
    case 'decorEnabled':
      return Boolean(value)

    case 'starCount': {
      let num
      try { num = Number(value) } catch { return 800 }
      if (Number.isNaN(num) || !Number.isFinite(num)) return 800
      const clamped = clamp(num, 200, 5000)
      // Round to nearest 100
      return Math.round(clamped / 100) * 100
    }

    case 'dpr': {
      let num
      try { num = Number(value) } catch { return 1 }
      if (Number.isNaN(num) || !Number.isFinite(num)) return 1
      // On low tier, cap at 1.5 (Requirement 7.4)
      const max = qualityTier === 'low' ? 1.5 : 2.0
      return clamp(num, 0.5, max)
    }

    case 'shadowMapSize': {
      let num
      try { num = Number(value) } catch { return 0 }
      if (Number.isNaN(num) || !Number.isFinite(num)) return 0
      return snapToNearest(num, VALID_SHADOW_SIZES)
    }

    case 'planetDetail': {
      let num
      try { num = Number(value) } catch { return 2 }
      if (Number.isNaN(num) || !Number.isFinite(num)) return 2
      return snapToNearest(num, VALID_PLANET_DETAILS)
    }

    default:
      return value
  }
}

/**
 * Extract a plain settings snapshot (the 6 user-facing fields) from the store state.
 * Used for persistence and preset detection.
 *
 * @param {object} state - Current graphics store state (or partial with the 6 fields)
 * @returns {object} Settings snapshot
 */
function getSettingsSnapshot(state) {
  return {
    bloomEnabled: state.bloomEnabled,
    decorEnabled: state.decorEnabled,
    starCount: state.starCount,
    dpr: state.dpr,
    shadowMapSize: state.shadowMapSize,
    planetDetail: state.planetDetail,
  }
}

// ─── Slice Creator ──────────────────────────────────────────────────────────

/**
 * Creates the graphics settings slice for the Zustand store.
 *
 * @param {function} set - Zustand set function
 * @param {function} get - Zustand get function
 * @returns {object} State fields and actions to spread into the store
 */
export function createGraphicsSlice(set, get) {
  // Compute initial defaults from device auto-detection
  const tierConfig = SCENE_CONFIG[qualityTier]
  const defaults = {
    bloomEnabled: tierConfig.bloomEnabled,
    decorEnabled: tierConfig.decorEnabled,
    starCount: tierConfig.starCount,
    dpr: tierConfig.dpr[1], // Upper bound of the [min, max] range
    shadowMapSize: tierConfig.shadowMapSize,
    planetDetail: tierConfig.planetDetail,
  }

  return {
    // ── Graphics State Fields ──────────────────────────────────────────────
    bloomEnabled: defaults.bloomEnabled,
    decorEnabled: defaults.decorEnabled,
    starCount: defaults.starCount,
    dpr: defaults.dpr,
    shadowMapSize: defaults.shadowMapSize,
    planetDetail: defaults.planetDetail,
    activePreset: detectActivePreset(defaults),
    lastStableConfig: null,
    lastChangeTimestamp: null,

    // ── Actions ────────────────────────────────────────────────────────────

    /**
     * Initialize graphics settings from persistence or auto-detect defaults.
     * Called during app initialization (alongside initAuth/initSession).
     *
     * Reads localStorage first; if null (first visit, corrupt data, or unavailable),
     * falls back to the auto-detected tier defaults from SCENE_CONFIG.
     */
    initGraphics: () => {
      const persisted = loadGraphicsSettings()

      if (persisted) {
        // Apply persisted settings — they've already passed schema validation
        const preset = detectActivePreset(persisted)
        set({
          bloomEnabled: persisted.bloomEnabled,
          decorEnabled: persisted.decorEnabled,
          starCount: persisted.starCount,
          dpr: persisted.dpr,
          shadowMapSize: persisted.shadowMapSize,
          planetDetail: persisted.planetDetail,
          activePreset: preset,
          lastStableConfig: { ...persisted },
        })
      } else {
        // No valid persisted data — use auto-detect defaults
        // Do NOT write defaults to localStorage (Requirement 2.7)
        const preset = detectActivePreset(defaults)
        set({
          bloomEnabled: defaults.bloomEnabled,
          decorEnabled: defaults.decorEnabled,
          starCount: defaults.starCount,
          dpr: defaults.dpr,
          shadowMapSize: defaults.shadowMapSize,
          planetDetail: defaults.planetDetail,
          activePreset: preset,
          lastStableConfig: { ...defaults },
        })
      }
    },

    /**
     * Set a single graphics setting with validation, clamping, and debounced persistence.
     *
     * Validates the value, clamps it to the valid range for the setting,
     * updates the store, recomputes the active preset indicator, and schedules
     * a debounced localStorage write.
     *
     * @param {string} key - Setting name (bloomEnabled, decorEnabled, starCount, dpr, shadowMapSize, planetDetail)
     * @param {*} value - New value (will be validated and clamped)
     */
    setGraphicsSetting: (key, value) => {
      const validKeys = ['bloomEnabled', 'decorEnabled', 'starCount', 'dpr', 'shadowMapSize', 'planetDetail']
      if (!validKeys.includes(key)) return

      const clamped = validateAndClamp(key, value)

      set({ [key]: clamped, lastChangeTimestamp: Date.now() })

      // Recompute active preset after the state update
      const state = get()
      const snapshot = getSettingsSnapshot(state)
      const preset = detectActivePreset(snapshot)
      set({ activePreset: preset })

      // Debounced persistence
      debouncedPersist(snapshot)
    },

    /**
     * Apply a named preset atomically — updates all 6 setting fields in one batch.
     *
     * @param {'low'|'medium'|'high'} name - Preset name
     */
    applyPreset: (name) => {
      const preset = GRAPHICS_PRESETS[name]
      if (!preset) return

      set({
        bloomEnabled: preset.bloomEnabled,
        decorEnabled: preset.decorEnabled,
        starCount: preset.starCount,
        dpr: preset.dpr,
        shadowMapSize: preset.shadowMapSize,
        planetDetail: preset.planetDetail,
        activePreset: name,
        lastChangeTimestamp: Date.now(),
      })

      // Persist immediately (presets are intentional, no need to debounce)
      saveGraphicsSettings(preset)
    },

    /**
     * Revert all graphics settings to the last known stable configuration.
     * Called by the stability tracker when a WebGL context loss occurs
     * within 10 seconds of a settings change.
     */
    revertToStable: () => {
      const { lastStableConfig } = get()
      if (!lastStableConfig) return

      const preset = detectActivePreset(lastStableConfig)
      set({
        bloomEnabled: lastStableConfig.bloomEnabled,
        decorEnabled: lastStableConfig.decorEnabled,
        starCount: lastStableConfig.starCount,
        dpr: lastStableConfig.dpr,
        shadowMapSize: lastStableConfig.shadowMapSize,
        planetDetail: lastStableConfig.planetDetail,
        activePreset: preset,
        lastChangeTimestamp: null,
      })

      // Persist the stable config so next session starts safe
      saveGraphicsSettings(lastStableConfig)
    },

    /**
     * Promote the current settings to "last known stable" status.
     * Called by the stability tracker after 10 seconds pass without
     * a WebGL context loss event.
     */
    promoteToStable: () => {
      const state = get()
      const snapshot = getSettingsSnapshot(state)
      set({ lastStableConfig: { ...snapshot } })
    },
  }
}
