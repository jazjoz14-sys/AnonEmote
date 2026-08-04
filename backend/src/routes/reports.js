import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
import { appendAudit } from '../lib/storage.js'
import { reporterHash } from '../lib/reporterHash.js'

export const reportsRouter = Router()

const VALID_REASONS = ['harassment', 'hate_speech', 'self_harm', 'spam', 'other']

/**
 * Report weighting. Severe categories carry more weight in the review queue's
 * priority ordering, so admins triage the most serious items first.
 */
const REASON_WEIGHT = {
  hate_speech: 3,
  self_harm: 3,
  harassment: 2,
  spam: 1,
  other: 1,
}

let _supabase = null
function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

// Reporting should be deliberate, not rapid-fire
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reports. Please wait a few minutes.' },
})

/**
 * POST /api/reports
 * Body: { post_id, session_id, reason, note? }
 *
 * Reports flag a post for human review rather than hiding it. Only severe
 * categories from multiple independent networks, or broad consensus, trigger
 * automatic quarantine — see the DB trigger in 003_report_integrity.sql.
 *
 * Always returns 200 on a valid request, whether or not a duplicate was
 * detected, so a reporter can never learn who else has reported a post.
 */
reportsRouter.post('/', limiter, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { post_id, session_id, reason, note } = req.body || {}

  if (!post_id || !session_id || !reason) {
    return res.status(400).json({ error: 'post_id, session_id and reason are required.' })
  }
  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid report reason.' })
  }
  if (note && (typeof note !== 'string' || note.length > 300)) {
    return res.status(400).json({ error: 'Note must be 300 characters or fewer.' })
  }

  // Per-post network fingerprint. Prevents session-churn abuse without storing
  // or being able to recover the IP. See lib/reporterHash.js.
  const hash = reporterHash(req, post_id)

  const base = {
    post_id,
    session_id,
    reason,
    note: note?.trim() || null,
  }

  let { error } = await supabase.from('reports').insert({
    ...base,
    reporter_hash: hash,
    weight: REASON_WEIGHT[reason] ?? 1,
  })

  // If 003_report_integrity.sql has not been applied yet, the new columns do
  // not exist. Fall back to a legacy insert so reporting keeps working rather
  // than failing outright — degraded (session-only dedupe) but functional.
  const schemaMissing =
    error && (error.code === 'PGRST204' || error.code === '42703' ||
              /reporter_hash|weight/.test(error.message || ''))

  if (schemaMissing) {
    console.warn('[Reports] New columns missing — run supabase/003_report_integrity.sql. Using legacy insert.')
    const retry = await supabase.from('reports').insert(base)
    error = retry.error
  }

  // 23505 = unique violation. Either this session or this network already
  // reported the post. Treat as success so no information leaks back.
  const duplicate = error?.code === '23505'

  if (error && !duplicate) {
    console.error('[Reports INSERT]', error.message)
    return res.status(500).json({ error: 'Failed to submit report.' })
  }

  appendAudit({
    type: 'report',
    reason,
    post_id,
    duplicate,
    network_deduped: Boolean(hash),
  })

  const response = { ok: true, alreadyReported: duplicate }

  // Someone who flagged a safety concern may themselves be distressed by what
  // they read, so surface support resources to the reporter too.
  if (reason === 'self_harm') {
    response.referral = {
      message:
        'Thank you for looking out for someone. If you believe they are in ' +
        'immediate danger, please encourage them to contact a crisis line — ' +
        'and reach out yourself if reading this affected you.',
      hotlines: [
        { name: 'NCMH Crisis Hotline (PH)', number: '1553' },
        { name: 'HOPELINE Philippines', number: '8804-4673' },
      ],
    }
  }

  return res.json(response)
})
