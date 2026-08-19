import crypto from 'crypto'

/**
 * Admin session handling.
 *
 * The administrator authenticates with ADMIN_PASSWORD from the environment and
 * receives an opaque session token held in memory. Tokens expire after 8 hours
 * and are cleared on server restart.
 *
 * Scope note: this is a single-operator scheme sized for the capstone
 * deployment. It has no user accounts, no rotation and no persistence across
 * restarts. A multi-admin production system would need real accounts with
 * hashed credentials in the database.
 */

const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const sessions = new Map() // token -> { createdAt, expiresAt }

/** Timing-safe string comparison to avoid leaking the password via timing. */
function safeEqual(a = '', b = '') {
  const bufA = Buffer.from(String(a))
  const bufB = Buffer.from(String(b))
  // timingSafeEqual throws on length mismatch, so hash first to equalize length
  const hashA = crypto.createHash('sha256').update(bufA).digest()
  const hashB = crypto.createHash('sha256').update(bufB).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

/** Remove expired sessions. */
function prune() {
  const now = Date.now()
  for (const [token, meta] of sessions) {
    if (meta.expiresAt <= now) sessions.delete(token)
  }
}

/**
 * Verify the supplied password and issue a session token.
 * @returns {{ ok: true, token: string, expiresAt: number } | { ok: false }}
 */
export function login(password) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return { ok: false, reason: 'not_configured' }
  if (!password || !safeEqual(password, expected)) return { ok: false, reason: 'bad_password' }

  prune()
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = Date.now() + SESSION_TTL_MS
  sessions.set(token, { createdAt: Date.now(), expiresAt })
  return { ok: true, token, expiresAt }
}

/** Invalidate a session token. */
export function logout(token) {
  sessions.delete(token)
}

/** Express middleware guarding every admin route. */
export function requireAdmin(req, res, next) {
  // Kill switch — ADMIN_ENABLED must be explicitly "true".
  // On public deployments this defaults to off, which makes the entire admin
  // surface unreachable — even with the correct password.
  if (process.env.ADMIN_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Not found' })
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({
      error: 'Admin access is not configured. Set ADMIN_PASSWORD in backend/.env',
    })
  }

  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) return res.status(401).json({ error: 'Authentication required.' })

  prune()
  const session = sessions.get(token)
  if (!session) return res.status(401).json({ error: 'Session expired. Please sign in again.' })

  req.adminToken = token
  next()
}

/** Count of live sessions — surfaced on the admin dashboard. */
export function activeSessionCount() {
  prune()
  return sessions.size
}

/**
 * Validate a session token without the full middleware pattern.
 * Used by the SSE endpoint where auth comes from a query parameter
 * (EventSource doesn't support custom headers).
 * @param {string} token - The session token to validate
 * @returns {boolean} true if valid and not expired
 */
export function validateToken(token) {
  if (process.env.ADMIN_ENABLED !== 'true') return false
  if (!token) return false
  prune()
  return sessions.has(token)
}
