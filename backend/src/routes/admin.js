import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getSupabase } from '../lib/supabase.js'
import { login, logout, requireAdmin, activeSessionCount, validateToken } from '../middleware/adminAuth.js'
import { getLexicon, saveLexicon, appendAudit, readAudit, storageMode } from '../lib/storage.js'
import { onAudit, offAudit } from '../lib/eventBus.js'

export const adminRouter = Router()

/* ══════════════════════════════════════════════════════════════════════════
   PRIVACY HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

/** Fields that must never appear in the SSE stream — preserves student anonymity. */
const PRIVATE_FIELDS = ['content', 'session_id', 'ip', 'author_id']

/**
 * Strip privacy-sensitive fields from an audit entry before SSE broadcast.
 * Removes fields at top level and from nested payload object.
 * @param {object} entry - The raw audit entry
 * @returns {object} Safe entry for client consumption
 */
export function stripPrivateFields(entry) {
  const safe = { ...entry }
  for (const field of PRIVATE_FIELDS) {
    delete safe[field]
  }
  // Also strip from nested payload if present
  if (safe.payload && typeof safe.payload === 'object') {
    const safePayload = { ...safe.payload }
    for (const field of PRIVATE_FIELDS) {
      delete safePayload[field]
    }
    safe.payload = safePayload
  }
  return safe
}

// Brute-force protection on the login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' },
})

/* ══════════════════════════════════════════════════════════════════════════
   AUTH
   ══════════════════════════════════════════════════════════════════════════ */

/** POST /api/admin/login  { password } */
adminRouter.post('/login', loginLimiter, async (req, res) => {
  // Return 404 when disabled so attackers cannot distinguish "admin exists but
  // is off" from "no admin endpoint at all".
  if (process.env.ADMIN_ENABLED !== 'true') {
    return res.status(404).json({ error: 'Not found' })
  }

  const result = login(req.body?.password)

  if (!result.ok) {
    await appendAudit({ type: 'admin_login_failed', reason: result.reason })
    if (result.reason === 'not_configured') {
      return res.status(503).json({ error: 'Admin access is not configured on the server.' })
    }
    return res.status(401).json({ error: 'Incorrect password.' })
  }

  await appendAudit({ type: 'admin_login' })
  res.json({ token: result.token, expiresAt: result.expiresAt })
})

/** POST /api/admin/logout */
adminRouter.post('/logout', requireAdmin, async (req, res) => {
  logout(req.adminToken)
  await appendAudit({ type: 'admin_logout' })
  res.json({ ok: true })
})

/* ══════════════════════════════════════════════════════════════════════════
   LIVE LOG STREAM (Server-Sent Events)
   ══════════════════════════════════════════════════════════════════════════ */

const MAX_SSE_CONNECTIONS = 5
let activeConnections = 0

/** GET /api/admin/stream?token=<session_token> — SSE audit stream */
adminRouter.get('/stream', (req, res) => {
  // Auth via query param (EventSource doesn't support headers)
  const token = req.query.token
  if (!validateToken(token)) {
    return res.status(401).json({ error: 'Authentication required.' })
  }

  // Enforce connection cap
  if (activeConnections >= MAX_SSE_CONNECTIONS) {
    return res.status(503).json({ error: 'Maximum connections reached.' })
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.flushHeaders()

  activeConnections++

  // Heartbeat every 30s to keep connection alive through proxies
  const heartbeat = setInterval(() => res.write(':ping\n\n'), 30000)

  // Listener for audit events
  const listener = (entry) => {
    const safe = stripPrivateFields(entry)
    res.write(`data: ${JSON.stringify(safe)}\n\n`)
  }

  onAudit(listener)

  // Cleanup on disconnect
  req.on('close', () => {
    offAudit(listener)
    clearInterval(heartbeat)
    activeConnections--
  })
})

/* ══════════════════════════════════════════════════════════════════════════
   FLOW 1 — MONITOR USER ACTIVITY  (fetch system logs)
   ══════════════════════════════════════════════════════════════════════════ */

/** GET /api/admin/stats — dashboard summary */
adminRouter.get('/stats', requireAdmin, async (_req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [total, hidden, recent, reactions, reports, pending] = await Promise.all([
    supabase.from('posts').select('id', { count: 'exact', head: true }),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('is_hidden', true),
    supabase.from('posts').select('id', { count: 'exact', head: true }).gte('created_at', since24h),
    supabase.from('reactions').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reviewed', false),
  ])

  // Posts per planet
  const { data: planetRows } = await supabase
    .from('posts')
    .select('planet_id')
    .eq('is_hidden', false)

  const byPlanet = {}
  for (const row of planetRows || []) {
    byPlanet[row.planet_id] = (byPlanet[row.planet_id] || 0) + 1
  }

  // Moderation verdict tallies from the audit log
  const modEvents = await readAudit({ limit: 1000, type: 'moderation' })
  const verdicts = modEvents.reduce((acc, e) => {
    acc[e.verdict] = (acc[e.verdict] || 0) + 1
    return acc
  }, {})

  res.json({
    posts: { total: total.count ?? 0, hidden: hidden.count ?? 0, last24h: recent.count ?? 0 },
    reactions: reactions.count ?? 0,
    reports: { total: reports.count ?? 0, pending: pending.count ?? 0 },
    byPlanet,
    verdicts,
    activeAdminSessions: activeSessionCount(),
    // 'database' once 003_admin_persistence.sql has been applied, else 'file'
    storage: storageMode(),
    moderationEngine: process.env.PERSPECTIVE_API_KEY ? 'perspective+local' : 'local-only',
  })
})

/** GET /api/admin/logs?limit=200&type=moderation */
adminRouter.get('/logs', requireAdmin, async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000)
  const type = req.query.type || undefined
  const entries = await readAudit({ limit, type })
  res.json({ entries })
})

