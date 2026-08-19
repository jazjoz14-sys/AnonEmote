import { describe, it, expect, beforeEach } from 'vitest'
import { getGuestSessionId, clearGuestSession, hasGuestSession } from './guestSession.js'

describe('guestSession', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  describe('getGuestSessionId', () => {
    it('generates a v4 UUID on first call', () => {
      const id = getGuestSessionId()
      // v4 UUID format: 8-4-4-4-12 hex chars
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('returns the same UUID on subsequent calls (same tab session)', () => {
      const first = getGuestSessionId()
      const second = getGuestSessionId()
      const third = getGuestSessionId()
      expect(first).toBe(second)
      expect(second).toBe(third)
    })

    it('stores the UUID in sessionStorage', () => {
      const id = getGuestSessionId()
      expect(sessionStorage.getItem('anonemote_guest_session')).toBe(id)
    })

    it('NEVER writes to localStorage', () => {
      getGuestSessionId()
      expect(localStorage.length).toBe(0)
    })

    it('reuses existing sessionStorage value if present', () => {
      const preExisting = 'pre-existing-uuid-value'
      sessionStorage.setItem('anonemote_guest_session', preExisting)
      const id = getGuestSessionId()
      expect(id).toBe(preExisting)
    })
  })

  describe('clearGuestSession', () => {
    it('removes the guest session UUID from sessionStorage', () => {
      getGuestSessionId()
      expect(hasGuestSession()).toBe(true)
      clearGuestSession()
      expect(hasGuestSession()).toBe(false)
      expect(sessionStorage.getItem('anonemote_guest_session')).toBeNull()
    })

    it('does not throw if no session exists', () => {
      expect(() => clearGuestSession()).not.toThrow()
    })
  })

  describe('hasGuestSession', () => {
    it('returns false when no session exists', () => {
      expect(hasGuestSession()).toBe(false)
    })

    it('returns true after getGuestSessionId is called', () => {
      getGuestSessionId()
      expect(hasGuestSession()).toBe(true)
    })
  })

  describe('localStorage isolation', () => {
    it('never touches localStorage regardless of how many times getGuestSessionId is called', () => {
      for (let i = 0; i < 10; i++) {
        getGuestSessionId()
      }
      expect(localStorage.length).toBe(0)
    })

    it('clearGuestSession does not affect localStorage', () => {
      localStorage.setItem('unrelated_key', 'value')
      getGuestSessionId()
      clearGuestSession()
      expect(localStorage.getItem('unrelated_key')).toBe('value')
      expect(localStorage.length).toBe(1)
    })
  })
})
