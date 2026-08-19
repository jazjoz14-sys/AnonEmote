/**
 * Drawing Validation Tests (Doodle Planet)
 *
 * Tests POST /api/moderate drawing field validation for the doodle planet.
 *
 * **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**
 *
 * - Drawing field on non-doodle planet → ignored, only text stored, returns 200
 * - Drawing without "data:image/png;base64," prefix → 400 'Invalid drawing data.'
 * - Drawing exceeding 700,000 characters → 400 'Invalid drawing data.'
 * - Valid drawing on doodle planet → 200 with drawing in response
 * - Doodle planet with drawing but missing/empty text → 400 'text is required.'
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

// Extract the POST handler from the moderation router
let handler

beforeEach(async () => {
  vi.clearAllMocks()

  const mod = await import('./moderation.js')
  const router = mod.moderationRouter

  // Find the POST '/' handler (last in the route stack, after rate limiter middleware)
  const layers = router.stack.filter(l => l.route && l.route.path === '/')
  const postRoute = layers.find(l => l.route.methods.post)
  const routeHandlers = postRoute.route.stack
  handler = routeHandlers[routeHandlers.length - 1].handle
})

describe('Drawing Validation — Doodle Planet', () => {
  describe('Requirement 10.1: Drawing field on non-doodle planet is ignored', () => {
    it('should ignore drawing field, store only text, and return 200', async () => {
      /**
       * **Validates: Requirements 10.1**
       */
      const validDrawing = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='
      const mockPost = { id: 'post-1', content: 'Feeling great today', planet_id: 'joy' }

      const mockSupabase = createMockSupabase({
        insertResult: { data: mockPost, error: null },
      })

      moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: {
          text: 'Feeling great today',
          planet_id: 'joy',
          session_id: 'sess-123',
          drawing: validDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res._json.verdict).toBe('safe')
      expect(res._json.post).toEqual(mockPost)

      // Verify that the insert payload did NOT include the drawing field
      const fromCall = mockSupabase.from
      expect(fromCall).toHaveBeenCalledWith('posts')
      const insertCall = fromCall.mock.results[0].value.insert
      const insertedData = insertCall.mock.calls[0][0]
      expect(insertedData).not.toHaveProperty('drawing')
      expect(insertedData.content).toBe('Feeling great today')
    })
  })

  describe('Requirement 10.2: Drawing without valid prefix', () => {
    it('should return 400 when drawing lacks "data:image/png;base64," prefix', async () => {
      /**
       * **Validates: Requirements 10.2**
       */
      const invalidDrawing = 'not-a-valid-data-url-just-random-base64-content'

      const mockSupabase = createMockSupabase({
        insertResult: { data: null, error: null },
      })

      moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: {
          text: 'My doodle',
          planet_id: 'doodle',
          session_id: 'sess-123',
          drawing: invalidDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json).toEqual({ error: 'Invalid drawing data.' })
    })

    it('should return 400 for drawing with wrong image type prefix', async () => {
      /**
       * **Validates: Requirements 10.2**
       */
      const jpegDrawing = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

      const mockSupabase = createMockSupabase({
        insertResult: { data: null, error: null },
      })

      moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: {
          text: 'My doodle',
          planet_id: 'doodle',
          session_id: 'sess-123',
          drawing: jpegDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json).toEqual({ error: 'Invalid drawing data.' })
    })
  })

  describe('Requirement 10.3: Drawing exceeding 700,000 characters', () => {
    it('should return 400 when drawing exceeds 700,000 characters', async () => {
      /**
       * **Validates: Requirements 10.3**
       */
      const prefix = 'data:image/png;base64,'
      // Create a string that exceeds 700,000 total characters
      const oversizedDrawing = prefix + 'A'.repeat(700000 - prefix.length + 1)

      const mockSupabase = createMockSupabase({
        insertResult: { data: null, error: null },
      })

      moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: {
          text: 'My big doodle',
          planet_id: 'doodle',
          session_id: 'sess-123',
          drawing: oversizedDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json).toEqual({ error: 'Invalid drawing data.' })
    })
  })

  describe('Requirement 10.4: Valid drawing on doodle planet', () => {
    it('should return 200 with drawing in response for valid doodle post', async () => {
      /**
       * **Validates: Requirements 10.4**
       */
      const validDrawing = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const mockPost = {
        id: 'post-2',
        content: 'My doodle art',
        planet_id: 'doodle',
        drawing: validDrawing,
      }

      const mockSupabase = createMockSupabase({
        insertResult: { data: mockPost, error: null },
      })

      moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: {
          text: 'My doodle art',
          planet_id: 'doodle',
          session_id: 'sess-123',
          drawing: validDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res._json.verdict).toBe('safe')
      expect(res._json.post).toEqual(mockPost)
      expect(res._json.post.drawing).toBe(validDrawing)

      // Verify the insert payload includes the drawing
      const fromCall = mockSupabase.from
      const insertCall = fromCall.mock.results[0].value.insert
      const insertedData = insertCall.mock.calls[0][0]
      expect(insertedData.drawing).toBe(validDrawing)
    })

    it('should accept drawing at exactly 700,000 characters (boundary)', async () => {
      /**
       * **Validates: Requirements 10.4**
       */
      const prefix = 'data:image/png;base64,'
      // Exactly 700,000 characters total
      const boundaryDrawing = prefix + 'A'.repeat(700000 - prefix.length)

      const mockPost = {
        id: 'post-3',
        content: 'Boundary doodle',
        planet_id: 'doodle',
        drawing: boundaryDrawing,
      }

      const mockSupabase = createMockSupabase({
        insertResult: { data: mockPost, error: null },
      })

      moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
      getSupabase.mockReturnValue(mockSupabase)

      const req = createMockReq({
        method: 'POST',
        body: {
          text: 'Boundary doodle',
          planet_id: 'doodle',
          session_id: 'sess-123',
          drawing: boundaryDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res._json.verdict).toBe('safe')
      expect(res._json.post.drawing).toBe(boundaryDrawing)
    })
  })

  describe('Requirement 10.5: Doodle planet with missing/empty text', () => {
    it('should return 400 when text is missing on doodle planet', async () => {
      /**
       * **Validates: Requirements 10.5**
       */
      const validDrawing = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='

      const req = createMockReq({
        method: 'POST',
        body: {
          planet_id: 'doodle',
          session_id: 'sess-123',
          drawing: validDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json).toEqual({ error: 'text is required.' })
    })

    it('should return 400 when text is empty string on doodle planet', async () => {
      /**
       * **Validates: Requirements 10.5**
       */
      const validDrawing = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='

      const req = createMockReq({
        method: 'POST',
        body: {
          text: '',
          planet_id: 'doodle',
          session_id: 'sess-123',
          drawing: validDrawing,
        },
      })
      const res = createMockRes()

      await handler(req, res)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res._json).toEqual({ error: 'text is required.' })
    })
  })
})
