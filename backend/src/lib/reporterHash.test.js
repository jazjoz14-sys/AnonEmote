/**
 * Report Deduplication and Privacy Tests
 *
 * **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 11.6**
 *
 * Tests the reporterHash module (HMAC-SHA256 network dedup), report duplicate
 * handling, self_harm referral, weight assignment, and schema fallback behavior.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMockReq, createMockRes, createMockSupabase } from '../../../tests/helpers.js'

// ── reporterHash unit tests ──────────────────────────────────────────────────

describe('reporterHash — determinism and privacy', () => {
  let reporterHash, getClientIp

  beforeEach(async () => {
    vi.resetModules()
    // Set a valid secret (>=16 chars)
    process.env.REPORT_HASH_SECRET = 'test-secret-key-long-enough-1234'
    delete process.env.SUPABASE_SERVICE_KEY

    const mod = await import('./reporterHash.js')
    reporterHash = mod.reporterHash
    getClientIp = mod.getClientIp
  })

  afterEach(() => {
    delete process.env.REPORT_HASH_SECRET
    delete process.env.SUPABASE_SERVICE_KEY
    vi.restoreAllMocks()
  })

  it('same IP + same post_id → produces same hash (deterministic)', () => {
    /**
     * **Validates: Requirements 11.3**
     *
     * The hash function must be deterministic — the same inputs always
     * produce the same output.
     */
    const req = createMockReq({ ip: '192.168.1.100' })
    const postId = 'post-abc-123'

    const hash1 = reporterHash(req, postId)
    const hash2 = reporterHash(req, postId)

    expect(hash1).toBe(hash2)
    expect(hash1).toBeTypeOf('string')
    expect(hash1.length).toBe(64) // SHA-256 hex is 64 chars
  })

  it('same IP + different post_id → different hashes', () => {
    /**
     * **Validates: Requirements 11.3**
     *
     * The same network must produce different hashes for different posts,
     * preventing cross-post correlation of reports.
     */
    const req = createMockReq({ ip: '192.168.1.100' })

    const hash1 = reporterHash(req, 'post-aaa')
    const hash2 = reporterHash(req, 'post-bbb')

    expect(hash1).not.toBe(hash2)
    expect(hash1).toBeTypeOf('string')
    expect(hash2).toBeTypeOf('string')
  })

  it('no secret configured → returns null (dedup disabled)', async () => {
    /**
     * **Validates: Requirements 11.6**
     *
     * When REPORT_HASH_SECRET is not set and no fallback (SUPABASE_SERVICE_KEY)
     * is available, the function should return null to disable network dedup.
     */
    vi.resetModules()
    delete process.env.REPORT_HASH_SECRET
    delete process.env.SUPABASE_SERVICE_KEY

    const mod = await import('./reporterHash.js')
    const req = createMockReq({ ip: '10.0.0.1' })

    const result = mod.reporterHash(req, 'post-xyz')
    expect(result).toBeNull()
  })

  it('secret too short (< 16 chars) and no fallback → returns null', async () => {
    /**
     * **Validates: Requirements 11.6**
     *
     * A weak secret (fewer than 16 characters) without a fallback disables
     * network-level deduplication.
     */
    vi.resetModules()
    process.env.REPORT_HASH_SECRET = 'short'
    delete process.env.SUPABASE_SERVICE_KEY

    const mod = await import('./reporterHash.js')
    const req = createMockReq({ ip: '10.0.0.1' })

    const result = mod.reporterHash(req, 'post-xyz')
    expect(result).toBeNull()
  })

  it('missing/unknown IP → returns null', () => {
    /**
     * **Validates: Requirements 11.6**
     *
     * If the IP cannot be determined (unknown or missing), the function
     * should return null to gracefully degrade.
     */
    const req = {
      headers: {},
      ip: undefined,
      socket: { remoteAddress: undefined },
    }

    const result = reporterHash(req, 'post-123')
    expect(result).toBeNull()
  })

  it('IP = "unknown" → returns null', () => {
    /**
     * **Validates: Requirements 11.6**
     */
    const req = {
      headers: {},
      ip: 'unknown',
      socket: { remoteAddress: 'unknown' },
    }

    const result = reporterHash(req, 'post-456')
    expect(result).toBeNull()
  })

  it('falls back to SUPABASE_SERVICE_KEY when hash secret is missing', async () => {
    /**
     * **Validates: Requirements 11.3, 11.6**
     *
     * If REPORT_HASH_SECRET is not set but SUPABASE_SERVICE_KEY is available,
     * the module should use the service key as a fallback secret.
     */
    vi.resetModules()
    delete process.env.REPORT_HASH_SECRET
    process.env.SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.service-key-placeholder'

    const mod = await import('./reporterHash.js')
    const req = createMockReq({ ip: '10.0.0.5' })

    const result = mod.reporterHash(req, 'post-fallback')
    expect(result).toBeTypeOf('string')
    expect(result.length).toBe(64)

    delete process.env.SUPABASE_SERVICE_KEY
  })

  it('uses x-forwarded-for header when present', () => {
    /**
     * **Validates: Requirements 11.3**
     *
     * Behind a reverse proxy, the real IP comes from x-forwarded-for.
     */
    const req = createMockReq({
      ip: '127.0.0.1',
      headers: { 'x-forwarded-for': '203.0.113.50, 10.0.0.1' },
    })

    const hash = reporterHash(req, 'post-proxy')
    expect(hash).toBeTypeOf('string')
    expect(hash.length).toBe(64)

    // Should use the leftmost (original client) IP
    const reqDirect = createMockReq({ ip: '203.0.113.50' })
    const hashDirect = reporterHash(reqDirect, 'post-proxy')
    expect(hash).toBe(hashDirect)
  })
})

