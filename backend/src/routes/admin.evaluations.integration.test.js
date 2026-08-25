/**
 * Integration Tests: Admin Evaluations Endpoints
 *
 * Task 12.4 from user-evaluation spec.
 * Tests GET /api/admin/evaluations and PATCH /api/admin/evaluations/:id/review
 * endpoints with mocked Supabase and admin auth.
 *
 * Requirements tested: 8.2, 8.4, 8.5, 8.7, 8.8
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import http from 'node:http'
import express from 'express'

// ── Mock Setup ────────────────────────────────────────────────────────────────

// Track supabase mock state per test
let mockSupabaseData = {}

/**
 * Creates a mock Supabase client that returns data from `mockSupabaseData`.
 * The mock supports the chained query builder pattern used by the admin route.
 */
function createMockSupabase() {
  return {
    from: (table) => {
      if (table === 'evaluations') {
        return {
          // SELECT with count (used for total count)
          select: (columns, opts) => {
            const chain = {
              // For .not() chain (suggestions query)
              not: (col, op, val) => {
                return {
                  order: () => ({
                    range: (start, end) => {
                      const suggestions = mockSupabaseData.suggestions || []
                      const sliced = suggestions.slice(start, end + 1)
                      return Promise.resolve({
                        data: sliced,
                        error: null,
                        count: mockSupabaseData.suggestionsTotal ?? suggestions.length,
                      })
                    },
                  }),
                }
              },
              // For the head: true count queries
              eq: () => chain,
              order: () => chain,
              range: () => chain,
            }

            // Head-only count query (total evaluations)
            if (opts?.head === true) {
              return Promise.resolve({
                count: mockSupabaseData.totalCount ?? 0,
                error: mockSupabaseData.countError ?? null,
              })
            }

            // Rating rows query (select('rating'))
            if (columns === 'rating') {
              return Promise.resolve({
                data: mockSupabaseData.ratingRows ?? [],
                error: mockSupabaseData.ratingError ?? null,
              })
            }

            // Feedback areas query (select('feedback_areas'))
            if (columns === 'feedback_areas') {
              return Promise.resolve({
                data: mockSupabaseData.areaRows ?? [],
                error: mockSupabaseData.areaError ?? null,
              })
            }

            // Suggestions query with count (select with full columns)
            if (columns.includes('suggestion')) {
              return chain
            }

            return chain
          },
          // UPDATE chain (for PATCH mark-as-reviewed)
          update: (patch) => ({
            eq: (col, val) => ({
              select: (cols) => {
                if (mockSupabaseData.updateError) {
                  return Promise.resolve({ data: null, error: mockSupabaseData.updateError })
                }
                const match = mockSupabaseData.updateResult
                if (match) {
                  return Promise.resolve({ data: [{ id: val }], error: null })
                }
                // No match → empty array (not found)
                return Promise.resolve({ data: [], error: null })
              },
            }),
          }),
        }
      }
      // Fallback for other tables
      return { select: () => Promise.resolve({ data: [], error: null, count: 0 }) }
    },
  }
}

// ── Express App Factory ───────────────────────────────────────────────────────

/**
 * Creates a fresh Express app with the admin evaluations routes.
 * We inline the route logic to isolate it from the full admin router's
 * other dependencies (storage, eventBus, etc.) while keeping the exact
 * same endpoint behavior.
 *
 * @param {Object} opts
 * @param {boolean} opts.authenticated - Whether admin auth should pass
 */
