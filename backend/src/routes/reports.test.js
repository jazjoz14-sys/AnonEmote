/**
 * Reports Route Validation Tests
 *
 * Verifies input validation, deduplication handling, self_harm referral,
 * and database unavailability for POST /api/reports.
 *
 * **Validates: Requirements 3.4, 11.1, 11.2**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, createMockSupabase } from '../../tests/helpers.js'

// Mock dependencies
vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(),
}))

vi.mock('../lib/reporterHash.js', () => ({
  reporterHash: vi.fn(() => 'mocked-hash-value'),
}))

vi.mock('../lib/storage.js', () => ({
  appendAudit: vi.fn(),
}))

// Bypass rate limiter in tests
vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}))

import { getSupabase } from '../lib/supabase.js'
import { reporterHash } from '../lib/reporterHash.js'
import { reportsRouter } from './reports.js'

/**
 * Helper: invoke the POST / handler directly.
 * The router registers a single POST route at '/'.
 * We pull out the final handler (skipping the rate limiter middleware).
 */
function getHandler() {
  // The route stack: reportsRouter.post('/', limiter, handler)
  // In the router's stack, find the route for POST /
  const layer = reportsRouter.stack.find(
    (l) => l.route && l.route.methods.post
  )
  // The last function in the route's stack is the async handler
  const handlers = layer.route.stack.map((s) => s.handle)
  return handlers[handlers.length - 1]
}

describe('POST /api/reports — Validation', () => {
  let handler

  beforeEach(() => {
    vi.clearAllMocks()
    handler = getHandler()
  })

  it('returns 400 with "Invalid report reason." for an invalid reason', async () => {
    const mockSupabase = createMockSupabase()
    getSupabase.mockReturnValue(mockSupabase)

    const req = createMockReq({
      body: {
        post_id: 'post-123',
        reason: 'trolling', // not in valid set
      },
      userId: 'auth-user-id',
      isAuthenticated: true,
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._json.error).toBe('Invalid report reason.')
  })

  it('returns 400 when required fields are missing', async () => {
    const mockSupabase = createMockSupabase()
    getSupabase.mockReturnValue(mockSupabase)

    const req = createMockReq({
      body: {
        post_id: 'post-123',
        // missing reason
      },
      userId: 'auth-user-id',
      isAuthenticated: true,
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._json.error).toContain('required')
  })

  it('returns 200 with alreadyReported: true on duplicate report (23505)', async () => {
    const mockSupabase = createMockSupabase({
      insertResult: { data: null, error: { code: '23505', message: 'unique violation' } },
    })
    getSupabase.mockReturnValue(mockSupabase)

    const req = createMockReq({
      body: {
        post_id: 'post-123',
        reason: 'spam',
      },
      userId: 'auth-user-id',
      isAuthenticated: true,
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.alreadyReported).toBe(true)
    expect(res._json.ok).toBe(true)
  })

  it('includes referral with hotlines when reason is self_harm', async () => {
    const mockSupabase = createMockSupabase({
      insertResult: { data: [{ id: 1 }], error: null },
    })
    getSupabase.mockReturnValue(mockSupabase)

    const req = createMockReq({
      body: {
        post_id: 'post-123',
        reason: 'self_harm',
      },
      userId: 'auth-user-id',
      isAuthenticated: true,
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.referral).toBeDefined()
    expect(res._json.referral.hotlines).toBeInstanceOf(Array)
    expect(res._json.referral.hotlines.length).toBeGreaterThanOrEqual(1)
    // Each hotline must have name and number
    for (const hotline of res._json.referral.hotlines) {
      expect(hotline).toHaveProperty('name')
      expect(hotline).toHaveProperty('number')
    }
  })

  it('returns 503 when database is not configured', async () => {
    getSupabase.mockReturnValue(null)

    const req = createMockReq({
      body: {
        post_id: 'post-123',
        reason: 'harassment',
      },
      userId: 'auth-user-id',
      isAuthenticated: true,
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(503)
    expect(res._json.error).toBe('Database not configured.')
  })

  it('returns 400 when note exceeds 300 characters', async () => {
    const mockSupabase = createMockSupabase()
    getSupabase.mockReturnValue(mockSupabase)

    const req = createMockReq({
      body: {
        post_id: 'post-123',
        reason: 'harassment',
        note: 'x'.repeat(301),
      },
      userId: 'auth-user-id',
      isAuthenticated: true,
    })
    const res = createMockRes()

    await handler(req, res)

    expect(res.statusCode).toBe(400)
    expect(res._json.error).toContain('300')
  })
})
