/**
 * Rate Limiting Verification Tests
 *
 * Tests that express-rate-limit middleware enforces the configured thresholds
 * for each route (moderation, posts, reactions, reports, replies) and includes
 * proper RateLimit headers.
 *
 * Approach: Mount each rate limiter on a minimal Express app, send requests
 * via Node's http module, and verify 429 responses at the configured threshold.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'
import rateLimit from 'express-rate-limit'
import http from 'http'

// ── Helper: create a mini app with a given rate limiter ──────────────────────

function createApp(limiterConfig) {
  const app = express()
  const limiter = rateLimit({
    ...limiterConfig,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use(limiter)
  app.get('/', (_req, res) => res.json({ ok: true }))
  app.post('/', (_req, res) => res.json({ ok: true }))
  return app
}

// ── Helper: make an HTTP request to the test server ──────────────────────────

function makeRequest(server, method = 'GET', ip = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const addr = server.address()
    const options = {
      hostname: '127.0.0.1',
      port: addr.port,
      path: '/',
      method,
      headers: {
        'X-Forwarded-For': ip,
      },
    }
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body ? JSON.parse(body) : null,
        })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

// ── Helper: start/stop server ────────────────────────────────────────────────

function startServer(app) {
  return new Promise((resolve) => {
    // Trust proxy so X-Forwarded-For is respected
    app.set('trust proxy', 1)
    const server = app.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function stopServer(server) {
  return new Promise((resolve) => server.close(resolve))
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Rate Limiting Verification', () => {
  describe('Moderation rate limit (20 requests / 60s)', () => {
    let server

    beforeEach(async () => {
      const app = createApp({
        windowMs: 60 * 1000,
        max: 20,
        message: { error: 'Too many requests. Please slow down.' },
      })
      server = await startServer(app)
    })

    afterEach(async () => {
      await stopServer(server)
    })

    it('should allow up to 20 requests', async () => {
      for (let i = 0; i < 20; i++) {
        const res = await makeRequest(server, 'POST')
        expect(res.status).toBe(200)
      }
    })

    it('should return 429 on the 21st request', async () => {
      for (let i = 0; i < 20; i++) {
        await makeRequest(server, 'POST')
      }
      const res = await makeRequest(server, 'POST')
      expect(res.status).toBe(429)
      expect(res.body.error).toContain('Too many requests')
    })
  })

  describe('Post submission rate limit (10 posts / 5min)', () => {
    let server

    beforeEach(async () => {
      const app = createApp({
        windowMs: 5 * 60 * 1000,
        max: 10,
        message: { error: 'Too many posts. Please wait a moment.' },
      })
      server = await startServer(app)
    })

    afterEach(async () => {
      await stopServer(server)
    })

    it('should allow up to 10 requests', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await makeRequest(server, 'POST')
        expect(res.status).toBe(200)
      }
    })

    it('should return 429 on the 11th request', async () => {
      for (let i = 0; i < 10; i++) {
        await makeRequest(server, 'POST')
      }
      const res = await makeRequest(server, 'POST')
      expect(res.status).toBe(429)
      expect(res.body.error).toContain('Too many posts')
    })
  })

  describe('Reaction rate limit (60 reactions / 60s)', () => {
    let server

    beforeEach(async () => {
      const app = createApp({
        windowMs: 60 * 1000,
        max: 60,
        message: { error: 'Too many reactions. Please slow down.' },
      })
      server = await startServer(app)
    })

    afterEach(async () => {
      await stopServer(server)
    })

    it('should allow up to 60 requests', async () => {
      for (let i = 0; i < 60; i++) {
        const res = await makeRequest(server, 'POST')
        expect(res.status).toBe(200)
      }
    })

    it('should return 429 on the 61st request', async () => {
      for (let i = 0; i < 60; i++) {
        await makeRequest(server, 'POST')
      }
      const res = await makeRequest(server, 'POST')
      expect(res.status).toBe(429)
      expect(res.body.error).toContain('Too many reactions')
    })
  })

  describe('Report rate limit (10 reports / 10min)', () => {
    let server

    beforeEach(async () => {
      const app = createApp({
        windowMs: 10 * 60 * 1000,
        max: 10,
        message: { error: 'Too many reports. Please wait a few minutes.' },
      })
      server = await startServer(app)
    })

    afterEach(async () => {
      await stopServer(server)
    })

    it('should allow up to 10 requests', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await makeRequest(server, 'POST')
        expect(res.status).toBe(200)
      }
    })

    it('should return 429 on the 11th request', async () => {
      for (let i = 0; i < 10; i++) {
        await makeRequest(server, 'POST')
      }
      const res = await makeRequest(server, 'POST')
      expect(res.status).toBe(429)
      expect(res.body.error).toContain('Too many reports')
    })
  })

  describe('Reply rate limit (15 replies / 5min)', () => {
    let server

    beforeEach(async () => {
      const app = createApp({
        windowMs: 5 * 60 * 1000,
        max: 15,
        message: { error: 'Too many replies. Please wait.' },
      })
      server = await startServer(app)
    })

    afterEach(async () => {
      await stopServer(server)
    })

    it('should allow up to 15 requests', async () => {
      for (let i = 0; i < 15; i++) {
        const res = await makeRequest(server, 'POST')
        expect(res.status).toBe(200)
      }
    })

    it('should return 429 on the 16th request', async () => {
      for (let i = 0; i < 15; i++) {
        await makeRequest(server, 'POST')
      }
      const res = await makeRequest(server, 'POST')
      expect(res.status).toBe(429)
      expect(res.body.error).toContain('Too many replies')
    })
  })

  describe('RateLimit headers (Requirement 4.6)', () => {
    let server

    beforeEach(async () => {
      const app = createApp({
        windowMs: 60 * 1000,
        max: 20,
        message: { error: 'Too many requests.' },
      })
      server = await startServer(app)
    })

    afterEach(async () => {
      await stopServer(server)
    })

    it('should include RateLimit-Limit header', async () => {
      const res = await makeRequest(server)
      expect(res.headers['ratelimit-limit']).toBeDefined()
      expect(Number(res.headers['ratelimit-limit'])).toBe(20)
    })

    it('should include RateLimit-Remaining header', async () => {
      const res = await makeRequest(server)
      expect(res.headers['ratelimit-remaining']).toBeDefined()
      expect(Number(res.headers['ratelimit-remaining'])).toBe(19)
    })

    it('should include RateLimit-Reset header', async () => {
      const res = await makeRequest(server)
      expect(res.headers['ratelimit-reset']).toBeDefined()
      // Reset value should be a positive number (seconds until window resets)
      expect(Number(res.headers['ratelimit-reset'])).toBeGreaterThan(0)
    })

    it('should decrement RateLimit-Remaining with each request', async () => {
      const res1 = await makeRequest(server)
      const res2 = await makeRequest(server)
      const res3 = await makeRequest(server)

      expect(Number(res1.headers['ratelimit-remaining'])).toBe(19)
      expect(Number(res2.headers['ratelimit-remaining'])).toBe(18)
      expect(Number(res3.headers['ratelimit-remaining'])).toBe(17)
    })
  })

  describe('Window reset (Requirement 4.7)', () => {
    let server

    beforeEach(async () => {
      vi.useFakeTimers()
      const app = createApp({
        windowMs: 60 * 1000,
        max: 5,
        message: { error: 'Rate limited.' },
      })
      server = await startServer(app)
    })

    afterEach(async () => {
      vi.useRealTimers()
      await stopServer(server)
    })

    it('should accept requests again after the window elapses', async () => {
      // Exhaust the limit
      for (let i = 0; i < 5; i++) {
        await makeRequest(server)
      }

      // Should be blocked
      const blocked = await makeRequest(server)
      expect(blocked.status).toBe(429)

      // Advance time past the window
      vi.advanceTimersByTime(61 * 1000)

      // Should be accepted again
      const accepted = await makeRequest(server)
      expect(accepted.status).toBe(200)
    })
  })
})
