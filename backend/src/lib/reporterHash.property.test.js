/**
 * Property-Based Test: Reporter Hash Determinism and Per-Post Uniqueness
 *
 * Feature: qa-testing-error-handling, Property 16: Reporter hash determinism and per-post uniqueness
 *
 * **Validates: Requirements 11.3**
 *
 * Property 16: For any IP address and post_id pair, reporterHash SHALL produce
 * the same hash on repeated calls. For any fixed IP with two different post_ids,
 * the hashes SHALL differ.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { createMockReq } from '../../tests/helpers.js'

describe('Property 16: Reporter hash determinism and per-post uniqueness', () => {
  let reporterHash

  beforeEach(async () => {
    vi.resetModules()
    // Set a valid secret (≥16 chars) for consistent hashing
    process.env.REPORT_HASH_SECRET = 'property-test-secret-abcdef1234567890'
    delete process.env.SUPABASE_SERVICE_KEY

    const mod = await import('./reporterHash.js')
    reporterHash = mod.reporterHash
  })

  afterEach(() => {
    delete process.env.REPORT_HASH_SECRET
    delete process.env.SUPABASE_SERVICE_KEY
    vi.restoreAllMocks()
  })

  it('same IP + same post_id always produces the same hash (deterministic)', () => {
    /**
     * Feature: qa-testing-error-handling, Property 16: Reporter hash determinism and per-post uniqueness
     * **Validates: Requirements 11.3**
     *
     * For any IP and post_id, calling reporterHash with the same inputs
     * must always return the same output.
     */
    fc.assert(
      fc.property(
        fc.tuple(fc.ipV4(), fc.uuid()),
        ([ip, postId]) => {
          const req = createMockReq({ ip })

          const hash1 = reporterHash(req, postId)
          const hash2 = reporterHash(req, postId)

          expect(hash1).toBe(hash2)
          expect(hash1).toBeTypeOf('string')
          expect(hash1.length).toBe(64) // SHA-256 hex digest
        }
      ),
      { numRuns: 100 }
    )
  })

  it('same IP + different post_ids produce different hashes (per-post uniqueness)', () => {
    /**
     * Feature: qa-testing-error-handling, Property 16: Reporter hash determinism and per-post uniqueness
     * **Validates: Requirements 11.3**
     *
     * For any fixed IP with two distinct post_ids, the resulting hashes
     * must differ — preventing cross-post correlation of reporters.
     */
    fc.assert(
      fc.property(
        fc.tuple(fc.ipV4(), fc.uuid(), fc.uuid()),
        ([ip, postId1, postId2]) => {
          // Only assert when the two post IDs are actually different
          fc.pre(postId1 !== postId2)

          const req = createMockReq({ ip })

          const hash1 = reporterHash(req, postId1)
          const hash2 = reporterHash(req, postId2)

          expect(hash1).not.toBe(hash2)
          expect(hash1).toBeTypeOf('string')
          expect(hash2).toBeTypeOf('string')
          expect(hash1.length).toBe(64)
          expect(hash2.length).toBe(64)
        }
      ),
      { numRuns: 100 }
    )
  })
})
