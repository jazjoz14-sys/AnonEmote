/**
 * Persistence Layer — localStorage read/write with schema validation.
 *
 * Namespaces all keys by user UUID so multiple accounts on the same device
 * don't collide. Validates on load to prevent corrupt data from crashing the app.
 *
 * @module persistence
 */

/** Valid navigation phases in the app flow. */
export const VALID_PHASES = ['landing', 'auth', 'avatar', 'checkin', 'space']

/** Valid avatar shape IDs (mirrors SHAPES from avatarOptions.js). */
const VALID_SHAPES = [
  'clover', 'droplet', 'spirit', 'moon', 'spark',
  'crystal', 'heart', 'ribbon', 'ring', 'shard',
]

/** Valid particle effect IDs. */
const VALID_PARTICLES = ['stardust', 'rings', 'firefly', 'none']

/** Hex color pattern: # followed by exactly 6 hex digits. */
const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

/** Default avatar config used when validation fails. */
export const DEFAULT_AVATAR = {
  shape: 'spirit',
  auraColor: '#C4B5FD',
  particles: 'stardust',
  scale: 1,
}

/**
 * Build the localStorage key for a given user.
 * @param {string} userId - Supabase Auth UUID
 * @returns {string} Namespaced key
 */
export function storageKey(userId) {
  return `anonemote_user_${userId}`
}

/**
 * Validate avatar configuration object.
 * Returns the avatar if all fields pass, or DEFAULT_AVATAR if any field fails.
 * All-or-nothing: one bad field means the entire avatar is replaced.
 *
 * @param {unknown} avatar
 * @returns {{ shape: string, auraColor: string, particles: string, scale: number }}
 */
function validateAvatar(avatar) {
  if (!avatar || typeof avatar !== 'object' || Array.isArray(avatar)) {
    return DEFAULT_AVATAR
  }

  const { shape, auraColor, particles, scale } = avatar

  if (typeof shape !== 'string' || !VALID_SHAPES.includes(shape)) {
    return DEFAULT_AVATAR
  }
  if (typeof auraColor !== 'string' || !HEX_COLOR_RE.test(auraColor)) {
    return DEFAULT_AVATAR
  }
  if (typeof particles !== 'string' || !VALID_PARTICLES.includes(particles)) {
    return DEFAULT_AVATAR
  }
  if (typeof scale !== 'number' || Number.isNaN(scale) || scale < 0.5 || scale > 2.0) {
    return DEFAULT_AVATAR
  }

  return { shape, auraColor, particles, scale }
}

/**
 * Validate checkIn object. Fields are nullable strings.
 *
 * @param {unknown} checkIn
 * @returns {{ feeling: string|null, nuance: string|null, prompt: string|null }|null}
 */
function validateCheckIn(checkIn) {
  if (!checkIn || typeof checkIn !== 'object' || Array.isArray(checkIn)) {
    return null
  }

  const { feeling, nuance, prompt } = checkIn

  // Each field must be a string or null
  if (feeling !== null && typeof feeling !== 'string') return null
  if (nuance !== null && typeof nuance !== 'string') return null
  if (prompt !== null && typeof prompt !== 'string') return null

  return { feeling: feeling ?? null, nuance: nuance ?? null, prompt: prompt ?? null }
}

/**
 * Validate a persisted state object against the schema.
 * If avatar is invalid, replaces with DEFAULT_AVATAR (all-or-nothing).
 * If top-level structure or phase is invalid, returns { valid: false }.
 *
 * @param {unknown} data
 * @returns {{ valid: boolean, state: import('./persistence').PersistedState|null }}
 */
export function validatePersistedState(data) {
  // Must be a non-null object
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { valid: false, state: null }
  }

  const { version, phase, avatar, checkIn } = data

  // Version must be "1"
  if (version !== '1') {
    return { valid: false, state: null }
  }

  // Phase must be a valid string
  if (typeof phase !== 'string' || !VALID_PHASES.includes(phase)) {
    return { valid: false, state: null }
  }

  // Avatar must be present as an object (validation may replace with default)
  if (!avatar || typeof avatar !== 'object' || Array.isArray(avatar)) {
    return { valid: false, state: null }
  }

  // CheckIn must be present as an object
  if (!checkIn || typeof checkIn !== 'object' || Array.isArray(checkIn)) {
    return { valid: false, state: null }
  }

  // Validate sub-objects
  const validatedAvatar = validateAvatar(avatar)
  const validatedCheckIn = validateCheckIn(checkIn)

  if (validatedCheckIn === null) {
    return { valid: false, state: null }
  }

  return {
    valid: true,
    state: {
      version: '1',
      phase,
      avatar: validatedAvatar,
      checkIn: validatedCheckIn,
    },
  }
}

/**
 * Save the current persisted state to localStorage.
 * No-op (returns false) if localStorage is unavailable.
 *
 * @param {string} userId - Supabase Auth UUID
 * @param {import('./persistence').PersistedState} state
 * @returns {boolean} Whether the write succeeded
 */
export function saveState(userId, state) {
  try {
    const key = storageKey(userId)
    const json = JSON.stringify(state)
    localStorage.setItem(key, json)
    return true
  } catch {
    // localStorage unavailable (blocked, quota exceeded, or throws)
    return false
  }
}

/**
 * Load and validate persisted state from localStorage.
 * Returns null if missing, corrupt, or invalid.
 * Removes the key if data is present but invalid (corrupt entry cleanup).
 *
 * @param {string} userId - Supabase Auth UUID
 * @returns {import('./persistence').PersistedState|null}
 */
export function loadState(userId) {
  try {
    const key = storageKey(userId)
    const raw = localStorage.getItem(key)

    // No data stored for this user
    if (raw === null) {
      return null
    }

    // Attempt JSON parse
    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      // Corrupt JSON — remove and return null
      localStorage.removeItem(key)
      return null
    }

    // Validate against schema
    const { valid, state } = validatePersistedState(parsed)

    if (!valid) {
      // Invalid schema — remove corrupt entry
      localStorage.removeItem(key)
      return null
    }

    return state
  } catch {
    // localStorage unavailable entirely
    return null
  }
}

/**
 * Remove all persisted state for a user.
 *
 * @param {string} userId - Supabase Auth UUID
 */
export function clearState(userId) {
  try {
    const key = storageKey(userId)
    localStorage.removeItem(key)
  } catch {
    // localStorage unavailable — silent no-op
  }
}
