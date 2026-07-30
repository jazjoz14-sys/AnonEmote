import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { createClient } from '@supabase/supabase-js'

export const postsRouter = Router()

// Supabase admin client (lazy — only initialised when env vars are present)
let _supabase = null
function getSupabase() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  _supabase = createClient(url, key)
  return _supabase
}

// Rate limiting: max 10 post submissions per 5 minutes per IP
const postLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many posts. Please wait a moment.' },
})

/**
 * GET /api/posts?planet_id=joy
 * Returns recent posts for a given planet (optional filter).
 */
postsRouter.get('/', async (req, res) => {
  const supabase = getSupabase()
  if (!supabase) {
    return res.status(503).json({ error: 'Database not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env' })
  }

  const { planet_id, limit = 50 } = req.query

  let query = supabase
    .from('posts')
    .select('id, content, planet_id, created_at')
    // Never expose admin-hidden posts through the public API
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .limit(Math.min(Number(limit), 200))

  if (planet_id) {
    query = query.eq('planet_id', planet_id)
  }

  const { data, error } = await query

  if (error) {
    console.error('[Posts GET]', error)
    return res.status(500).json({ error: 'Failed to fetch posts.' })
  }

  return res.json(data)
})
