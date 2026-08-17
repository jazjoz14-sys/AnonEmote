import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getSupabase } from '../lib/supabase.js'

export const reactionsRouter = Router()

// Must stay in sync with the DB CHECK constraint and frontend/src/data/reactions.js
const ALLOWED_EMOJI = ['🫂', '💙', '😢', '🌱', '✨']

// Valid planet_id values — must stay in sync with the DB CHECK constraint
const ALLOWED_PLANETS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reactions. Please slow down.' },
})

/**
 * GET /api/reactions?post_ids=uuid1,uuid2
 *
 * Returns aggregated counts plus the caller's own reaction:
 *   { "<postId>": { counts: { "🫂": 3 }, mine: "🫂" | null } }
 */
reactionsRouter.get('/', async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { post_ids, session_id } = req.query
  if (!post_ids) return res.json({})

  const ids = String(post_ids).split(',').filter(Boolean).slice(0, 200)
  if (ids.length === 0) return res.json({})

  const { data, error } = await supabase
    .from('reactions')
    .select('post_id, emoji, session_id')
    .in('post_id', ids)

  if (error) {
    console.error('[Reactions GET]', error.message)
    return res.status(500).json({ error: 'Failed to fetch reactions.' })
  }

  const summary = {}
  for (const row of data) {
    if (!summary[row.post_id]) summary[row.post_id] = { counts: {}, mine: null }
    summary[row.post_id].counts[row.emoji] =
      (summary[row.post_id].counts[row.emoji] || 0) + 1
    if (session_id && row.session_id === session_id) {
      summary[row.post_id].mine = row.emoji
    }
  }

  return res.json(summary)
})

/**
 * POST /api/reactions
 * Body: { post_id, session_id, emoji }
 *
 * Toggle semantics — one reaction per session per post:
 *   - same emoji again  → removed
 *   - different emoji   → switched
 *   - none yet          → added
 *
 * Returns: { action: 'added'|'removed'|'switched', emoji: string|null }
 */
reactionsRouter.post('/', limiter, async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) return res.status(503).json({ error: 'Database not configured.' })

  const { post_id, session_id, emoji } = req.body

  if (!post_id || !session_id || !emoji) {
    return res.status(400).json({ error: 'post_id, session_id and emoji are required.' })
  }

  // Reject anything outside the allowed emoji set — blocks arbitrary text
  if (!ALLOWED_EMOJI.includes(emoji)) {
    return res.status(400).json({ error: 'Only approved emoji reactions are allowed.' })
  }

  // Validate planet_id if provided — prevents 500 from DB constraint violation
  const planet_id = req.body.planet_id
  if (planet_id && !ALLOWED_PLANETS.includes(planet_id)) {
    return res.status(400).json({
      error: 'Invalid planet_id. Must be one of: joy, vent, advice, grief, anxiety, neutral, doodle'
    })
  }

  // Look up any existing reaction from this session on this post
  const { data: existing, error: findErr } = await supabase
    .from('reactions')
    .select('id, emoji')
    .eq('post_id', post_id)
    .eq('session_id', session_id)
    .maybeSingle()

  if (findErr) {
    console.error('[Reactions POST lookup]', findErr.message)
    return res.status(500).json({ error: 'Failed to save reaction.' })
  }

  // Same emoji → remove (toggle off)
  if (existing && existing.emoji === emoji) {
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id)
    if (error) {
      console.error('[Reactions DELETE]', error.message)
      return res.status(500).json({ error: 'Failed to remove reaction.' })
    }
    return res.json({ action: 'removed', emoji: null })
  }

  // Different emoji → switch
  if (existing) {
    const { error } = await supabase
      .from('reactions')
      .update({ emoji })
      .eq('id', existing.id)
    if (error) {
      console.error('[Reactions UPDATE]', error.message)
      return res.status(500).json({ error: 'Failed to update reaction.' })
    }
    return res.json({ action: 'switched', emoji })
  }

  // None yet → add (atomic upsert eliminates race window between SELECT and INSERT)
  const { data: upserted, error: upsertErr } = await supabase
    .from('reactions')
    .upsert(
      { post_id, session_id, emoji },
      { onConflict: 'post_id,session_id', ignoreDuplicates: false }
    )
    .select('id, emoji')
    .single()

  if (upsertErr) {
    console.error('[Reactions UPSERT]', upsertErr.message)
    return res.status(500).json({ error: 'Failed to add reaction.' })
  }

  return res.json({ action: 'added', emoji })
})
