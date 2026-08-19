import { v4 as uuidv4 } from 'uuid'

/**
 * SessionStorage key for the guest session UUID.
 * Using sessionStorage ensures the ID is automatically discarded on tab close.
 * localStorage is NEVER used for guest users.
 */
const GUEST_SESSION_KEY = 'anonemote_guest_session'

/**
 * Get or create a guest session UUID.
 *
 * - If a UUID already exists in sessionStorage, reuse it (same tab session).
 * - If not, generate a new v4 UUID and store it in sessionStorage.
 * - The UUID is automatically discarded when the browser tab closes
 *   (built-in sessionStorage behavior).
 * - This function NEVER reads from or writes to localStorage.
 *
 * @returns {string} A v4 UUID identifying this guest session
 */
export function getGuestSessionId() {
  const existing = sessionStorage.getItem(GUEST_SESSION_KEY)
  if (existing) {
    return existing
  }

  const id = uuidv4()
  sessionStorage.setItem(GUEST_SESSION_KEY, id)
  return id
}

/**
 * Clear the guest session UUID from sessionStorage.
 * Useful when a guest signs in and transitions to an authenticated session.
 */
export function clearGuestSession() {
  sessionStorage.removeItem(GUEST_SESSION_KEY)
}

/**
 * Check whether a guest session UUID currently exists.
 *
 * @returns {boolean} True if a guest session ID is stored in sessionStorage
 */
export function hasGuestSession() {
  return sessionStorage.getItem(GUEST_SESSION_KEY) !== null
}