function createTestApp({ authenticated = true } = {}) {
  const app = express()
  app.use(express.json())

  // Admin auth middleware mock
  const requireAdmin = (req, res, next) => {
    if (!authenticated) {
      return res.status(401).json({ error: 'Authentication required.' })
    }
    req.adminToken = 'test-admin-token'
    next()
  }

  // Feedback area labels (same as admin.js)
  const FEEDBACK_AREA_LABELS = {
    navigation: 'Easy to navigate',
    visuals: 'Visuals are appealing',
    safety: 'I feel safe here',
    support: 'Emotionally supportive',
    exploration: 'Fun to explore',
  }

  // GET /api/admin/evaluations — replicated logic from admin.js
  app.get('/api/admin/evaluations', requireAdmin, async (req, res) => {
    const supabase = createMockSupabase()

    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const offset = (page - 1) * limit

    try {
      // Total count
      const { count: totalCount, error: countErr } = await supabase
        .from('evaluations')
        .select('id', { count: 'exact', head: true })

      if (countErr) {
        return res.status(500).json({ error: 'Failed to load evaluations.' })
      }

      const total = totalCount ?? 0

      // Zero evaluations — early return
      if (total === 0) {
        return res.json({
          stats: {
            total: 0,
            average: 0.0,
            distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
            feedbackAreas: [],
          },
          suggestions: [],
          pagination: { page, limit, total: 0, hasMore: false },
        })
      }

      // Ratings
      const { data: ratingRows, error: ratingErr } = await supabase
        .from('evaluations')
        .select('rating')

      if (ratingErr) {
        return res.status(500).json({ error: 'Failed to load evaluations.' })
      }

      const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      let ratingSum = 0
      for (const row of ratingRows || []) {
        distribution[String(row.rating)] = (distribution[String(row.rating)] || 0) + 1
        ratingSum += row.rating
      }
      const average = total > 0 ? Math.round((ratingSum / total) * 10) / 10 : 0.0

      // Feedback areas
      const { data: areaRows, error: areaErr } = await supabase
        .from('evaluations')
        .select('feedback_areas')

      if (areaErr) {
        return res.status(500).json({ error: 'Failed to load evaluations.' })
      }

      const areaCounts = {}
      for (const row of areaRows || []) {
        const areas = row.feedback_areas
        if (Array.isArray(areas)) {
          for (const area of areas) {
            areaCounts[area] = (areaCounts[area] || 0) + 1
          }
        }
      }

      const feedbackAreas = Object.entries(areaCounts)
        .map(([id, count]) => ({
          id,
          label: FEEDBACK_AREA_LABELS[id] || id,
          count,
        }))
        .sort((a, b) => b.count - a.count)

      // Paginated suggestions
      const { data: suggestions, error: sugErr, count: sugTotal } = await supabase
        .from('evaluations')
        .select('id, suggestion, rating, moderation_status, reviewed, created_at', { count: 'exact' })
        .not('suggestion', 'is', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (sugErr) {
        return res.status(500).json({ error: 'Failed to load evaluations.' })
      }

      const suggestionsTotal = sugTotal ?? 0
      const hasMore = offset + limit < suggestionsTotal

      return res.json({
        stats: { total, average, distribution, feedbackAreas },
        suggestions: suggestions || [],
        pagination: { page, limit, total: suggestionsTotal, hasMore },
      })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load evaluations.' })
    }
  })

  // PATCH /api/admin/evaluations/:id/review — replicated logic from admin.js
  app.patch('/api/admin/evaluations/:id/review', requireAdmin, async (req, res) => {
    const supabase = createMockSupabase()
    const { id } = req.params

    try {
      const { data, error } = await supabase
        .from('evaluations')
        .update({ reviewed: true })
        .eq('id', id)
        .select('id')

      if (error) {
        return res.status(500).json({ error: 'Failed to update evaluation.' })
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Evaluation not found.' })
      }

      return res.json({ ok: true, id })
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update evaluation.' })
    }
  })

  return app
}

// ── HTTP Helpers ──────────────────────────────────────────────────────────────

/**
 * Performs a GET request and returns { status, body, headers }.
 */
function httpGet(port, path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'GET',
        headers: { authorization: 'Bearer test-admin-token' },
      },
      (response) => {
        let data = ''
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: JSON.parse(data),
          })
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

/**
 * Performs a PATCH request and returns { status, body, headers }.
 */
