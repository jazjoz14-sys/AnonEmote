/**
 * Graphics Settings Persistence Layer.
 *
 * Reads/writes graphics configuration to localStorage under a single
 * device-global key `anonemote_graphics` (not per-user — graphics prefs
 * are tied to the hardware, not the account).
 *
 * Validates schema on load and silently removes corrupt entries.
 * All localStorage access is wrapped in try/catch so that private browsing,
 * quota errors, and SecurityErrors never bubble up to callers.
 *
 * @module graphicsPersistence
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** localStorage key for graphics settings (device-global, not per-user). */
const STORAGE_KEY = 'anonemote_graphics'

/** Current schema version — bump when storage format changes. */
const SCHEMA_VERSION = 1

// ─── Presets ────────────────────────────────────────────────────────────────

/**
 * Named quality preset bundles matching SCENE_CONFIG tiers in device.js.
 * Each preset uses a scalar `dpr` (the upper bound of the [1, x] range).
 *
 * @type {{ low: GraphicsConfig, medium: GraphicsConfig, high: GraphicsConfig }}
 */
export const GRAPHICS_PRESETS = {
  low: {
    starCount: 800,
    planetDetail: 2,
    decorEnabled: false,
    shadowMapSize: 0,
    bloomEnabled: false,
    dpr: 1,
  },
  medium: {
    starCount: 2500,
    planetDetail: 3,
    decorEnabled: true,
    shadowMapSize: 0,
    bloomEnabled: true,
    dpr: 1.25,
  },
  high: {
    starCount: 3500,
    planetDetail: 4,
    decorEnabled: true,
    shadowMapSize: 1024,
    bloomEnabled: true,
    dpr: 1.5,
  },
}

// ─── Validation ─────────────────────────────────────────────────────────────

/** Valid shadow map sizes (0 = disabled). */
const VALID_SHADOW_SIZES = [0, 512, 1024]

/** Valid planet geometry subdivision levels. */
const VALID_PLANET_DETAILS = [2, 3, 4]

/**
 * @typedef {Object} GraphicsConfig
 * @property {boolean} bloomEnabled
 * @property {boolean} decorEnabled
 * @property {number} starCount - Integer, 200–5000
 * @property {number} dpr - Float, 0.5–2.0
 * @property {number} shadowMapSize - 0, 512, or 1024
 * @property {number} planetDetail - 2, 3, or 4
 */

/**
 * Validate a parsed graphics settings object against the schema.
 * Checks version, presence/type of all fields, and value ranges.
 *
 * @param {unknown} data - Parsed JSON from localStorage
 * @returns {boolean} True if the data conforms to the expected schema
 */
function isValidGraphicsConfig(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return false
  }

  // Schema version gate
  if (data.version !== SCHEMA_VERSION) {
    return false
  }

  // Boolean fields
  if (typeof data.bloomEnabled !== 'boolean') return false
  if (typeof data.decorEnabled !== 'boolean') return false

  // starCount: integer in [200, 5000]
  if (typeof data.starCount !== 'number') return false
  if (!Number.isInteger(data.starCount)) return false
  if (data.starCount < 200 || data.starCount > 5000) return false

  // dpr: number in [0.5, 2.0]
  if (typeof data.dpr !== 'number') return false
  if (Number.isNaN(data.dpr)) return false
  if (data.dpr < 0.5 || data.dpr > 2.0) return false

  // shadowMapSize: must be one of the allowed values
  if (typeof data.shadowMapSize !== 'number') return false
  if (!VALID_SHADOW_SIZES.includes(data.shadowMapSize)) return false

  // planetDetail: must be one of the allowed values
  if (typeof data.planetDetail !== 'number') return false
  if (!VALID_PLANET_DETAILS.includes(data.planetDetail)) return false

  return true
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Load and validate graphics settings from localStorage.
 *
 * Returns `null` if:
 * - No data stored (first visit)
 * - JSON parsing fails (corrupt entry)
 * - Schema validation fails (wrong version, missing fields, out-of-range)
 * - localStorage is unavailable (SecurityError, private browsing)
 *
 * On validation failure for existing data, the corrupt key is removed.
 *
 * @returns {GraphicsConfig|null} Validated config or null
 */
export function loadGraphicsSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    // No data stored — first visit
    if (raw === null) {
      return null
    }

    // Attempt JSON parse
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Corrupt JSON — remove and bail
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Validate schema
    if (!isValidGraphicsConfig(parsed)) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }

    // Return only the config fields (strip version and any extra keys)
    return {
      bloomEnabled: parsed.bloomEnabled,
      decorEnabled: parsed.decorEnabled,
      starCount: parsed.starCount,
      dpr: parsed.dpr,
      shadowMapSize: parsed.shadowMapSize,
      planetDetail: parsed.planetDetail,
    }
  } catch {
    // localStorage entirely unavailable (SecurityError, etc.)
    return null
  }
}

/**
 * Serialize and persist graphics settings to localStorage.
 *
 * Writes the config with a `version` field for future schema migration.
 * Silently no-ops on write failure (quota exceeded, SecurityError, etc.).
 *
 * @param {GraphicsConfig} config - Current graphics settings to persist
 */
export function saveGraphicsSettings(config) {
  try {
    const payload = {
      version: SCHEMA_VERSION,
      bloomEnabled: config.bloomEnabled,
      decorEnabled: config.decorEnabled,
      starCount: config.starCount,
      dpr: config.dpr,
      shadowMapSize: config.shadowMapSize,
      planetDetail: config.planetDetail,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded or SecurityError — silently no-op
  }
}

/**
 * Determine which preset (if any) exactly matches the given settings.
 *
 * Compares all 6 setting fields against each named preset. If any field
 * diverges, returns `'custom'`. Used by the UI to highlight the active
 * preset button or show a "Custom" indicator.
 *
 * @param {GraphicsConfig} settings - Current graphics settings
 * @returns {'low'|'medium'|'high'|'custom'} Matching preset name or 'custom'
 */
export function detectActivePreset(settings) {
  for (const [name, preset] of Object.entries(GRAPHICS_PRESETS)) {
    if (
      settings.bloomEnabled === preset.bloomEnabled &&
      settings.decorEnabled === preset.decorEnabled &&
      settings.starCount === preset.starCount &&
      settings.dpr === preset.dpr &&
      settings.shadowMapSize === preset.shadowMapSize &&
      settings.planetDetail === preset.planetDetail
    ) {
      return name
    }
  }
  return 'custom'
}
