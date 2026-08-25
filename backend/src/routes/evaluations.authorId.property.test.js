/**
 * Property-Based Test: Author ID Derived from Server Token
 *
 * Feature: user-evaluation, Property 8: Author ID Derived from Server Token
 *
 * **Validates: Requirements 7.1**
 *
 * Property 8: For any evaluation submission, regardless of what `author_id` value
 * the client includes in the request body, the stored evaluation record's `author_id`
 * field must equal `req.userId` (extracted from the JWT by `verifyAuth` middleware),
 * never a client-supplied value.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { createMockReq, createMockRes } from '../../tests/helpers.js'

// Mock the moderation engine to always approve
vi.mock('../moderation/engine.js', () => ({
  moderate: vi.fn(() => Promise.resolve({ verdict: 'safe' })),
}))

// Mock the supabase client
vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(),
}))

// Mock requireAuth to always pass through (we control req.userId manually)
vi.mock('../middleware/requireAuth.js', () => ({
  requireAuth: (req, res, next) => next(),
}))

// Mock express-rate-limit to pass through
vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}))

import { getSupabase } from '../lib/supabase.js'

describe('Property 8: Author ID Derived from Server Token', () => {
  /** The route handler extracted from the evaluations router */
  let handler

  beforeEach(async () => {
    vi.clearAllMocks()

    // Re-import module to get a fresh router with mocks applied
    const mod = await import('./evaluations.js')
    const router = mod.evaluationsRouter

    // Extract the POST '/' handler from the router stack
    // After mocking, requireAuth is a passthrough and rateLimit is a passthrough
    // The actual handler is the last in the route stack
    const layers = router.stack.filter(l => l.route && l.route.path === '/')
    const postRoute = layers.find(l => l.route.methods.post)
    const routeHandlers = postRoute.route.stack
    handler = routeHandlers[routeHandlers.length - 1].handle
  })

  /**
   * Helper: creates a mock Supabase client that captures the insert payload.
   * Returns an object with the mock client and a getter for the captured payload.
   */
  function createCapturingSupabase() {
    let capturedPayload = null

    const mockChain = {
      select: vi.fn().mockReturnThis(),
      single: vi.fn(() => Promise.resolve({
        data: { id: 'eval-id-123', created_at: '2026-08-20T10:00:00Z' },
        error: null,
      })),
    }

    // Make select return a chain-like object with single on it
    mockChain.select.mockReturnValue(mockChain)

    const mockSupabase = {
      from: vi.fn(() => ({
        insert: vi.fn((payload) => {
          capturedPayload = payload
          return mockChain
        }),
      })),
    }

    return {
      mockSupabase,
      getCapturedPayload: () => capturedPayload,
    }
  }

  it('always uses req.userId for author_id, ignoring any client-supplied author_id', async () => {
    /**
     * Feature: user-evaluation, Property 8: Author ID Derived from Server Token
     * **Validates: Requirements 7.1**
     *
     * For any client-supplied author_id (random UUID), the actual insert payload
     * must use req.userId (the server-derived identity) rather than the
     * client-supplied value.
     */
    const SERVER_USER_ID = '00000000-aaaa-bbbb-cccc-111111111111'

    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (fakeClientAuthorId) => {
          const { mockSupabase, getCapturedPayload } = createCapturingSupabase()
          getSupabase.mockReturnValue(mockSupabase)

          // Build request with client-supplied author_id in body
          const req = createMockReq({
            body: {
              rating: 4,
              suggestion: 'Nostalgia planet',
              feedback_areas: ['navigation'],
              author_id: fakeClientAuthorId, // This should be IGNORED
            },
            method: 'POST',
            userId: SERVER_USER_ID,
            isAuthenticated: true,
          })

          const res = createMockRes()

          await handler(req, res)

          // Verify the route returned 201 (successful insert)
          expect(res.statusCode).toBe(201)

          // The insert payload must use the server-derived userId, not the client value
          const payload = getCapturedPayload()
          expect(payload).not.toBeNull()
          expect(payload.author_id).toBe(SERVER_USER_ID)
          expect(payload.author_id).not.toBe(fakeClientAuthorId)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('author_id in insert payload is always req.userId regardless of body shape', async () => {
    /**
     * Feature: user-evaluation, Property 8: Author ID Derived from Server Token
     * **Validates: Requirements 7.1**
     *
     * Even when both client-supplied and server UUIDs vary across executions,
     * the stored author_id always comes from req.userId.
     */
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          clientAuthorId: fc.uuid(),
          serverUserId: fc.uuid(),
        }),
        async ({ clientAuthorId, serverUserId }) => {
          const { mockSupabase, getCapturedPayload } = createCapturingSupabase()
          getSupabase.mockReturnValue(mockSupabase)

          const req = createMockReq({
            body: {
              rating: 3,
              author_id: clientAuthorId, // Attempt to spoof author
            },
            method: 'POST',
            userId: serverUserId, // The actual identity from JWT
            isAuthenticated: true,
          })

          const res = createMockRes()

          await handler(req, res)

          // Verify success
          expect(res.statusCode).toBe(201)

          // Verify the insert always uses the server-side userId
          const payload = getCapturedPayload()
          expect(payload).not.toBeNull()
          expect(payload.author_id).toBe(serverUserId)
        }
      ),
      { numRuns: 100 }
    )
  })
})