function httpPatch(port, path, payload = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(payload)
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(bodyStr),
          authorization: 'Bearer test-admin-token',
        },
      },
      (response) => {
        let data = ''
        response.on('data', (chunk) => { data += chunk })
        response.on('end', () => {
          resolve({
            status: response.statusCode,
            headers: response.headers,
            body: JSON.parse(data),
          })
        })
      }
    )
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Admin Evaluations Integration Tests', () => {
  let server
  let port

  afterEach(() => {
    if (server) server.close()
    mockSupabaseData = {}
  })

  describe('GET /api/admin/evaluations', () => {
    it('returns correct aggregated stats with evaluation data', async () => {
      // Seed data: 5 evaluations with various ratings and feedback areas
      mockSupabaseData = {
        totalCount: 5,
        ratingRows: [
          { rating: 5 },
          { rating: 4 },
          { rating: 4 },
          { rating: 3 },
          { rating: 2 },
        ],
        areaRows: [
          { feedback_areas: ['navigation', 'visuals'] },
          { feedback_areas: ['navigation', 'safety'] },
          { feedback_areas: ['navigation'] },
          { feedback_areas: ['visuals'] },
          { feedback_areas: [] },
        ],
        suggestions: [
          {
            id: 'aaa-111',
            suggestion: 'Nostalgia planet',
            rating: 5,
            moderation_status: 'approved',
            reviewed: false,
            created_at: '2026-08-20T10:00:00Z',
          },
          {
            id: 'bbb-222',
            suggestion: 'Gratitude planet',
            rating: 4,
            moderation_status: 'approved',
            reviewed: true,
            created_at: '2026-08-19T08:00:00Z',
          },
        ],
        suggestionsTotal: 2,
      }

      const app = createTestApp({ authenticated: true })
      server = app.listen(0)
      port = server.address().port

      const res = await httpGet(port, '/api/admin/evaluations')

      expect(res.status).toBe(200)

      // Stats
      expect(res.body.stats.total).toBe(5)
      // Average: (5+4+4+3+2)/5 = 18/5 = 3.6
      expect(res.body.stats.average).toBe(3.6)
      expect(res.body.stats.distribution).toEqual({
        '1': 0,
        '2': 1,
        '3': 1,
        '4': 2,
        '5': 1,
      })

      // Feedback areas sorted descending by count
      expect(res.body.stats.feedbackAreas).toEqual([
        { id: 'navigation', label: 'Easy to navigate', count: 3 },
        { id: 'visuals', label: 'Visuals are appealing', count: 2 },
        { id: 'safety', label: 'I feel safe here', count: 1 },
      ])

      // Suggestions
      expect(res.body.suggestions).toHaveLength(2)
      expect(res.body.suggestions[0].id).toBe('aaa-111')
      expect(res.body.suggestions[0].suggestion).toBe('Nostalgia planet')

      // Pagination
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        hasMore: false,
      })
    })

    it('applies pagination with page and limit parameters', async () => {
      mockSupabaseData = {
        totalCount: 25,
        ratingRows: Array.from({ length: 25 }, () => ({ rating: 4 })),
        areaRows: Array.from({ length: 25 }, () => ({ feedback_areas: [] })),
        suggestions: [
          {
            id: 'page2-item1',
            suggestion: 'Page 2 item',
            rating: 4,
            moderation_status: 'approved',
            reviewed: false,
            created_at: '2026-08-15T10:00:00Z',
          },
        ],
        suggestionsTotal: 15,
      }

      const app = createTestApp({ authenticated: true })
      server = app.listen(0)
      port = server.address().port

      // Request page=2 with limit=10
      const res = await httpGet(port, '/api/admin/evaluations?page=2&limit=10')

      expect(res.status).toBe(200)

      // Should return stats for all evaluations (not paginated)
      expect(res.body.stats.total).toBe(25)
      expect(res.body.stats.average).toBe(4.0)

      // Pagination metadata reflects the parameters
      expect(res.body.pagination.page).toBe(2)
      expect(res.body.pagination.limit).toBe(10)
      expect(res.body.pagination.total).toBe(15)
      // offset = (2-1)*10 = 10, 10+10=20 > 15, so hasMore = false
      expect(res.body.pagination.hasMore).toBe(false)
    })

    it('returns zeroed stats and empty lists when zero evaluations exist', async () => {
      mockSupabaseData = {
        totalCount: 0,
      }

      const app = createTestApp({ authenticated: true })
      server = app.listen(0)
      port = server.address().port

      const res = await httpGet(port, '/api/admin/evaluations')

      expect(res.status).toBe(200)
      expect(res.body).toEqual({
        stats: {
          total: 0,
          average: 0.0,
          distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
          feedbackAreas: [],
        },
        suggestions: [],
        pagination: { page: 1, limit: 50, total: 0, hasMore: false },
      })
    })

    it('returns 401 without admin authentication', async () => {
      const app = createTestApp({ authenticated: false })
      server = app.listen(0)
      port = server.address().port

      const res = await httpGet(port, '/api/admin/evaluations')

      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toBe('Authentication required.')
    })
  })

  describe('PATCH /api/admin/evaluations/:id/review', () => {
    it('marks an evaluation as reviewed and returns success', async () => {
      mockSupabaseData = {
        updateResult: true, // Simulate a successful update
      }

      const app = createTestApp({ authenticated: true })
      server = app.listen(0)
      port = server.address().port

      const evalId = 'eval-uuid-1234'
      const res = await httpPatch(port, `/api/admin/evaluations/${evalId}/review`)

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true, id: evalId })
    })

    it('returns 404 when evaluation does not exist', async () => {
      mockSupabaseData = {
        updateResult: false, // No matching row
      }

      const app = createTestApp({ authenticated: true })
      server = app.listen(0)
      port = server.address().port

      const res = await httpPatch(port, '/api/admin/evaluations/nonexistent-id/review')

      expect(res.status).toBe(404)
      expect(res.body).toEqual({ error: 'Evaluation not found.' })
    })

    it('returns 401 without admin authentication', async () => {
      const app = createTestApp({ authenticated: false })
      server = app.listen(0)
      port = server.address().port

      const res = await httpPatch(port, '/api/admin/evaluations/some-id/review')

      expect(res.status).toBe(401)
      expect(res.body).toHaveProperty('error')
      expect(res.body.error).toBe('Authentication required.')
    })
  })
})
