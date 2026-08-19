/**
 * Integration Test: Full SSE Flow
 *
 * Tests the end-to-end data path from EventBus emission through the SSE
 * endpoint to connected admin clients. Uses a real Express server with
 * mocked dependencies (supabase, storage, adminAuth) to verify the wiring.
 *
 * Uses raw TCP sockets for SSE connections to avoid Node.js http module
 * buffering issues in the test environment.
 *
 * **Validates: Requirements 1.1, 2.4, 2.5, 2.6, 8.2**
 */
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import express from 'express'
import net from 'net'

// ── Mock heavy dependencies before importing admin router ─────────────────────

vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(() => null),
}))

vi.mock('../lib/storage.js', () => ({
  getLexicon: vi.fn(async () => ({ crisis: [], toxic: [], allow: [] })),
  saveLexicon: vi.fn(),
  appendAudit: vi.fn(),
  readAudit: vi.fn(async () => []),
  storageMode: vi.fn(() => 'file'),
}))

// Mock adminAuth — validateToken accepts 'test-token', rejects others
vi.mock('../middleware/adminAuth.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  requireAdmin: (req, res, next) => next(),
  activeSessionCount: vi.fn(() => 0),
  validateToken: vi.fn((token) => token === 'test-token'),
}))

vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}))

import { adminRouter } from './admin.js'
import { emitAudit } from '../lib/eventBus.js'
import bus from '../lib/eventBus.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

let server
let serverPort

/**
 * Open a raw TCP connection and send an HTTP GET request for SSE.
 * Returns a socket that receives raw HTTP response bytes.
 * This avoids Node's http module which can buffer responses in test environments.
 */
function connectSSERaw(token = 'test-token') {
  return new Promise((resolve, reject) => {
    const socket = net.connect(serverPort, '127.0.0.1', () => {
      const request = [
        `GET /api/admin/stream?token=${token} HTTP/1.1`,
        `Host: 127.0.0.1:${serverPort}`,
        `Accept: text/event-stream`,
        `Connection: keep-alive`,
        '',
        '',
      ].join('\r\n')
      socket.write(request)
      resolve(socket)
    })
    socket.on('error', reject)
  })
}

/**
 * Read from socket until we see the HTTP status line.
 * Returns the full response received so far.
 */
function waitForHeaders(socket, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => reject(new Error('Timed out waiting for headers')), timeoutMs)
    const onData = (chunk) => {
      buffer += chunk.toString()
      // HTTP response headers end with \r\n\r\n
      if (buffer.includes('\r\n\r\n')) {
        clearTimeout(timer)
        socket.removeListener('data', onData)
        resolve(buffer)
      }
    }
    socket.on('data', onData)
    socket.on('error', (err) => { clearTimeout(timer); reject(err) })
    socket.on('close', () => { clearTimeout(timer); resolve(buffer) })
  })
}

/**
 * Wait for a specific pattern in the socket data stream.
 */
