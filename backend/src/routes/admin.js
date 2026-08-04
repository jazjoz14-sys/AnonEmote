import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
import { login, logout, requireAdmin, activeSessionCount } from '../middleware/adminAuth.js'
import { getLexicon, saveLexicon, appendAudit, readAudit, storageMode } from '../lib/storage.js'

export const adminRouter = Router()

let _supabase = null
function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
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
      .select('id, content, planet_id, is_hidden, created_at, review_status, report_score, flagged_at')
      .in('id', postIds)

    // Graceful fallback if 003_report_integrity.sql has not been applied
    if (postErr) {
      const retry = await supabase
        .from('posts')
        .select('id, content, planet_id, is_hidden, created_at')
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
 */
adminRouter.post('/lexicon/test', requireAdmin, async (req, res) => {
  const { text } = req.body || {}
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required.' })
  }

  const { moderate } = await import('../moderation/engine.js')
  const result = await moderate(text)
  res.json(result)
})
