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
 * fetch wrapper that resolves the base URL and always sends JSON.
 * Returns the raw Response so callers can inspect status codes — the
 * moderation flow depends on distinguishing 403 (crisis) from 406 (toxic).
 */
export function apiFetch(path, options = {}) {
  return fetch(apiUrl(path), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
}
