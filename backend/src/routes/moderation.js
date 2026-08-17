import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getSupabase } from '../lib/supabase.js'
import { moderate } from '../moderation/engine.js'
import { appendAudit } from '../lib/storage.js'

export const moderationRouter = Router()

// Rate limiting: max 20 requests per minute per IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
})

/**
 * POST /api/moderate
 *
 * Body: { text: string, planet_id: string, session_id: string }
 *
 * Responses:
 *   403 — crisis detected  → { error, referral }
 *   406 — toxic content    → { error }
 *   400 — bad input        → { error }
 *   500 — db error         → { error }
 *   200 — safe, saved      → { verdict: 'safe', post }
 */
moderationRouter.post('/', limiter, async (req, res) => {
  const { text, planet_id, session_id, sessionId } = req.body

  // Accept both field name conventions from the frontend
  const pid = planet_id
  const sid = session_id || sessionId

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required.' })
  }
  if (!pid) {
    return res.status(400).json({ error: 'planet_id is required.' })
  }

  // Validate planet_id against allowed list
  const VALID_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']
  if (!VALID_PLANETS.includes(pid)) {
    return res.status(400).json({ error: `Invalid planet_id. Must be one of: ${VALID_PLANETS.join(', ')}` })
  }

  // Run hybrid moderation (local keywords + Perspective API)
  const result = await moderate(text)

  // Audit log — never records the text content itself (privacy)
  const auditEntry = {
    type: 'moderation',
    verdict: result.verdict,
    layer: result.layer,
    textLength: text.length,
    planet_id: pid,
    ...(result.scores
      ? { topScore: Number(Math.max(...Object.values(result.scores)).toFixed(2)) }
      : {}),
  }
  console.log('[Moderation]', auditEntry)
  appendAudit(auditEntry)

  // 403 — crisis
  if (result.verdict === 'crisis') {
    return res.status(403).json({
      verdict: 'crisis',
      error: 'Crisis detected.',
      referral: 'Please contact the mental health hotline at 1553.',
    })
  }

  // 406 — toxic
  if (result.verdict === 'toxic') {
    return res.status(406).json({
      verdict: 'toxic',
      error: result.reason || 'Toxic content blocked.',
    })
  }

  // Safe — insert into Supabase
  const supabase = getSupabase()
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured.' })
  }

  // Build the insert payload. Doodle planet posts carry a `drawing` field
  // (base64 data URL) instead of meaningful text content.
  const insertPayload = {
    content: text.trim(),
    planet_id: pid,
    session_id: req.userId || sid, // Use auth user ID if authenticated, otherwise session UUID
  }

  // Link post to authenticated user for accountability (hidden from other users)
  if (req.userId) {
    insertPayload.author_id = req.userId
  }

  // Attach drawing if provided (only allowed on the doodle planet)
  if (req.body.drawing && pid === 'doodle') {
    const drawingData = String(req.body.drawing)
    // Basic validation: must be a PNG data URL, max ~500KB
    if (!drawingData.startsWith('data:image/png;base64,') || drawingData.length > 700000) {
      return res.status(400).json({ error: 'Invalid drawing data.' })
    }
    insertPayload.drawing = drawingData
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(insertPayload)
    .select()
    .single()

  if (error) {
    console.error('[Moderation] DB insert error:', error.message)
    return res.status(500).json({ error: 'Failed to save post.' })
  }

  return res.status(200).json({ verdict: 'safe', post: data })
})
