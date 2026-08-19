import { describe, it, expect, afterEach } from 'vitest'
import bus, { classifySeverity, emitAudit, onAudit, offAudit } from './eventBus.js'

describe('eventBus', () => {
  afterEach(() => {
    bus.removeAllListeners('audit')
  })

  describe('classifySeverity', () => {
    it('returns "error" for types containing "error"', () => {
      expect(classifySeverity('login_error')).toBe('error')
      expect(classifySeverity('ERROR')).toBe('error')
      expect(classifySeverity('some_error_happened')).toBe('error')
    })

    it('returns "error" for types containing "failed"', () => {
      expect(classifySeverity('admin_login_failed')).toBe('error')
      expect(classifySeverity('FAILED')).toBe('error')
    })

    it('returns "warning" for types containing "warn"', () => {
      expect(classifySeverity('warn_threshold')).toBe('warning')
      expect(classifySeverity('WARNING')).toBe('warning')
    })

    it('returns "warning" for types containing "rate_limit"', () => {
      expect(classifySeverity('rate_limit')).toBe('warning')
      expect(classifySeverity('user_rate_limit_exceeded')).toBe('warning')
    })

    it('returns "info" for all other types', () => {
      expect(classifySeverity('moderation')).toBe('info')
      expect(classifySeverity('admin_login')).toBe('info')
      expect(classifySeverity('post_created')).toBe('info')
    })

    it('returns "info" for empty or null type', () => {
      expect(classifySeverity('')).toBe('info')
      expect(classifySeverity(null)).toBe('info')
      expect(classifySeverity(undefined)).toBe('info')
    })
  })

  describe('emitAudit', () => {
    it('enriches entry with severity and emits to listeners', () => {
      const received = []
      onAudit((entry) => received.push(entry))

      emitAudit({ type: 'login_error', ts: '2026-01-01T00:00:00Z' })

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual({
        type: 'login_error',
        ts: '2026-01-01T00:00:00Z',
        severity: 'error',
      })
    })

    it('broadcasts to multiple listeners', () => {
      const received1 = []
      const received2 = []
      onAudit((entry) => received1.push(entry))
      onAudit((entry) => received2.push(entry))

      emitAudit({ type: 'moderation', ts: '2026-01-01T00:00:00Z' })

      expect(received1).toHaveLength(1)
      expect(received2).toHaveLength(1)
      expect(received1[0].severity).toBe('info')
    })

    it('does not throw with zero listeners', () => {
      expect(() => emitAudit({ type: 'test' })).not.toThrow()
    })
  })

  describe('onAudit / offAudit', () => {
    it('offAudit removes a listener so it no longer receives events', () => {
      const received = []
      const listener = (entry) => received.push(entry)

      onAudit(listener)
      emitAudit({ type: 'first' })
      expect(received).toHaveLength(1)

      offAudit(listener)
      emitAudit({ type: 'second' })
      expect(received).toHaveLength(1) // still 1, not 2
    })
  })

  describe('bus configuration', () => {
    it('has max listeners set to 10', () => {
      expect(bus.getMaxListeners()).toBe(10)
    })
  })
})
