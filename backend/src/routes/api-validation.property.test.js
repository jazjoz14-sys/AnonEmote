/**
 * API Validation Property-Based Tests
 *
 * Property 15: Invalid input rejection for constrained sets
 * **Validates: Requirements 3.2, 3.3, 3.4**
 *
 * Uses fast-check to verify that any string NOT in the valid constrained sets
 * (planet_id, emoji, report reason) is rejected with HTTP 400.
 *
 * Tag: Feature: qa-testing-error-handling, Property 15: Invalid input rejection for constrained sets
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import fc from 'fast-check'
import { createMockReq, createMockRes, createMockSupabase } from '../../../tests/helpers.js'

// ── Mock Dependencies ────────────────────────────────────────────────────────

// Mock supabase
vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(),
}))

// Mock moderation engine (needed for moderation route)
vi.mock('../moderation/engine.js', () => ({
  moderate: vi.fn(),
}))

// Mock storage (appendAudit)
vi.mock('../lib/storage.js', () => ({
  appendAudit: vi.fn(),
  getLexiconSync: vi.fn(() => ({ allow: [], toxic: [], crisis: [] })),
}))

// Mock express-rate-limit to pass through
vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}))

// Mock reporterHash (needed for reports route)
vi.mock('../lib/reporterHash.js', () => ({
  reporterHash: vi.fn(() => 'mock-hash-123'),
}))

import { getSupabase } from '../lib/supabase.js'
import { moderate } from '../moderation/engine.js'

// ── Valid constrained sets ───────────────────────────────────────────────────

const VALID_PLANET_IDS = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']
const VALID_EMOJIS = ['🫂', '💙', '😢', '🌱', '✨']
const VALID_REASONS = ['harassment', 'hate_speech', 'self_harm', 'spam', 'other']

// ── Helper: Extract route handler from Express Router ────────────────────────

/**
 * Finds a route handler from an Express Router's internal stack.
 * Skips middleware (rate limiters, etc.) and returns the final handler.
 */
function findRouteHandler(router, method, path) {
  const layer = router.stack.find(
    (l) => l.route && l.route.path === path && l.route.methods[method]
  )
  if (!layer) throw new Error(`No ${method.toUpperCase()} ${path} handler found in router`)
  // Return the last handler in the route stack (skipping middleware like rate limiter)
  const handlers = layer.route.stack.map((s) => s.handle)
  return handlers[handlers.length - 1]
}

// ── Property 15: Invalid input rejection for constrained sets ────────────────

describe('Feature: qa-testing-error-handling, Property 15: Invalid input rejection for constrained sets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Sub-property 15a: Invalid planet_id → 400 ─────────────────────────────
  describe('Sub-property 15a: Invalid planet_id rejection (POST /api/moderate)', () => {
    /**
     * Validates: Requirements 3.2
     *
     * For any string NOT in the valid planet_id set, submitting it as planet_id
     * to POST /api/moderate SHALL return HTTP 400.
     */
    it('property: any string not in valid planet_id set is rejected with 400', async () => {
      const mockSupabase = createMockSupabase()
      getSupabase.mockReturnValue(mockSupabase)

      const { moderationRouter } = await import('./moderation.js')
      const handler = findRouteHandler(moderationRouter, 'post', '/')

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !VALID_PLANET_IDS.includes(s)),
          async (invalidPlanetId) => {
            vi.clearAllMocks()
            getSupabase.mockReturnValue(mockSupabase)

            const req = createMockReq({
              method: 'POST',
              body: {
                text: 'Hello world',
                planet_id: invalidPlanetId,
                session_id: 'test-session-123',
              },
            })
            const res = createMockRes()

            await handler(req, res)

            expect(res.statusCode).toBe(400)
            expect(res._json.error).toContain('Invalid planet_id')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Sub-property 15b: Invalid emoji → 400 ─────────────────────────────────
  describe('Sub-property 15b: Invalid emoji rejection (POST /api/reactions)', () => {
    /**
     * Validates: Requirements 3.3
     *
     * For any string NOT in the allowed emoji set, submitting it as emoji
     * to POST /api/reactions SHALL return HTTP 400.
     */
    it('property: any string not in allowed emoji set is rejected with 400', async () => {
      const mockSupabase = createMockSupabase()
      getSupabase.mockReturnValue(mockSupabase)

      const { reactionsRouter } = await import('./reactions.js')
      const handler = findRouteHandler(reactionsRouter, 'post', '/')

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !VALID_EMOJIS.includes(s)),
          async (invalidEmoji) => {
            vi.clearAllMocks()
            getSupabase.mockReturnValue(mockSupabase)

            const req = createMockReq({
              method: 'POST',
              body: {
                post_id: '123e4567-e89b-12d3-a456-426614174000',
                session_id: '123e4567-e89b-12d3-a456-426614174001',
                emoji: invalidEmoji,
              },
            })
            const res = createMockRes()

            await handler(req, res)

            expect(res.statusCode).toBe(400)
            expect(res._json.error).toBe('Only approved emoji reactions are allowed.')
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── Sub-property 15c: Invalid reason → 400 ────────────────────────────────
  describe('Sub-property 15c: Invalid report reason rejection (POST /api/reports)', () => {
    /**
     * Validates: Requirements 3.4
     *
     * For any string NOT in the valid reasons set, submitting it as reason
     * to POST /api/reports SHALL return HTTP 400.
     */
    it('property: any string not in valid reasons set is rejected with 400', async () => {
      const mockSupabase = createMockSupabase()
      getSupabase.mockReturnValue(mockSupabase)

      const { reportsRouter } = await import('./reports.js')
      const handler = findRouteHandler(reportsRouter, 'post', '/')

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !VALID_REASONS.includes(s)),
          async (invalidReason) => {
            vi.clearAllMocks()
            getSupabase.mockReturnValue(mockSupabase)

            const req = createMockReq({
              method: 'POST',
              body: {
                post_id: '123e4567-e89b-12d3-a456-426614174000',
                session_id: '123e4567-e89b-12d3-a456-426614174001',
                reason: invalidReason,
              },
            })
            const res = createMockRes()

            await handler(req, res)

            expect(res.statusCode).toBe(400)
            expect(res._json.error).toBe('Invalid report reason.')
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
