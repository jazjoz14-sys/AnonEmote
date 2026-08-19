import { describe, it, expect, vi } from 'vitest'
import { requireAuth } from './requireAuth.js'

/**
 * Unit tests for the requireAuth middleware.
 * Validates: Requirements 1.5
 */
describe('requireAuth middleware', () => {
  it('returns 401 with error message when req.isAuthenticated is false', () => {
    const req = { isAuthenticated: false }
    const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this }, json(data) { this.body = data; return this } }
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Authentication required. Please sign in.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 when req.isAuthenticated is undefined (falsy)', () => {
    const req = {}
    const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this }, json(data) { this.body = data; return this } }
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Authentication required. Please sign in.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next() when req.isAuthenticated is true', () => {
    const req = { isAuthenticated: true, userId: 'abc-123' }
    const res = { statusCode: null, body: null, status(code) { this.statusCode = code; return this }, json(data) { this.body = data; return this } }
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.statusCode).toBeNull()
    expect(res.body).toBeNull()
  })
})