/* ══════════════════════════════════════════════════════════════════════════
   FLOW 2 — MANAGE REPORTED CONTENT  (remove / flag toxic posts)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/reports?status=pending
 * Returns reports grouped by post, with the post content attached.
 */
adminRouter.get('/reports', requireAdmin, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const status = req.query.status || 'pending'

  /**
   * Load reports, selecting the integrity columns when available.
   * Falls back to the legacy column set if 003_report_integrity.sql has not
   * been applied yet, so the review queue keeps working either way.
   */
  const runQuery = async (columns) => {
    let q = supabase
      .from('reports')
      .select(columns)
      .order('created_at', { ascending: false })
      .limit(300)

    if (status === 'pending') q = q.eq('reviewed', false)
    if (status === 'reviewed') q = q.eq('reviewed', true)

    return q
  }

  let { data: reports, error } = await runQuery(
    'id, post_id, reason, note, reviewed, created_at, reporter_hash, weight'
  )

  if (error) {
    console.warn('[Admin reports] integrity columns unavailable, using legacy select:', error.message)
    const retry = await runQuery('id, post_id, reason, note, reviewed, created_at')
    reports = retry.data
    error = retry.error
  }

  if (error) {
    console.error('[Admin reports]', error.message)
    return res.status(500).json({ error: 'Failed to load reports.' })
  }

  // Attach the reported post to each group
  const postIds = [...new Set((reports || []).map((r) => r.post_id))]
  let postsById = {}

  if (postIds.length > 0) {
    let { data: posts, error: postErr } = await supabase
      .from('posts')
      .select('id, content, planet_id, is_hidden, created_at, review_status, report_score, flagged_at, author_id')
      .in('id', postIds)

    // Graceful fallback if 003_report_integrity.sql has not been applied
    if (postErr) {
      const retry = await supabase
        .from('posts')
        .select('id, content, planet_id, is_hidden, created_at, author_id')
        .in('id', postIds)
      posts = retry.data
    }

    postsById = Object.fromEntries((posts || []).map((p) => [p.id, p]))
  }

  // Group reports by post so the admin reviews a post once, not per report
  const grouped = postIds.map((id) => {
    const forPost = reports.filter((r) => r.post_id === id)

    // Distinct networks is the meaningful signal — raw report count can be
    // inflated by one person cycling sessions.
    const networks = new Set(
      forPost.map((r) => r.reporter_hash || `session:${r.id}`)
    )

    return {
      post: postsById[id] || null,
      reportCount: forPost.length,
      distinctNetworks: networks.size,
      priority: forPost.reduce((sum, r) => sum + (r.weight || 1), 0),
      reasons: [...new Set(forPost.map((r) => r.reason))],
      notes: forPost.map((r) => r.note).filter(Boolean),
      reportIds: forPost.map((r) => r.id),
      latestAt: forPost[0]?.created_at,
    }
  }).filter((g) => g.post)

  // Highest priority first so the most serious items surface at the top
  grouped.sort((a, b) => b.priority - a.priority)

  res.json({ groups: grouped })
})