// ── Reports route behavior tests (dedup, referral, weight, schema) ───────────

describe('Reports route — duplicate handling and privacy', () => {
  let reportsRouter

  beforeEach(async () => {
    vi.resetModules()
    process.env.REPORT_HASH_SECRET = 'test-secret-key-long-enough-1234'
  })

  afterEach(() => {
    delete process.env.REPORT_HASH_SECRET
    vi.restoreAllMocks()
  })

  it('report duplicate (23505) → returns 200 with alreadyReported: true, no reporter identifiers leaked', async () => {
    /**
     * **Validates: Requirements 11.1**
     *
     * When a duplicate constraint violation occurs (code 23505), the route
     * returns 200 with alreadyReported: true and does NOT leak any reporter
     * identifying information (no counts, no timestamps, no hashes).
     */
    vi.resetModules()
    process.env.REPORT_HASH_SECRET = 'test-secret-key-long-enough-1234'

    // Mock supabase to return a 23505 unique violation
    const mockSupabase = createMockSupabase({
      insertResult: { data: null, error: { code: '23505', message: 'duplicate key value' } },
    })

    vi.doMock('../lib/supabase.js', () => ({
      getSupabase: () => mockSupabase,
    }))
    vi.doMock('../lib/storage.js', () => ({
      appendAudit: vi.fn(),
    }))

    const { reportsRouter } = await import('../routes/reports.js')

    const req = createMockReq({
      ip: '192.168.1.1',
      body: {
        post_id: 'post-dup-test',
        session_id: 'session-123',
        reason: 'spam',
      },
    })
    const res = createMockRes()

    // Simulate express route handler
    const handler = getRouteHandler(reportsRouter, 'post', '/')
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.ok).toBe(true)
    expect(res._json.alreadyReported).toBe(true)

    // Privacy: no reporter identifiers should be in the response
    const responseStr = JSON.stringify(res._json)
    expect(responseStr).not.toContain('reporter_hash')
    expect(responseStr).not.toContain('reporter_count')
    expect(responseStr).not.toContain('timestamp')
    expect(responseStr).not.toContain('192.168')
    expect(responseStr).not.toContain('session-123')
  })

  it('self_harm report → includes referral object with hotlines array', async () => {
    /**
     * **Validates: Requirements 11.2**
     *
     * When a report is filed with reason 'self_harm', the response should
     * include a referral object with a message and hotlines array.
     */
    vi.resetModules()
    process.env.REPORT_HASH_SECRET = 'test-secret-key-long-enough-1234'

    const mockSupabase = createMockSupabase({
      insertResult: { data: null, error: null },
    })

    vi.doMock('../lib/supabase.js', () => ({
      getSupabase: () => mockSupabase,
    }))
    vi.doMock('../lib/storage.js', () => ({
      appendAudit: vi.fn(),
    }))

    const { reportsRouter } = await import('../routes/reports.js')

    const req = createMockReq({
      ip: '10.0.0.5',
      body: {
        post_id: 'post-selfharm',
        session_id: 'session-456',
        reason: 'self_harm',
      },
    })
    const res = createMockRes()

    const handler = getRouteHandler(reportsRouter, 'post', '/')
    await handler(req, res)

    expect(res.statusCode).toBe(200)
    expect(res._json.ok).toBe(true)
    expect(res._json.referral).toBeDefined()
    expect(res._json.referral.message).toBeTypeOf('string')
    expect(res._json.referral.message.length).toBeGreaterThan(0)
    expect(Array.isArray(res._json.referral.hotlines)).toBe(true)
    expect(res._json.referral.hotlines.length).toBeGreaterThanOrEqual(1)

    // Each hotline should have name and number
    for (const hotline of res._json.referral.hotlines) {
      expect(hotline.name).toBeTypeOf('string')
      expect(hotline.number).toBeTypeOf('string')
    }
  })

  it('report weight assignment (hate_speech:3, self_harm:3, harassment:2, spam:1, other:1)', async () => {
    /**
     * **Validates: Requirements 11.5**
     *
     * Each report reason should be assigned the correct weight when inserted.
     */
    vi.resetModules()
    process.env.REPORT_HASH_SECRET = 'test-secret-key-long-enough-1234'

    const insertedData = []
    const mockFrom = vi.fn(() => ({
      insert: vi.fn((data) => {
        insertedData.push(data)
        return { data: null, error: null }
      }),
    }))
    const mockSupabase = { from: mockFrom }

    vi.doMock('../lib/supabase.js', () => ({
      getSupabase: () => mockSupabase,
    }))
    vi.doMock('../lib/storage.js', () => ({
      appendAudit: vi.fn(),
    }))

    const { reportsRouter } = await import('../routes/reports.js')
    const handler = getRouteHandler(reportsRouter, 'post', '/')

    const expectedWeights = {
      hate_speech: 3,
      self_harm: 3,
      harassment: 2,
      spam: 1,
      other: 1,
    }

    for (const [reason, expectedWeight] of Object.entries(expectedWeights)) {
      insertedData.length = 0

      const req = createMockReq({
        ip: '10.0.0.1',
        body: {
          post_id: `post-weight-${reason}`,
          session_id: 'session-w',
          reason,
        },
      })
      const res = createMockRes()
      await handler(req, res)

      expect(res.statusCode).toBe(200)
      expect(insertedData.length).toBeGreaterThanOrEqual(1)
      expect(insertedData[0].weight).toBe(expectedWeight)
    }
  })

  it('schema missing (reporter_hash column) → retry without, returns 200', async () => {
    /**
     * **Validates: Requirements 11.4**
     *
     * When the DB doesn't have the new columns (reporter_hash, weight),
     * the route should retry with a legacy insert and still return 200.
     */
    vi.resetModules()
    process.env.REPORT_HASH_SECRET = 'test-secret-key-long-enough-1234'

    let insertCallCount = 0
    const mockFrom = vi.fn(() => ({
      insert: vi.fn((data) => {
        insertCallCount++
        if (insertCallCount === 1) {
          // First attempt fails — column doesn't exist
          return {
            data: null,
            error: { code: '42703', message: 'column "reporter_hash" does not exist' },
          }
        }
        // Second attempt (legacy insert) succeeds
        return { data: null, error: null }
      }),
    }))
    const mockSupabase = { from: mockFrom }

    vi.doMock('../lib/supabase.js', () => ({
      getSupabase: () => mockSupabase,
    }))
    vi.doMock('../lib/storage.js', () => ({
      appendAudit: vi.fn(),
    }))

    const { reportsRouter } = await import('../routes/reports.js')
    const handler = getRouteHandler(reportsRouter, 'post', '/')

    const req = createMockReq({
      ip: '172.16.0.1',
      body: {
        post_id: 'post-schema-test',
        session_id: 'session-schema',
        reason: 'harassment',
      },
    })
    const res = createMockRes()
    await handler(req, res)

    // Should have retried (2 insert calls)
    expect(insertCallCount).toBe(2)
    expect(res.statusCode).toBe(200)
    expect(res._json.ok).toBe(true)
  })
})

// ── Helper: extract route handler from Express Router ────────────────────────

/**
 * Extract the actual route handler from an Express router.
 * Express stores route handlers in router.stack as Layer objects.
 */
function getRouteHandler(router, method, path) {
  // Express router stores routes in .stack
  const stack = router.stack || []
  for (const layer of stack) {
    if (layer.route && layer.route.path === path) {
      const handlers = layer.route.stack
        .filter((l) => l.method === method)
        .map((l) => l.handle)
      if (handlers.length > 0) {
        // Return the last handler (skip middleware like rate limiter)
        return handlers[handlers.length - 1]
      }
    }
  }
  throw new Error(`No ${method.toUpperCase()} handler found for path: ${path}`)
}
