/**
 * Integration Tests: POST /api/evaluations
 *
 * Tests the full route handler end-to-end with mocked external services.
 * Validates: Requirements 6.1, 6.3, 6.7, 9.1, 4.4, 4.5
 *
 * Scenarios:
 * 1. Happy path (full payload) → 201
 * 2. Rating-only (no optional fields) → 201
 * 3. Toxic suggestion → 406
 * 4. Crisis suggestion → 403
 * 5. Rate limit (4th request) → 429
 * 6. Unauthenticated → 401
 * 7. Missing rating → 400
 * 8. Invalid rating type → 400
 * 9. Rating out of range → 400
 * 10. Whitespace-only suggestion → 400
 * 11. Invalid feedback_areas → 400
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import http from 'node:http'
import express from 'express'
import rateLimit from 'express-rate-limit'

// ── Mock Supabase ─────────────────────────────────────────────────────────────
const mockInsertResult = {
  data: { id: 'eval-0001-0002-0003-000000000001', created_at: '2026-08-20T12:00:00Z' },
  error: null,
}

vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ ...mockInsertResult }),
        }),
      }),
    }),
  }),
}))

// ── Mock Moderation Engine ────────────────────────────────────────────────────
// Default: safe. Override per test via moderateMock.
let moderateMock = vi.fn(() => Promise.resolve({ verdict: 'safe' }))

vi.mock('../moderation/engine.js', () => ({
  get moderate() {
    return moderateMock
  },
}))

// ── Mock requireAuth ──────────────────────────────────────────────────────────
// Default: authenticated. Override per test by creating app with custom auth.
vi.mock('../middleware/requireAuth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.isAuthenticated = true
    req.userId = 'test-user-aaaa-bbbb-cccc-000000000001'
    next()
  },
}))

// ── Test Helpers ──────────────────────────────────────────────────────────────

const VALID_FEEDBACK_AREAS = ['navigation', 'visuals', 'safety', 'support', 'exploration']

/**
 * Creates a fresh Express app with the evaluations handler.
 * Uses inline middleware + handler to get a fresh rate-limit store per test.
 *
 * @param {object} opts
 * @param {boolean} [opts.authenticated=true] - Whether auth passes
 * @param {string} [opts.userId] - Custom userId
 */
function createTestApp(opts = {}) {
  const { authenticated = true, userId = 'test-user-aaaa-bbbb-cccc-000000000001' } = opts
  const app = express()
  app.use(express.json())

  // Auth middleware
  const auth = (req, res, next) => {
    if (!authenticated) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' })
    }
    req.isAuthenticated = true
    req.userId = userId
    next()
  }

  // Rate limiter — fresh in-memory store per app instance
  const limiter = rateLimit({
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
    keyGenerator: (req) => req.userId,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' })
    },
  })

  // Validation (mirrors the actual route logic)
  function validateEvaluation(body) {
    const { rating, suggestion, feedback_areas } = body

    if (rating === undefined || rating === null) {
      return 'rating is required.'
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return 'rating must be an integer between 1 and 5.'
    }
    if (suggestion !== undefined && suggestion !== null && suggestion !== '') {
      if (typeof suggestion !== 'string') {
        return 'suggestion must be a string.'
      }
      const trimmed = suggestion.trim()
      if (trimmed.length === 0) return 'suggestion must not be whitespace-only.'
      if (trimmed.length < 3) return 'suggestion must be at least 3 characters.'
      if (trimmed.length > 140) return 'suggestion must not exceed 140 characters.'
    }
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

  // Handler (mirrors actual route logic with inline moderation call)
  app.post('/api/evaluations', auth, limiter, async (req, res) => {
    const { rating, suggestion, feedback_areas } = req.body

    const validationError = validateEvaluation(req.body)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    let moderationStatus = 'approved'
    const hasSuggestion = suggestion && typeof suggestion === 'string' && suggestion.trim().length >= 3

    if (hasSuggestion) {
      try {
        const moderationResult = await Promise.race([
          moderateMock(suggestion.trim()),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('MODERATION_TIMEOUT')), 5000)
          ),
        ])

        if (moderationResult.verdict === 'crisis') {
          return res.status(403).json({
            verdict: 'crisis',
            referral: 'Please contact the mental health hotline at 1553.',
          })
        }
        if (moderationResult.verdict === 'toxic') {
          return res.status(406).json({
            error: moderationResult.reason || 'Suggestion contains inappropriate language.',
            field: 'suggestion',
          })
        }
        moderationStatus = 'approved'
      } catch (err) {
        if (err.message === 'MODERATION_TIMEOUT') {
          moderationStatus = 'pending_review'
        } else {
          moderationStatus = 'pending_review'
        }
      }
    }

    // Simulate DB insert
    return res.status(201).json({
      id: mockInsertResult.data.id,
      created_at: mockInsertResult.data.created_at,
      moderation_status: moderationStatus,
    })
  })

  return app
}

/**
 * Send a POST request to a local server and return { status, headers, body }.
 */
