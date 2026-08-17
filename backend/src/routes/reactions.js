import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'

export const reactionsRouter = Router()

// Must stay in sync with the DB CHECK constraint and frontend/src/data/reactions.js
const ALLOWED_EMOJI = ['🫂', '💙', '😢', '🌱', '✨']

let _supabase = null
function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

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

  // None yet → add
  const { error } = await supabase
    .from('reactions')
    .insert({ post_id, session_id, emoji })

  if (error) {
    // Handle race condition: if another request already inserted a reaction
    // for this session+post, treat it as a switch instead of failing
    if (error.code === '23505') { // unique_violation
      const { error: updateErr } = await supabase
        .from('reactions')
        .update({ emoji })
        .eq('post_id', post_id)
        .eq('session_id', session_id)
      if (updateErr) {
        console.error('[Reactions RACE UPDATE]', updateErr.message)
        return res.status(500).json({ error: 'Failed to save reaction.' })
      }
      return res.json({ action: 'switched', emoji })
    }
    console.error('[Reactions INSERT]', error.message)
    return res.status(500).json({ error: 'Failed to add reaction.' })
  }

  return res.json({ action: 'added', emoji })
})
