/**
 * Drawing Validation Property-Based Tests (Doodle Planet)
 *
 * Property-based tests for drawing field validation on the doodle planet
 * using fast-check to generate adversarial inputs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
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

describe('Drawing Validation Property Tests', () => {
  describe('Feature: qa-testing-error-handling, Property 19: Drawing validation rejects invalid prefixes', () => {
    it('should return 400 for any drawing string not starting with "data:image/png;base64,"', () => {
      /**
       * **Validates: Requirements 10.2**
       *
       * Property 19: For any string that does not start with "data:image/png;base64,",
       * submitting it as a drawing field to the doodle planet SHALL return HTTP 400
       * with error 'Invalid drawing data.'
       */
      const VALID_PREFIX = 'data:image/png;base64,'

      const invalidDrawingArb = fc
        .string({ minLength: 1, maxLength: 100 })
        .filter(s => !s.startsWith(VALID_PREFIX))

      return fc.assert(
        fc.asyncProperty(invalidDrawingArb, async (invalidDrawing) => {
          vi.clearAllMocks()

          moderate.mockResolvedValue({ verdict: 'safe', layer: 'english-fallback' })
          const mockSupabase = createMockSupabase({
            insertResult: { data: null, error: null },
          })
          getSupabase.mockReturnValue(mockSupabase)

          const req = createMockReq({
            method: 'POST',
            body: {
              text: 'A valid doodle description',
              planet_id: 'doodle',
              session_id: 'sess-pbt-123',
              drawing: invalidDrawing,
            },
          })
          const res = createMockRes()

          await handler(req, res)

          expect(res.status).toHaveBeenCalledWith(400)
          expect(res._json).toEqual({ error: 'Invalid drawing data.' })
        }),
        { numRuns: 100 }
      )
    })
  })

  describe('Feature: qa-testing-error-handling, Property 20: Drawing validation rejects oversized data', () => {
    it('should reject drawings exceeding 700,000 characters even with valid prefix', () => {
      /**
       * **Validates: Requirements 10.3**
       *
       * Property 20: For any string starting with "data:image/png;base64," that exceeds
       * 700,000 characters in total length, submitting it as a drawing field to the
       * doodle planet SHALL return HTTP 400 with error 'Invalid drawing data.'
       */
      const prefix = 'data:image/png;base64,'

      return fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 700001, max: 750000 }),
          async (totalLength) => {
            vi.clearAllMocks()

            // Construct a string with valid prefix but exceeding size limit
            const oversizedDrawing = prefix + 'A'.repeat(totalLength - prefix.length)

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
                drawing: oversizedDrawing,
              },
            })
            const res = createMockRes()

            await handler(req, res)

            expect(res.status).toHaveBeenCalledWith(400)
            expect(res._json).toEqual({ error: 'Invalid drawing data.' })
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