function waitForData(socket, pattern, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for pattern: ${pattern}`)), timeoutMs)
    const onData = (chunk) => {
      buffer += chunk.toString()
      if (buffer.includes(pattern)) {
        clearTimeout(timer)
        socket.removeListener('data', onData)
        resolve(buffer)
      }
    }
    socket.on('data', onData)
    socket.on('error', (err) => { clearTimeout(timer); reject(err) })
  })
}

/**
 * Extract HTTP status code from raw response headers.
 */
function getStatusCode(rawHeaders) {
  const statusLine = rawHeaders.split('\r\n')[0]
  const match = statusLine.match(/HTTP\/\d\.\d (\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('Integration: Full SSE Flow', () => {
  const activeSockets = []

  beforeAll(() => {
    return new Promise((resolve) => {
      const app = express()
      app.use(express.json())
      app.use('/api/admin', adminRouter)
      server = app.listen(0, () => {
        serverPort = server.address().port
        resolve()
      })
    })
  })

  afterAll(() => {
    for (const s of activeSockets) {
      try { s.destroy() } catch (_) {}
    }
    return new Promise((resolve) => {
      server.close(resolve)
    })
  })

  afterEach(async () => {
    for (const s of activeSockets) {
      try { s.destroy() } catch (_) {}
    }
    activeSockets.length = 0
    // Wait for close events to propagate
    await new Promise((r) => setTimeout(r, 200))
    bus.removeAllListeners('audit')
  })

  it('returns 401 for invalid token', async () => {
    const socket = await connectSSERaw('bad-token')
    activeSockets.push(socket)
    const headers = await waitForHeaders(socket)
    expect(getStatusCode(headers)).toBe(401)
  })

  it('emitAudit → EventBus → SSE client receives JSON event', async () => {
    const socket = await connectSSERaw()
    activeSockets.push(socket)
    const headers = await waitForHeaders(socket)
    expect(getStatusCode(headers)).toBe(200)
    expect(headers.toLowerCase()).toContain('text/event-stream')

    // Now wait for an SSE data message after emitting an event
    const dataPromise = waitForData(socket, 'data:')
    setTimeout(() => {
      emitAudit({ ts: '2026-01-01T00:00:00Z', type: 'moderation', payload: { verdict: 'safe' } })
    }, 100)

    const raw = await dataPromise
    // Extract JSON from the SSE data line
    const dataMatch = raw.match(/data: (.+)/)
    expect(dataMatch).not.toBeNull()
    const parsed = JSON.parse(dataMatch[1])
    expect(parsed.type).toBe('moderation')
    expect(parsed.severity).toBe('info')
    expect(parsed.ts).toBe('2026-01-01T00:00:00Z')
  }, 10000)

  it('heartbeat arrives within 35 seconds', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const socket = await connectSSERaw()
      activeSockets.push(socket)
      const headers = await waitForHeaders(socket)
      expect(getStatusCode(headers)).toBe(200)

      // Collect any data that arrives on the socket
      let received = ''
      socket.on('data', (chunk) => {
        received += chunk.toString()
      })

      // Advance time past the 30s heartbeat interval
      await vi.advanceTimersByTimeAsync(31000)

      // Give the event loop a tick to deliver socket data
      await new Promise((resolve) => setImmediate(resolve))

      expect(received).toContain(':ping')
    } finally {
      vi.useRealTimers()
    }
  }, 15000)

  it('client disconnect removes listener from EventBus', async () => {
    const initialListeners = bus.listenerCount('audit')
    const socket = await connectSSERaw()
    activeSockets.push(socket)
    const headers = await waitForHeaders(socket)
    expect(getStatusCode(headers)).toBe(200)

    // Wait for listener registration
    await new Promise((r) => setTimeout(r, 100))
    expect(bus.listenerCount('audit')).toBe(initialListeners + 1)

    // Disconnect
    socket.destroy()
    activeSockets.length = 0

    // Wait for close event to propagate
    await new Promise((r) => setTimeout(r, 200))
    expect(bus.listenerCount('audit')).toBe(initialListeners)
  }, 10000)

  it('multiple concurrent connections receive same event', async () => {
    const socket1 = await connectSSERaw()
    const socket2 = await connectSSERaw()
    activeSockets.push(socket1, socket2)

    const headers1 = await waitForHeaders(socket1)
    const headers2 = await waitForHeaders(socket2)
    expect(getStatusCode(headers1)).toBe(200)
    expect(getStatusCode(headers2)).toBe(200)

    const p1 = waitForData(socket1, 'data:')
    const p2 = waitForData(socket2, 'data:')

    // Emit one event — both clients should receive it
    setTimeout(() => {
      emitAudit({ ts: '2026-01-01T00:00:00Z', type: 'test_broadcast' })
    }, 100)

    const [data1, data2] = await Promise.all([p1, p2])
    expect(data1).toContain('test_broadcast')
    expect(data2).toContain('test_broadcast')
  }, 10000)

  it('connection cap returns 503 on 6th connection', async () => {
    // Open 5 connections (the maximum)
    for (let i = 0; i < 5; i++) {
      const socket = await connectSSERaw()
      activeSockets.push(socket)
      const headers = await waitForHeaders(socket)
      expect(getStatusCode(headers)).toBe(200)
    }

    // Wait for all to register
    await new Promise((r) => setTimeout(r, 200))

    // 6th connection should be rejected with 503
    const socket6 = await connectSSERaw()
    activeSockets.push(socket6)
    const headers6 = await waitForHeaders(socket6)
    expect(getStatusCode(headers6)).toBe(503)
  }, 15000)
})
