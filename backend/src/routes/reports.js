import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'
import { appendAudit } from '../lib/storage.js'

export const reportsRouter = Router()

const VALID_REASONS = ['harassment', 'hate_speech', 'self_harm', 'spam', 'other']

let _supabase = null
function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

// Tighter limit than reactions — reporting should be deliberate
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
 * A DB trigger auto-hides the post once 3 distinct sessions report it.
 *
 * Returns 200 { ok: true, alreadyReported?: bool, referral?: {...} }
 */
reportsRouter.post('/', limiter, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { post_id, session_id, reason, note } = req.body

  if (!post_id || !session_id || !reason) {
    return res.status(400).json({ error: 'post_id, session_id and reason are required.' })
  }
  if (!VALID_REASONS.includes(reason)) {
    return res.status(400).json({ error: 'Invalid report reason.' })
  }
  if (note && (typeof note !== 'string' || note.length > 300)) {
    return res.status(400).json({ error: 'Note must be 300 characters or fewer.' })
  }

  const { error } = await supabase
    .from('reports')
    .insert({ post_id, session_id, reason, note: note?.trim() || null })

  // Unique violation → this session already reported this post. Treat as success
  // so the client never learns whether a prior report existed.
  const alreadyReported = error?.code === '23505'

  if (error && !alreadyReported) {
    console.error('[Reports INSERT]', error.message)
    return res.status(500).json({ error: 'Failed to submit report.' })
  }

  console.log('[Report]', { reason, post_id, duplicate: alreadyReported })
  appendAudit({ type: 'report', reason, post_id, duplicate: alreadyReported })

  const response = { ok: true, alreadyReported }

  // If someone flagged concern for the author's safety, surface help resources
  // to the reporter too — they may also be distressed by what they read.
  if (reason === 'self_harm') {
    response.referral = {
      message:
        'Thank you for looking out for someone. If they are in immediate danger, ' +
        'please encourage them to reach out to a crisis line.',
      hotlines: [
        { name: 'NCMH Crisis Hotline (PH)', number: '1553' },
        { name: 'HOPELINE Philippines', number: '8804-4673' },
      ],
    }
  }

  return res.json(response)
})
