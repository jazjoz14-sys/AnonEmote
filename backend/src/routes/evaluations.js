import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { getSupabase } from '../lib/supabase.js'
import { moderate } from '../moderation/engine.js'
import { requireAuth } from '../middleware/requireAuth.js'

export const evaluationsRouter = Router()

// ── Rate Limiting ────────────────────────────────────────────────────────────
// 3 evaluations per authenticated user per 24-hour window.
// Keyed by userId (from JWT), not IP, so each user gets their own bucket.
const evaluationRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  keyGenerator: (req) => req.userId,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' })
  },
})

// ── Validation constants ─────────────────────────────────────────────────────
const VALID_FEEDBACK_AREAS = ['navigation', 'visuals', 'safety', 'support', 'exploration']

/**
 * Validates the evaluation request body.
 * Returns null if valid, or an error message string if invalid.
 *
 * @param {object} body - The request body
 * @returns {string|null} Error message or null
 */
function validateEvaluation(body) {
  const { rating, suggestion, feedback_areas } = body

  // Rating is required, must be integer 1–5
  if (rating === undefined || rating === null) {
    return 'rating is required.'
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return 'rating must be an integer between 1 and 5.'
  }

  // Suggestion is optional, but if present must be non-whitespace-only, 3–140 chars
  if (suggestion !== undefined && suggestion !== null && suggestion !== '') {
    if (typeof suggestion !== 'string') {
      return 'suggestion must be a string.'
    }
    const trimmed = suggestion.trim()
    if (trimmed.length === 0) {
      return 'suggestion must not be whitespace-only.'
    }
    if (trimmed.length < 3) {
      return 'suggestion must be at least 3 characters.'
    }
    if (trimmed.length > 140) {
      return 'suggestion must not exceed 140 characters.'
    }
  }

  // Feedback areas is optional, but if present must be array of recognized identifiers
  if (feedback_areas !== undefined && feedback_areas !== null) {
    if (!Array.isArray(feedback_areas)) {
      return 'feedback_areas must be an array.'
    }
    for (const area of feedback_areas) {
      if (!VALID_FEEDBACK_AREAS.includes(area)) {
        return `Invalid feedback area: "${area}". Must be one of: ${VALID_FEEDBACK_AREAS.join(', ')}.`
      }
    }
  }

  return null
}

/**
 * POST /api/evaluations
 *
 * Body: { rating: number, suggestion?: string, feedback_areas?: string[] }
 *
 * Middleware chain: requireAuth → evaluationRateLimit → handler
 *
 * Responses:
 *   201 — evaluation stored → { id, created_at }
 *   400 — validation failure → { error }
 *   401 — not authenticated → { error }
 *   403 — crisis detected in suggestion → { verdict: "crisis", referral }
 *   406 — toxic suggestion → { error, field: "suggestion" }
 *   429 — rate limit exceeded → { error } + Retry-After header
 *   500 — db/server error → { error }
 */
evaluationsRouter.post('/', requireAuth, evaluationRateLimit, async (req, res) => {
  const { rating, suggestion, feedback_areas } = req.body

  // ── Validation ───────────────────────────────────────────────────────────
  const validationError = validateEvaluation(req.body)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  // ── Moderation (only if suggestion is provided) ──────────────────────────
  let moderationStatus = 'approved'

  const hasSuggestion = suggestion && typeof suggestion === 'string' && suggestion.trim().length >= 3

  if (hasSuggestion) {
    try {
      // 5-second timeout for moderation — if it takes longer, we store as pending_review
      const moderationResult = await Promise.race([
        moderate(suggestion.trim()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('MODERATION_TIMEOUT')), 5000)
        ),
      ])

      // Crisis — return 403 with referral
      if (moderationResult.verdict === 'crisis') {
        return res.status(403).json({
          verdict: 'crisis',
          referral: 'Please contact the mental health hotline at 1553.',
        })
      }

      // Toxic — return 406 with field indicator
      if (moderationResult.verdict === 'toxic') {
        return res.status(406).json({
          error: moderationResult.reason || 'Suggestion contains inappropriate language.',
          field: 'suggestion',
        })
      }

      // Safe — approved
      moderationStatus = 'approved'
    } catch (err) {
      if (err.message === 'MODERATION_TIMEOUT') {
        // Moderation timed out — store with pending_review status
        moderationStatus = 'pending_review'
      } else {
        // Unexpected moderation error — treat as pending_review to avoid blocking
        console.error('[Evaluations] Moderation error:', err.message)
        moderationStatus = 'pending_review'
      }
    }
  }

  // ── Database insert ──────────────────────────────────────────────────────
  const supabase = getSupabase()
  if (!supabase) {
    return res.status(500).json({ error: 'Database not configured.' })
  }

  const insertPayload = {
    author_id: req.userId, // Always from JWT, never client-supplied
    rating,
    suggestion: hasSuggestion ? suggestion.trim() : null,
    moderation_status: moderationStatus,
    feedback_areas: Array.isArray(feedback_areas) ? feedback_areas : [],
  }

  const { data, error } = await supabase
    .from('evaluations')
    .insert(insertPayload)
    .select('id, created_at')
    .single()

  if (error) {
    console.error('[Evaluations] DB insert error:', {
      message: error.message,
      details: error.details,
      author_id: req.userId,
    })
    return res.status(500).json({ error: 'Failed to save evaluation.' })
  }

  // Return only id, created_at, and moderation_status — never expose author_id
  return res.status(201).json({ id: data.id, created_at: data.created_at, moderation_status: moderationStatus })
})
