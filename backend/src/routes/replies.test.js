/**
 * Replies Route Validation Tests
 *
 * Verifies that POST /api/replies correctly validates input, enforces the
 * advice-planet restriction, and returns proper HTTP status codes.
 *
 * **Validates: Requirements 3.5, 3.6**
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes, createMockSupabase } from '../../../tests/helpers.js'

// Mock dependencies
vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(),
}))

vi.mock('../moderation/engine.js', () => ({
  moderate: vi.fn(),
}))

vi.mock('../lib/storage.js', () => ({
  appendAudit: vi.fn(),
}))

// Mock express-rate-limit to be a pass-through
vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}))

import { getSupabase } from '../lib/supabase.js'
import { moderate } from '../moderation/engine.js'
import { repliesRouter } from './replies.js'

/**
 * Helper to invoke the POST handler directly.
 * The router registers: POST '/' with [limiter, handler].
 * We extract the final handler from the router stack.
 */
function getPostHandler() {
  const postRoute = repliesRouter.stack.find(
    (layer) => layer.route && layer.route.path === '/' && layer.route.methods.post
  )
  // The route has multiple handlers (limiter middleware + actual handler)
  // We need the last one (the actual handler)
  const handlers = postRoute.route.stack.filter((s) => s.method === 'post')
  return handlers[handlers.length - 1].handle
}

describe('POST /api/replies — Validation', () => {
  let mockSupabase

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = createMockSupabase()
    getSupabase.mockReturnValue(mockSupabase)
  })

  describe('Database not configured → 503', () => {
    it('returns 503 when Supabase is not configured', async () => {
      getSupabase.mockReturnValue(null)

      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'abc-123', session_id: 'sess-1', content: 'Hello' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(503)
      expect(res._json).toEqual({ error: 'Database not configured.' })
    })
  })

  describe('Missing required fields → 400', () => {
    it('returns 400 when post_id is missing', async () => {
      const req = createMockReq({
        method: 'POST',
        body: { session_id: 'sess-1', content: 'Hello' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json.error).toContain('required')
    })

    it('returns 400 when session_id is missing', async () => {
      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'abc-123', content: 'Hello' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json.error).toContain('required')
    })

    it('returns 400 when content is missing', async () => {
      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'abc-123', session_id: 'sess-1' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json.error).toContain('required')
    })
  })

  describe('Content exceeds 280 characters → 400', () => {
    it('returns 400 when content is longer than 280 chars', async () => {
      const longContent = 'a'.repeat(281)
      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'abc-123', session_id: 'sess-1', content: longContent },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json.error).toMatch(/280/i)
    })
  })

  describe('Non-existent post → 404', () => {
    it('returns 404 when parent post does not exist', async () => {
      // Configure mock so parent lookup returns null
      mockSupabase = createMockSupabase({
        selectResult: { data: null, error: null },
      })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'non-existent-id', session_id: 'sess-1', content: 'Hello' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res._json).toEqual({ error: 'Post not found.' })
    })

    it('returns 404 when parent post query errors', async () => {
      // Configure mock so parent lookup returns an error
      mockSupabase = createMockSupabase({
        selectResult: { data: null, error: { message: 'DB error' } },
      })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'some-id', session_id: 'sess-1', content: 'Hello' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(404)
      expect(res._json).toEqual({ error: 'Post not found.' })
    })
  })

  describe('Parent post not on advice planet → 403', () => {
    it('returns 403 when parent post is on joy planet', async () => {
      mockSupabase = createMockSupabase({
        selectResult: { data: { id: 'post-1', planet_id: 'joy' }, error: null },
      })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'post-1', session_id: 'sess-1', content: 'Hello' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res._json).toEqual({
        error: 'Replies are only enabled on the Seek Advice planet.',
      })
    })

    it('returns 403 when parent post is on vent planet', async () => {
      mockSupabase = createMockSupabase({
        selectResult: { data: { id: 'post-2', planet_id: 'vent' }, error: null },
      })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: { post_id: 'post-2', session_id: 'sess-1', content: 'Need help' },
      })
      const res = createMockRes()
      const handler = getPostHandler()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(403)
      expect(res._json).toEqual({
        error: 'Replies are only enabled on the Seek Advice planet.',
      })
    })

    it('returns 403 for any non-advice planet', async () => {
      const nonAdvicePlanets = ['joy', 'vent', 'grief', 'anxiety', 'neutral', 'doodle']

      for (const planet of nonAdvicePlanets) {
        vi.clearAllMocks()
        const supabase = createMockSupabase({
          selectResult: { data: { id: `post-${planet}`, planet_id: planet }, error: null },
        })
        getSupabase.mockReturnValue(supabase)

        const req = createMockReq({
          method: 'POST',
          body: { post_id: `post-${planet}`, session_id: 'sess-1', content: 'Test reply' },
        })
        const res = createMockRes()
        const handler = getPostHandler()

        await handler(req, res)

        expect(res.status).toHaveBeenCalledWith(403)
        expect(res._json.error).toBe(
          'Replies are only enabled on the Seek Advice planet.'
        )
      }
    })
  })
})
