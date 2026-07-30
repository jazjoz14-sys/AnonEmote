/**
 * Admin API client.
 *
 * The session token is held in sessionStorage so it clears when the tab
 * closes, and is sent as a Bearer header on every request.
 */
const TOKEN_KEY = 'anonemote_admin_token'

export const getToken = () => sessionStorage.getItem(TOKEN_KEY)
export const setToken = (t) => sessionStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY)

/**
 * Fetch wrapper that attaches auth and normalises errors.
 * Throws an Error with `.status` so callers can detect 401s.
 */
async function request(path, options = {}) {
  const res = await fetch(`/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
      ...options.headers,
    },
  })

  let data = null
  try { data = await res.json() } catch { /* empty body */ }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

// ── Auth ──────────────────────────────────────────────────────────────────
export const adminLogin = (password) =>
  request('/login', { method: 'POST', body: JSON.stringify({ password }) })

export const adminLogout = () => request('/logout', { method: 'POST' })

// ── Flow 1: monitoring ────────────────────────────────────────────────────
export const fetchStats = () => request('/stats')
export const fetchLogs = (opts = {}) => {
  const params = new URLSearchParams()
  if (opts.limit) params.set('limit', opts.limit)
  if (opts.type) params.set('type', opts.type)
  const qs = params.toString()
  return request(`/logs${qs ? `?${qs}` : ''}`)
}

// ── Flow 2: reported content ──────────────────────────────────────────────
export const fetchReports = (status = 'pending') =>
  request(`/reports?status=${encodeURIComponent(status)}`)

export const postAction = (postId, action) =>
  request(`/posts/${postId}/action`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })

export const resolveReports = (reportIds) =>
  request('/reports/resolve', {
    method: 'POST',
    body: JSON.stringify({ reportIds }),
  })

// ── Flow 3: filtering rules ───────────────────────────────────────────────
export const fetchLexicon = () => request('/lexicon')

export const saveLexicon = (lexicon) =>
  request('/lexicon', { method: 'PUT', body: JSON.stringify(lexicon) })

export const testLexicon = (text) =>
  request('/lexicon/test', { method: 'POST', body: JSON.stringify({ text }) })
