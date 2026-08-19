import { supabase } from './supabase'

/**
 * API base resolution.
 *
 * In development, Vite proxies /api to the backend (see vite.config.js), so a
 * relative path works. In a production static build there is no proxy — the
 * frontend and backend are on different origins — so requests must be sent to
 * the absolute backend URL from VITE_API_URL.
 */

const RAW_BASE = import.meta.env.VITE_API_URL || ''

// Strip any trailing slash so joining never produces a double slash
const BASE = RAW_BASE.replace(/\/+$/, '')

// In dev we deliberately use the proxy even if VITE_API_URL is set, so the
// browser sees same-origin requests and no CORS preflight is involved.
const USE_PROXY = import.meta.env.DEV

if (!USE_PROXY && !BASE) {
  console.error(
    '[AnonEmote] VITE_API_URL is not set. API calls will fail in production. ' +
    'Set it to your deployed backend URL, e.g. https://anonemote-api.onrender.com'
  )
}

/**
 * Build a full URL for an API path.
 * @param {string} path e.g. '/api/moderate'
 */
export function apiUrl(path) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return USE_PROXY ? clean : `${BASE}${clean}`
}

/**
 * Get the current Supabase session token (if logged in).
 * Returns null for guest users.
 */
async function getAuthToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  } catch {
    return null
  }
}

/**
 * fetch wrapper that resolves the base URL, sends JSON, and attaches
 * the Supabase auth token if the user is logged in.
 * Returns the raw Response so callers can inspect status codes.
 *
 * If the caller already provides an Authorization header (e.g. the admin
 * console with its own session token), that header is preserved — we don't
 * overwrite it with the Supabase JWT.
 */
export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Only attach Supabase auth if no Authorization was explicitly provided
  if (!headers['Authorization'] && !headers['authorization']) {
    const token = await getAuthToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
  })
}