/**
 * POST /api/admin/posts/:id/action  { action: 'hide'|'restore'|'delete' }
 *
 * 'hide'    → flag the post, keeps it for records
 * 'restore' → unflag a post hidden in error
 * 'delete'  → permanent removal (cascades reactions/reports)
 */
adminRouter.post('/posts/:id/action', requireAdmin, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { id } = req.params
  const { action } = req.body || {}

  const ALLOWED = ['hide', 'restore', 'clear', 'delete']
  if (!ALLOWED.includes(action)) {
    return res.status(400).json({ error: `action must be one of: ${ALLOWED.join(', ')}` })
  }

  if (action === 'delete') {
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (error) {
      console.error('[Admin delete]', error.message)
      return res.status(500).json({ error: 'Failed to delete post.' })
    }
    await appendAudit({ type: 'admin_action', action: 'delete', post_id: id })
    return res.json({ ok: true, action: 'delete' })
  }

  // Map each action onto the review workflow.
  //   hide    → remove from feed, keep in queue as quarantined
  //   restore → return to feed, still flagged for review
  //   clear   → reviewed and acceptable; immune to further auto-flagging so
  //             brigading cannot repeatedly re-quarantine the same post
  const patch = {
    hide:    { is_hidden: true,  review_status: 'quarantined' },
    restore: { is_hidden: false, review_status: 'pending' },
    clear:   { is_hidden: false, review_status: 'cleared' },
  }[action]

  let { error } = await supabase.from('posts').update(patch).eq('id', id)

  // Fall back to visibility-only if 003_report_integrity.sql has not been
  // applied. The action still works; it just cannot record review state.
  if (error) {
    console.warn('[Admin action] review_status unavailable, updating visibility only:', error.message)
    const retry = await supabase
      .from('posts')
      .update({ is_hidden: patch.is_hidden })
      .eq('id', id)
    error = retry.error
  }

  if (error) {
    console.error('[Admin action]', error.message)
    return res.status(500).json({ error: 'Failed to update post.' })
  }

  await appendAudit({ type: 'admin_action', action, post_id: id })
  res.json({ ok: true, action })
})

/** POST /api/admin/reports/resolve  { reportIds: string[] } */
adminRouter.post('/reports/resolve', requireAdmin, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const ids = Array.isArray(req.body?.reportIds) ? req.body.reportIds : []
  if (ids.length === 0) return res.status(400).json({ error: 'reportIds is required.' })

  const { error } = await supabase.from('reports').update({ reviewed: true }).in('id', ids)
  if (error) {
    console.error('[Admin resolve]', error.message)
    return res.status(500).json({ error: 'Failed to resolve reports.' })
  }

  await appendAudit({ type: 'admin_action', action: 'resolve_reports', count: ids.length })
  res.json({ ok: true, resolved: ids.length })
})

/* ══════════════════════════════════════════════════════════════════════════
   FLOW 3 — UPDATE FILTERING RULES  (apply new rules to local lexicon)
   ══════════════════════════════════════════════════════════════════════════ */

/** GET /api/admin/lexicon */
adminRouter.get('/lexicon', requireAdmin, async (_req, res) => {
  const lexicon = await getLexicon()
  res.json(lexicon)
})

/**
 * PUT /api/admin/lexicon  { crisis: string[], toxic: string[], allow: string[] }
 *
 * crisis → triggers the referral UI
 * toxic  → blocks the post
 * allow  → allow-list that overrides the built-in lists (false-positive fixes)
 */
adminRouter.put('/lexicon', requireAdmin, async (req, res) => {
  const { crisis, toxic, allow } = req.body || {}

  for (const [name, arr] of Object.entries({ crisis, toxic, allow })) {
    if (arr !== undefined && !Array.isArray(arr)) {
      return res.status(400).json({ error: `${name} must be an array of terms.` })
    }
  }

  const saved = await saveLexicon({
    crisis: crisis ?? [],
    toxic: toxic ?? [],
    allow: allow ?? [],
  })

  await appendAudit({
    type: 'admin_action',
    action: 'update_lexicon',
    counts: {
      crisis: saved.crisis.length,
      toxic: saved.toxic.length,
      allow: saved.allow.length,
    },
  })

  res.json({ ok: true, lexicon: saved })
})

