/**
 * Property-Based Test: Author ID Never Exposed in Responses
 *
 * Feature: user-evaluation, Property 9: Author ID Never Exposed in Responses
 *
 * **Validates: Requirements 7.2**
 *
 * Property 9: For any valid evaluation submission that results in a 201 response,
 * the response body must NOT contain `author_id` or any other user-identifying metadata.
 * This ensures the evaluation system maintains anonymity in all client-facing responses.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import express from 'express'
import { createMockRes } from '../../tests/helpers.js'

// ── Mock Supabase ─────────────────────────────────────────────────────────────
// Mock the supabase module to return a fake client for DB inserts.
const mockInsertResult = {
  data: { id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', created_at: '2026-01-01T00:00:00Z' },
  error: null,
}

vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve(mockInsertResult),
        }),
      }),
    }),
  }),
}))

// ── Mock Moderation Engine ────────────────────────────────────────────────────
// Always return safe verdict so submissions succeed.
vi.mock('../moderation/engine.js', () => ({
  moderate: vi.fn(() => Promise.resolve({ verdict: 'safe' })),
}))

// ── Mock requireAuth ──────────────────────────────────────────────────────────
// Let all requests through as authenticated with a fixed userId.
vi.mock('../middleware/requireAuth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.isAuthenticated = true
    req.userId = 'test-user-00000000-0000-0000-0000-000000000001'
    next()
  },
}))

// ── Mock express-rate-limit ───────────────────────────────────────────────────
// Bypass rate limiting entirely so every request passes through.
vi.mock('express-rate-limit', () => ({
  default: () => (_req, _res, next) => next(),
}))

describe('Property 9: Author ID Never Exposed in Responses', () => {
  let app

  beforeEach(async () => {
    // Dynamically import the router after mocks are in place
    const { evaluationsRouter } = await import('./evaluations.js')
    app = express()
    app.use(express.json())
    app.use('/api/evaluations', evaluationsRouter)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('201 response body never contains author_id for any valid payload', async () => {
    /**
     * Feature: user-evaluation, Property 9: Author ID Never Exposed in Responses
     * **Validates: Requirements 7.2**
     *
     * For any valid evaluation payload (rating 1–5, optional valid suggestion,
     * optional valid feedback_areas), the 201 response body must not have
     * the key `author_id`.
     */
    const VALID_AREAS = ['navigation', 'visuals', 'safety', 'support', 'exploration']

    // Generator for valid suggestion strings (3–140 chars, non-whitespace-only)
    const validSuggestionArb = fc.string({ minLength: 3, maxLength: 140 })
      .filter(s => s.trim().length >= 3)

    // Generator for valid feedback_areas (subset of known areas)
    const validFeedbackAreasArb = fc.shuffledSubarray(VALID_AREAS)

    // Generator for valid evaluation payloads
    const validPayloadArb = fc.record({
      rating: fc.integer({ min: 1, max: 5 }),
      suggestion: fc.option(validSuggestionArb, { nil: undefined }),
      feedback_areas: fc.option(validFeedbackAreasArb, { nil: undefined }),
    })

    // Use a manual HTTP request approach since we have a real Express app
    const { default: request } = await import('supertest').catch(() => ({ default: null }))

    if (request) {
      // If supertest is available, use it
      await fc.assert(
        fc.asyncProperty(validPayloadArb, async (payload) => {
          const body = { rating: payload.rating }
          if (payload.suggestion !== undefined) body.suggestion = payload.suggestion
          if (payload.feedback_areas !== undefined) body.feedback_areas = payload.feedback_areas

          const res = await request(app)
            .post('/api/evaluations')
            .send(body)

          expect(res.status).toBe(201)
          expect(res.body).not.toHaveProperty('author_id')
          // Also ensure no other identifying fields leak
          expect(res.body).not.toHaveProperty('userId')
          expect(res.body).not.toHaveProperty('user_id')
          expect(res.body).not.toHaveProperty('session_id')
        }),
        { numRuns: 100 }
      )
    } else {
      // Fallback: invoke handler directly via req/res mocks
      const { evaluationsRouter } = await import('./evaluations.js')

      // Extract the POST handler (second middleware in the stack is the async handler)
      // We'll simulate the full middleware chain using the Express app approach with raw http
      const http = await import('http')
      const server = app.listen(0)
      const port = server.address().port

      try {
        await fc.assert(
          fc.asyncProperty(validPayloadArb, async (payload) => {
            const body = { rating: payload.rating }
            if (payload.suggestion !== undefined) body.suggestion = payload.suggestion
            if (payload.feedback_areas !== undefined) body.feedback_areas = payload.feedback_areas

            const bodyStr = JSON.stringify(body)
            const res = await new Promise((resolve, reject) => {
              const req = http.request(
                { hostname: '127.0.0.1', port, path: '/api/evaluations', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(bodyStr) } },
                (response) => {
                  let data = ''
                  response.on('data', chunk => { data += chunk })
                  response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(data) }))
                }
              )
              req.on('error', reject)
              req.write(bodyStr)
              req.end()
            })

            expect(res.status).toBe(201)
            expect(res.body).not.toHaveProperty('author_id')
            expect(res.body).not.toHaveProperty('userId')
            expect(res.body).not.toHaveProperty('user_id')
            expect(res.body).not.toHaveProperty('session_id')
          }),
          { numRuns: 100 }
        )
      } finally {
        server.close()
      }
    }
  })

  it('response only contains expected fields: id, created_at, moderation_status', async () => {
    /**
     * Feature: user-evaluation, Property 9: Author ID Never Exposed in Responses
     * **Validates: Requirements 7.2**
     *
     * For any valid submission, the response body contains ONLY the
     * whitelisted keys: id, created_at, moderation_status.
     */
    const VALID_AREAS = ['navigation', 'visuals', 'safety', 'support', 'exploration']
    const ALLOWED_KEYS = ['id', 'created_at', 'moderation_status']

    const validSuggestionArb = fc.string({ minLength: 3, maxLength: 140 })
      .filter(s => s.trim().length >= 3)

    const validFeedbackAreasArb = fc.shuffledSubarray(VALID_AREAS)

    const validPayloadArb = fc.record({
      rating: fc.integer({ min: 1, max: 5 }),
      suggestion: fc.option(validSuggestionArb, { nil: undefined }),
      feedback_areas: fc.option(validFeedbackAreasArb, { nil: undefined }),
    })

    const http = await import('http')
    const server = app.listen(0)
    const port = server.address().port

    try {
      await fc.assert(
        fc.asyncProperty(validPayloadArb, async (payload) => {
          const body = { rating: payload.rating }
          if (payload.suggestion !== undefined) body.suggestion = payload.suggestion
          if (payload.feedback_areas !== undefined) body.feedback_areas = payload.feedback_areas

          const bodyStr = JSON.stringify(body)
          const res = await new Promise((resolve, reject) => {
            const req = http.request(
              { hostname: '127.0.0.1', port, path: '/api/evaluations', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(bodyStr) } },
              (response) => {
                let data = ''
                response.on('data', chunk => { data += chunk })
                response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(data) }))
              }
            )
            req.on('error', reject)
            req.write(bodyStr)
            req.end()
          })

          expect(res.status).toBe(201)
          const responseKeys = Object.keys(res.body)
          // Every key in the response must be in the allowed list
          for (const key of responseKeys) {
            expect(ALLOWED_KEYS).toContain(key)
          }
          // author_id specifically must never appear
          expect(res.body).not.toHaveProperty('author_id')
        }),
        { numRuns: 100 }
      )
    } finally {
      server.close()
    }
  })
})
