/**
 * Moderation Route Validation Tests
 *
 * Tests POST /api/moderate input validation, moderation verdict handling,
 * and database error scenarios.
 *
 * **Validates: Requirements 3.1, 3.2, 5.6**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, createMockSupabase } from '../../../tests/helpers.js'

// Mock the moderation engine
vi.mock('../moderation/engine.js', () => ({
  moderate: vi.fn(),
}))

// Mock the supabase client
vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(),
}))

// Mock the storage module (appendAudit)
vi.mock('../lib/storage.js', () => ({
  appendAudit: vi.fn(),
}))

// Mock express-rate-limit to pass through
vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}))

import { moderate } from '../moderation/engine.js'
import { getSupabase } from '../lib/supabase.js'

// We need to import the route handler. Since it's an Express Router,
// we'll extract the handler from the router's stack.
let handler

beforeEach(async () => {
  vi.clearAllMocks()

  // Re-import the module to get a fresh router with our mocks applied
  const mod = await import('./moderation.js')
  const router = mod.moderationRouter

  // The POST '/' handler is the last layer in the router stack
  // (first is the rate limiter mock, second is the actual handler)
  const layers = router.stack.filter(l => l.route && l.route.path === '/')
  const postRoute = layers.find(l => l.route.methods.post)
  // The route has middleware (rate limiter) + the actual handler
  const routeHandlers = postRoute.route.stack
  handler = routeHandlers[routeHandlers.length - 1].handle
})

describe('POST /api/moderate — Input Validation', () => {
  it('returns 400 when text field is missing', async () => {
    const req = createMockReq({ body: { planet_id: 'joy' }, method: 'POST' })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json).toEqual({ error: 'text is required.' })
  })

  it('returns 400 when text is not a string (e.g. number)', async () => {
    const req = createMockReq({ body: { text: 123, planet_id: 'joy' }, method: 'POST' })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json).toEqual({ error: 'text is required.' })
  })

  it('returns 400 when text is empty string', async () => {
    const req = createMockReq({ body: { text: '', planet_id: 'joy' }, method: 'POST' })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json).toEqual({ error: 'text is required.' })
  })

  it('returns 400 with valid planet list when planet_id is invalid', async () => {
    const req = createMockReq({ body: { text: 'Hello world', planet_id: 'mars' }, method: 'POST' })
    const res = createMockRes()

    // moderate won't be called because validation fails first — but we still need
    // planet_id to be present so the first validation check passes
    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res._json.error).toContain('Invalid planet_id')
    expect(res._json.error).toContain('joy')
    expect(res._json.error).toContain('vent')
    expect(res._json.error).toContain('advice')
    expect(res._json.error).toContain('grief')
    expect(res._json.error).toContain('anxiety')
    expect(res._json.error).toContain('neutral')
    expect(res._json.error).toContain('doodle')
  })
})

describe('POST /api/moderate — Verdict Handling', () => {
  it('returns 200 with post data for safe verdict', async () => {
    const mockPost = { id: 'abc-123', content: 'I am happy', planet_id: 'joy' }
    const mockSupabase = createMockSupabase({
      insertResult: { data: mockPost, error: null },
    })

    moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
    getSupabase.mockReturnValue(mockSupabase)

    const req = createMockReq({
      body: { text: 'I am happy', planet_id: 'joy', session_id: 'sess-1' },
      method: 'POST',
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res._json.verdict).toBe('safe')
    expect(res._json.post).toEqual(mockPost)
  })

  it('returns 403 with referral for crisis verdict', async () => {
    moderate.mockResolvedValue({ verdict: 'crisis', layer: 'crisis-keywords' })

    const req = createMockReq({
      body: { text: 'I want to end it all', planet_id: 'vent', session_id: 'sess-1' },
      method: 'POST',
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res._json.verdict).toBe('crisis')
    expect(res._json.error).toBe('Crisis detected.')
    expect(res._json.referral).toBeDefined()
    expect(typeof res._json.referral).toBe('string')
  })

  it('returns 406 with error for toxic verdict', async () => {
    moderate.mockResolvedValue({ verdict: 'toxic', layer: 'vernacular-keywords', reason: 'Toxic content blocked.' })

    const req = createMockReq({
      body: { text: 'Bad word here', planet_id: 'vent', session_id: 'sess-1' },
      method: 'POST',
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(406)
    expect(res._json.verdict).toBe('toxic')
    expect(res._json.error).toBeDefined()
  })
})

describe('POST /api/moderate — Database Error Handling', () => {
  it('returns 500 with "Database not configured." when Supabase is null', async () => {
    moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
    getSupabase.mockReturnValue(null)

    const req = createMockReq({
      body: { text: 'Hello world', planet_id: 'joy', session_id: 'sess-1' },
      method: 'POST',
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res._json).toEqual({ error: 'Database not configured.' })
  })

  it('returns 500 with generic error on DB insert failure (no internal details)', async () => {
    const mockSupabase = createMockSupabase({
      insertResult: { data: null, error: { message: 'relation "posts" does not exist', code: '42P01' } },
    })

    moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
    getSupabase.mockReturnValue(mockSupabase)

    const req = createMockReq({
      body: { text: 'Hello world', planet_id: 'joy', session_id: 'sess-1' },
      method: 'POST',
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res._json.error).toBe('Failed to save post.')
    // Must NOT expose internal details
    expect(res._json.error).not.toContain('relation')
    expect(res._json.error).not.toContain('posts')
    expect(res._json.error).not.toContain('42P01')
  })
})