/**
 * POST /api/admin/lexicon/test  { text }
 * Dry-run the filter so rules can be validated before they affect users.
 * Returns full DryRunResult: verdict, matchedTerm, lexiconSource, layer, normalizedText, scores?
 */
adminRouter.post('/lexicon/test', requireAdmin, async (req, res) => {
  const { text } = req.body || {}
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required.' })
  }

  const { moderateDryRun } = await import('../moderation/engine.js')
  const result = await moderateDryRun(text)
  res.json(result)
})

/* ══════════════════════════════════════════════════════════════════════════
   FLOW 4 — USER MANAGEMENT (view, suspend, unsuspend accounts)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/users?page=1&limit=20
 * Returns registered users with post counts and report counts.
 */
adminRouter.get('/users', requireAdmin, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
  const offset = (page - 1) * limit

  // Fetch profiles
  const { data: profiles, error, count } = await supabase
    .from('profiles')
    .select('id, created_at, is_suspended, suspended_at, suspension_reason', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error('[Admin users]', error.message)
    return res.status(500).json({ error: 'Failed to fetch users.' })
  }

  // Enrich with post counts and report counts per user
  const userIds = (profiles || []).map(p => p.id)

  let postCounts = {}
  let reportCounts = {}

  if (userIds.length > 0) {
    // Count posts per author
    const { data: posts } = await supabase
      .from('posts')
      .select('author_id')
      .in('author_id', userIds)

    for (const p of posts || []) {
      if (p.author_id) postCounts[p.author_id] = (postCounts[p.author_id] || 0) + 1
    }

    // Count reports against posts by each author
    const { data: authorPosts } = await supabase
      .from('posts')
      .select('id, author_id')
      .in('author_id', userIds)

    const postIds = (authorPosts || []).map(p => p.id)
    const postToAuthor = Object.fromEntries((authorPosts || []).map(p => [p.id, p.author_id]))

    if (postIds.length > 0) {
      const { data: reports } = await supabase
        .from('reports')
        .select('post_id')
        .in('post_id', postIds)

      for (const r of reports || []) {
        const author = postToAuthor[r.post_id]
        if (author) reportCounts[author] = (reportCounts[author] || 0) + 1
      }
    }
  }

  // Get email from auth.users via admin API (service role can access this)
  let emails = {}
  for (const profile of profiles || []) {
    const { data: { user } } = await supabase.auth.admin.getUserById(profile.id)
    if (user) emails[profile.id] = user.email
  }

  const users = (profiles || []).map(p => ({
    id: p.id,
    email: emails[p.id] || 'unknown',
    createdAt: p.created_at,
    isSuspended: p.is_suspended || false,
    suspendedAt: p.suspended_at,
    suspensionReason: p.suspension_reason,
    postCount: postCounts[p.id] || 0,
    reportCount: reportCounts[p.id] || 0,
  }))

  res.json({ users, total: count || 0, page, limit })
})

/**
 * POST /api/admin/users/:id/suspend  { reason }
 * Suspends a user account — they remain registered but cannot post.
 */
adminRouter.post('/users/:id/suspend', requireAdmin, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { id } = req.params
  const { reason } = req.body || {}

  const { error } = await supabase
    .from('profiles')
    .update({
      is_suspended: true,
      suspended_at: new Date().toISOString(),
      suspension_reason: reason || 'Suspended by administrator',
    })
    .eq('id', id)

  if (error) {
    console.error('[Admin suspend]', error.message)
    return res.status(500).json({ error: 'Failed to suspend user.' })
  }

  await appendAudit({ type: 'admin_action', action: 'suspend_user', user_id: id, reason })
  res.json({ ok: true, action: 'suspended' })
})

/**
 * POST /api/admin/users/:id/unsuspend
 * Lifts a suspension.
 */
adminRouter.post('/users/:id/unsuspend', requireAdmin, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { id } = req.params

  const { error } = await supabase
    .from('profiles')
    .update({
      is_suspended: false,
      suspended_at: null,
      suspension_reason: null,
    })
    .eq('id', id)

  if (error) {
    console.error('[Admin unsuspend]', error.message)
    return res.status(500).json({ error: 'Failed to unsuspend user.' })
  }

  await appendAudit({ type: 'admin_action', action: 'unsuspend_user', user_id: id })
  res.json({ ok: true, action: 'unsuspended' })
})
