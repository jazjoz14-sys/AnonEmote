/**
 * Hint Store — session-persisted dismissal flags for UI hints.
 *
 * Wraps sessionStorage with an automatic in-memory fallback when storage is
 * unavailable (private browsing, quota exceeded, etc.). Hints dismissed via
 * this store stay suppressed for the remainder of the page lifecycle even if
 * sessionStorage throws on every access.
 *
 * All keys are prefixed with `anonemote_hint_` so resetAllHints() can
 * selectively clear only hint-related entries without touching other
 * session data (e.g., `anonemote_session`).
 */

// ─── Key Constants ──────────────────────────────────────────────────────────

/** Planet-click pulse animation dismissed */
export const HINT_PLANET_PULSE = 'anonemote_hint_planet_pulse'

/** Empty-state message acknowledged */
export const HINT_EMPTY_STATE = 'anonemote_hint_empty_state'

/** Guest sign-in prompt dismissed */
export const HINT_GUEST_PROMPT = 'anonemote_hint_guest_prompt'

// ─── In-Memory Fallback ─────────────────────────────────────────────────────

/** @type {Map<string, string>} */
const memoryStore = new Map()

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Attempt to read a value from sessionStorage.
 * Returns the value or null if storage is unavailable.
 * @param {string} key
 * @returns {string | null}
 */
function storageGet(key) {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Attempt to write a value to sessionStorage.
 * Returns true on success, false if storage threw.
 * @param {string} key
 * @param {string} value
 * @returns {boolean}
 */
function storageSet(key, value) {
  try {
    sessionStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

/**
 * Attempt to remove a key from sessionStorage.
 * Silently ignores errors.
 * @param {string} key
 */
function storageRemove(key) {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/**
 * Returns all sessionStorage keys that start with `anonemote_hint_`.
 * Returns an empty array if storage is unavailable.
 * @returns {string[]}
 */
function getHintKeys() {
  try {
    const keys = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i)
      if (key && key.startsWith('anonemote_hint_')) {
        keys.push(key)
      }
    }
    return keys
  } catch {
    return []
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Check whether a hint has been dismissed in the current session.
 * Checks sessionStorage first, falls back to the in-memory store.
 * @param {string} key - The hint key to check (e.g., `HINT_PLANET_PULSE`)
 * @returns {boolean} True if the hint has been dismissed
 */
export function isHintDismissed(key) {
  const stored = storageGet(key)
  if (stored === 'true') return true
  return memoryStore.has(key)
}

/**
 * Mark a hint as dismissed for the current session.
 * Writes to sessionStorage; on failure, writes to the in-memory fallback.
 * @param {string} key - The hint key to dismiss
 */
export function dismissHint(key) {
  const written = storageSet(key, 'true')
  if (!written) {
    memoryStore.set(key, 'true')
  }
}

/**
 * Reset (clear) all hint dismissal flags.
 * Removes all `anonemote_hint_*` entries from sessionStorage and clears
 * the in-memory fallback store.
 */
export function resetAllHints() {
  const keys = getHintKeys()
  for (const key of keys) {
    storageRemove(key)
  }
  memoryStore.clear()
}
