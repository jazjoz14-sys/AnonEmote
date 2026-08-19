/**
 * Property 9: Privacy Invariant — No Sensitive Data in SSE Output
 * **Validates: Requirements 8.4**
 *
 * For any entry object that may contain `content`, `session_id`, `ip`, or `author_id`
 * at top level or in payload, the output of `stripPrivateFields` contains none of those keys.
 *
 * Tag: Feature: realtime-error-logging, Property 9: Privacy Invariant — No Sensitive Data in SSE Output
 */
import { describe, it, expect, vi } from 'vitest'
import fc from 'fast-check'

// ── Mock Dependencies (admin.js imports modules with side effects) ────────────

vi.mock('../lib/supabase.js', () => ({
  getSupabase: vi.fn(),
}))

vi.mock('../middleware/adminAuth.js', () => ({
  login: vi.fn(),
  logout: vi.fn(),
  requireAdmin: (req, res, next) => next(),
  activeSessionCount: vi.fn(() => 0),
  validateToken: vi.fn(() => true),
}))

vi.mock('../lib/storage.js', () => ({
  getLexicon: vi.fn(async () => ({ allow: [], toxic: [], crisis: [] })),
  saveLexicon: vi.fn(),
  appendAudit: vi.fn(),
  readAudit: vi.fn(async () => []),
  storageMode: vi.fn(() => 'file'),
}))

vi.mock('../lib/eventBus.js', () => ({
  onAudit: vi.fn(),
  offAudit: vi.fn(),
}))

vi.mock('express-rate-limit', () => ({
  default: () => (req, res, next) => next(),
}))

import { stripPrivateFields } from './admin.js'

// ── Constants ────────────────────────────────────────────────────────────────

const SENSITIVE_KEYS = ['content', 'session_id', 'ip', 'author_id']

// ── Property 9 Tests ─────────────────────────────────────────────────────────

describe('Feature: realtime-error-logging, Property 9: Privacy Invariant — No Sensitive Data in SSE Output', () => {
  it('output never contains sensitive fields at top level', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.string(),
          ts: fc.string(),
          content: fc.string(),
          session_id: fc.string(),
          ip: fc.string(),
          author_id: fc.string(),
          severity: fc.constantFrom('error', 'warning', 'info'),
        }),
        (entry) => {
          const result = stripPrivateFields(entry)
          for (const key of SENSITIVE_KEYS) {
            expect(result).not.toHaveProperty(key)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('output never contains sensitive fields in nested payload', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.string(),
          ts: fc.string(),
          severity: fc.constantFrom('error', 'warning', 'info'),
          payload: fc.record({
            content: fc.string(),
            session_id: fc.string(),
            ip: fc.string(),
            author_id: fc.string(),
            planet_id: fc.string(),
            verdict: fc.string(),
          }),
        }),
        (entry) => {
          const result = stripPrivateFields(entry)
          for (const key of SENSITIVE_KEYS) {
            expect(result.payload).not.toHaveProperty(key)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('preserves non-sensitive fields at top level and in payload', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.string({ minLength: 1 }),
          ts: fc.string({ minLength: 1 }),
          severity: fc.constantFrom('error', 'warning', 'info'),
          payload: fc.record({
            planet_id: fc.string({ minLength: 1 }),
            verdict: fc.string({ minLength: 1 }),
          }),
        }),
        (entry) => {
          const result = stripPrivateFields(entry)
          // Non-sensitive fields are preserved
          expect(result.type).toBe(entry.type)
          expect(result.ts).toBe(entry.ts)
          expect(result.severity).toBe(entry.severity)
          expect(result.payload.planet_id).toBe(entry.payload.planet_id)
          expect(result.payload.verdict).toBe(entry.payload.verdict)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('does not mutate the original entry', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.string(),
          content: fc.string(),
          session_id: fc.string(),
          payload: fc.record({
            ip: fc.string(),
            author_id: fc.string(),
          }),
        }),
        (entry) => {
          const originalContent = entry.content
          const originalSessionId = entry.session_id
          stripPrivateFields(entry)
          // Original should be untouched
          expect(entry.content).toBe(originalContent)
          expect(entry.session_id).toBe(originalSessionId)
        }
      ),
      { numRuns: 200 }
    )
  })
})
