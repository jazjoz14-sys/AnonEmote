/**
 * Authentication Middleware Tests
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 *
 * Tests the verifyAuth (soft auth) and requireAuth (hard auth) middleware
 * functions for correct token extraction, Supabase verification, and
 * request property assignment.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockReq, createMockRes } from '../../tests/helpers.js'

// Mock the supabase module before importing the middleware
const mockGetUser = vi.fn()

vi.mock('../lib/supabase.js', () => ({
  getSupabase: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}))

const { verifyAuth, requireAuth } = await import('./verifyAuth.js')

describe('verifyAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Requirement 7.1: No Authorization header
  it('sets isAuthenticated=false and userId=null when no Authorization header is present', async () => {
    const req = createMockReq({ headers: {} })
    const res = createMockRes()
    const next = vi.fn()

    await verifyAuth(req, res, next)

    expect(req.isAuthenticated).toBe(false)
    expect(req.userId).toBeNull()
    expect(next).toHaveBeenCalledOnce()
  })

  // Requirement 7.1: Authorization header without "Bearer " prefix
  it('sets isAuthenticated=false and userId=null when Authorization header lacks Bearer prefix', async () => {
    const req = createMockReq({
      headers: { authorization: 'Basic sometoken123' },
    })
    const res = createMockRes()
    const next = vi.fn()

    await verifyAuth(req, res, next)

    expect(req.isAuthenticated).toBe(false)
    expect(req.userId).toBeNull()
    expect(next).toHaveBeenCalledOnce()
  })

  // Requirement 7.2: Bearer token that fails verification (expired/malformed)
  it('sets isAuthenticated=false and userId=null when token verification fails', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired or malformed' },
    })

    const req = createMockReq({
      headers: { authorization: 'Bearer expired-or-malformed-token' },
    })
    const res = createMockRes()
    const next = vi.fn()

    await verifyAuth(req, res, next)

    expect(req.isAuthenticated).toBe(false)
    expect(req.userId).toBeNull()
    expect(next).toHaveBeenCalledOnce()
    expect(mockGetUser).toHaveBeenCalledWith('expired-or-malformed-token')
  })

  // Requirement 7.3: Valid Bearer token sets userId and isAuthenticated
  it('sets userId to user UUID and isAuthenticated=true for valid token', async () => {
    const testUserId = '550e8400-e29b-41d4-a716-446655440000'
    mockGetUser.mockResolvedValue({
      data: { user: { id: testUserId } },
      error: null,
    })

    const req = createMockReq({
      headers: { authorization: 'Bearer valid-jwt-token' },
    })
    const res = createMockRes()
    const next = vi.fn()

    await verifyAuth(req, res, next)

    expect(req.isAuthenticated).toBe(true)
    expect(req.userId).toBe(testUserId)
    expect(next).toHaveBeenCalledOnce()
    expect(mockGetUser).toHaveBeenCalledWith('valid-jwt-token')
  })

  // Requirement 7.6: Supabase unavailable during verification
  it('sets isAuthenticated=false and userId=null when Supabase throws an error', async () => {
    mockGetUser.mockRejectedValue(new Error('Supabase service unavailable'))

    const req = createMockReq({
      headers: { authorization: 'Bearer some-token' },
    })
    const res = createMockRes()
    const next = vi.fn()

    await verifyAuth(req, res, next)

    expect(req.isAuthenticated).toBe(false)
    expect(req.userId).toBeNull()
    expect(next).toHaveBeenCalledOnce()
  })
})

describe('requireAuth middleware', () => {
  // Requirement 7.4: Unauthenticated request returns 401
  it('returns 401 with error message when request is not authenticated', () => {
    const req = createMockReq({ isAuthenticated: false })
    const res = createMockRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(res.statusCode).toBe(401)
    expect(res._json).toEqual({
      error: 'Authentication required. Please sign in.',
    })
    expect(next).not.toHaveBeenCalled()
  })

  // Requirement 7.4: Authenticated request passes through
  it('calls next() when request is authenticated', () => {
    const req = createMockReq({
      isAuthenticated: true,
      userId: '550e8400-e29b-41d4-a716-446655440000',
    })
    const res = createMockRes()
    const next = vi.fn()

    requireAuth(req, res, next)

    expect(next).toHaveBeenCalledOnce()
    expect(res.status).not.toHaveBeenCalled()
  })
})
