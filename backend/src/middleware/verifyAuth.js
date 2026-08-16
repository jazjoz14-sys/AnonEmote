import { createClient } from '@supabase/supabase-js'

/**
 * verifyAuth — Express middleware that extracts and verifies a Supabase JWT.
 *
 * If a valid token is present, sets:
 *   req.userId  — the authenticated user's UUID (from Supabase Auth)
 *   req.isAuthenticated — true
 *
 * If no token or invalid token:
 *   req.userId — null
 *   req.isAuthenticated — false
 *
 * This middleware does NOT block the request — routes decide whether to
 * require auth or allow guests. This lets guest users still read posts.
 */

let _supabase = null
function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

export async function verifyAuth(req, res, next) {
  req.userId = null
  req.isAuthenticated = false

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next()
  }

  const token = authHeader.slice(7)
  if (!token) return next()

  const supabase = getSupabase()
  if (!supabase) return next()

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (!error && user) {
      req.userId = user.id
      req.isAuthenticated = true
    }
  } catch (err) {
    // Token invalid or expired — continue as guest
    console.warn('[verifyAuth] Token verification failed:', err.message)
  }

  next()
}

/**
 * requireAuth — blocks the request if not authenticated.
 * Use after verifyAuth for routes that require login (posting, replying, reacting).
 */
export function requireAuth(req, res, next) {
  if (!req.isAuthenticated) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' })
  }
  next()
}
