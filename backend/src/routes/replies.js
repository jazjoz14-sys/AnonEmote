import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getSupabase } from '../lib/supabase.js'
import { moderate } from '../moderation/engine.js'
import { appendAudit } from '../lib/storage.js'

export const repliesRouter = Router()

// Valid planet_id values — must stay in sync with the DB CHECK constraint
const ALLOWED_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many replies. Please wait.' },
})

/**
 * GET /api/replies?post_id=uuid
 * Returns replies for a single post, ordered oldest first.
 */
repliesRouter.get('/', async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { post_id } = req.query
  if (!post_id) return res.status(400).json({ error: 'post_id is required.' })

  const { data, error } = await supabase
    .from('replies')
    .select('id, content, session_id, created_at')
    .eq('post_id', post_id)
    .eq('is_hidden', false)
    .order('created_at', { ascending: true })
    .limit(50)

  if (error) {
    console.error('[Replies GET]', error.message)
    return res.status(500).json({ error: 'Failed to fetch replies.' })
  }

  return res.json(data || [])
})

/**
 * POST /api/replies
 * Body: { post_id, session_id, content }
 *
 * Replies pass through the full moderation engine — same crisis detection,
 * same toxicity filtering. A crisis reply returns 403 with a referral, a
 * toxic reply returns 406, and a safe reply is inserted.
 *
 * Replies are restricted to the 'advice' planet. The backend verifies the
 * parent post belongs to that planet.
 */
repliesRouter.post('/', limiter, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { post_id, session_id, content } = req.body || {}

  if (!post_id || !session_id || !content) {
    return res.status(400).json({ error: 'post_id, session_id, and content are required.' })
  }

  if (typeof content !== 'string' || content.length > 280) {
    return res.status(400).json({ error: 'Content must be 280 characters or fewer.' })
  }

  // Validate planet_id if provided — prevents 500 from DB constraint violation
  const planet_id = (req.body || {}).planet_id
  if (planet_id && !ALLOWED_PLANETS.includes(planet_id)) {
    return res.status(400).json({
      error: 'Invalid planet_id. Must be one of: joy, vent, advice, grief, anxiety, neutral, doodle'
    })
  }

  // Verify the parent post exists and belongs to the advice planet
  const { data: parent, error: parentErr } = await supabase
    .from('posts')
    .select('id, planet_id')
    .eq('id', post_id)
    .maybeSingle()

  if (parentErr || !parent) {
    return res.status(404).json({ error: 'Post not found.' })
  }

  if (parent.planet_id !== 'advice') {
    return res.status(403).json({ error: 'Replies are only enabled on the Seek Advice planet.' })
  }

  // Moderate the reply content
  const result = await moderate(content)

  appendAudit({
    type: 'moderation',
    context: 'reply',
    verdict: result.verdict,
    layer: result.layer,
    textLength: content.length,
    post_id,
  })

  if (result.verdict === 'crisis') {
    return res.status(403).json({
      verdict: 'crisis',
      error: 'Crisis detected.',
      referral: 'Please contact the mental health hotline at 1553.',
    })
  }

  if (result.verdict === 'toxic') {
    return res.status(406).json({
      verdict: 'toxic',
      error: result.reason || 'Reply blocked for harmful content.',
    })
  }

  // Safe — insert
  const { data, error } = await supabase
    .from('replies')
    .insert({ post_id, session_id, content: content.trim() })
    .select()
    .single()

  if (error) {
    console.error('[Replies INSERT]', error.message)
    return res.status(500).json({ error: 'Failed to save reply.' })
  }

  return res.json({ verdict: 'safe', reply: data })
})