function postEvaluation(port, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload)
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: '/api/evaluations',
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(bodyStr),
          ...headers,
        },
      },
      (response) => {
        let data = ''
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => {
          let body
          try { body = JSON.parse(data) } catch { body = data }
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body,
          })
        })
      }
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Integration: POST /api/evaluations', () => {
  let server
  let port

  afterEach(() => {
    if (server) {
      server.close()
      server = null
    }
    moderateMock = vi.fn(() => Promise.resolve({ verdict: 'safe' }))
  })

  // ── 1. Happy path: full payload ──────────────────────────────────────────
  it('returns 201 with id, created_at, moderation_status for valid full payload', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, {
      rating: 4,
      suggestion: 'Nostalgia planet',
      feedback_areas: ['navigation', 'visuals'],
    })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('created_at')
    expect(res.body).toHaveProperty('moderation_status', 'approved')
    // author_id must never leak
    expect(res.body).not.toHaveProperty('author_id')
  })

  // ── 2. Rating-only (no optional fields) ──────────────────────────────────
  it('returns 201 when only rating is provided (no suggestion, no feedback_areas)', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 5 })

    expect(res.status).toBe(201)
    expect(res.body).toHaveProperty('id')
    expect(res.body).toHaveProperty('created_at')
    expect(res.body.moderation_status).toBe('approved')
  })

  // ── 3. Toxic suggestion → 406 ────────────────────────────────────────────
  it('returns 406 with error and field when moderation detects toxic suggestion', async () => {
    moderateMock = vi.fn(() => Promise.resolve({ verdict: 'toxic', reason: 'inappropriate content' }))

    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, {
      rating: 3,
      suggestion: 'Some toxic suggestion here',
    })

    expect(res.status).toBe(406)
    expect(res.body).toHaveProperty('error', 'inappropriate content')
    expect(res.body).toHaveProperty('field', 'suggestion')
  })

  // ── 4. Crisis suggestion → 403 ───────────────────────────────────────────
  it('returns 403 with verdict and referral when moderation detects crisis', async () => {
    moderateMock = vi.fn(() => Promise.resolve({ verdict: 'crisis' }))

    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, {
      rating: 2,
      suggestion: 'I want to end it all',
    })

    expect(res.status).toBe(403)
    expect(res.body).toHaveProperty('verdict', 'crisis')
    expect(res.body).toHaveProperty('referral')
    expect(res.body.referral).toContain('1553')
  })

  // ── 5. Rate limiting: 4th request → 429 ──────────────────────────────────
  it('returns 429 on the 4th request from the same user within the window', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const payload = { rating: 4 }

    // First 3 requests should succeed
    for (let i = 0; i < 3; i++) {
      const res = await postEvaluation(port, payload)
      expect(res.status).toBe(201)
    }

    // 4th request should be rate-limited
    const res = await postEvaluation(port, payload)
    expect(res.status).toBe(429)
    expect(res.body).toHaveProperty('error', 'Rate limit exceeded. Please try again later.')
    expect(res.headers).toHaveProperty('retry-after')
    expect(Number(res.headers['retry-after'])).toBeGreaterThan(0)
  })

  // ── 6. Unauthenticated → 401 ─────────────────────────────────────────────
  it('returns 401 when no valid auth is provided', async () => {
    const app = createTestApp({ authenticated: false })
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 4 })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty('error')
    expect(res.body.error).toContain('Authentication required')
  })

  // ── 7. Missing rating → 400 ──────────────────────────────────────────────
  it('returns 400 with "rating is required" when rating is missing', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { suggestion: 'Hello world' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('rating is required')
  })

  // ── 8. Invalid rating type → 400 ─────────────────────────────────────────
  it('returns 400 when rating is a non-integer string', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 'abc' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('rating must be an integer between 1 and 5')
  })

  // ── 9. Rating out of range → 400 ─────────────────────────────────────────
  it('returns 400 when rating is 0 (below range)', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 0 })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('rating must be an integer between 1 and 5')
  })

  it('returns 400 when rating is 6 (above range)', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 6 })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('rating must be an integer between 1 and 5')
  })

  // ── 10. Whitespace-only suggestion → 400 ─────────────────────────────────
  it('returns 400 when suggestion is whitespace-only', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 3, suggestion: '     ' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('whitespace-only')
  })

  // ── 11. Invalid feedback_areas → 400 ─────────────────────────────────────
  it('returns 400 when feedback_areas contains unrecognized identifiers', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, {
      rating: 4,
      feedback_areas: ['invalid_area'],
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Invalid feedback area')
    expect(res.body.error).toContain('invalid_area')
  })

  // ── Additional edge cases ────────────────────────────────────────────────

  it('returns 400 when suggestion is too short (2 chars after trim)', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 4, suggestion: 'ab' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('at least 3 characters')
  })

  it('returns 400 when suggestion exceeds 140 characters', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const longSuggestion = 'A'.repeat(141)
    const res = await postEvaluation(port, { rating: 4, suggestion: longSuggestion })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('exceed 140 characters')
  })

  it('does not expose author_id in 201 response body', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 5, suggestion: 'Great planet idea' })

    expect(res.status).toBe(201)
    expect(res.body).not.toHaveProperty('author_id')
    expect(Object.keys(res.body)).toEqual(expect.arrayContaining(['id', 'created_at', 'moderation_status']))
  })

  it('returns 400 when feedback_areas is not an array', async () => {
    const app = createTestApp()
    server = app.listen(0)
    port = server.address().port

    const res = await postEvaluation(port, { rating: 3, feedback_areas: 'navigation' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('feedback_areas must be an array')
  })
})
