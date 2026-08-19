// Feature: realtime-error-logging, Property 3: Severity Classification Totality
/**
 * Property-Based Test: Severity Classification Totality
 *
 * Feature: realtime-error-logging, Property 3: Severity Classification Totality
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
 *
 * Property 3: For any string used as a Log_Entry type field, classifySeverity
 * SHALL return exactly one of 'error', 'warning', or 'info' — where strings
 * containing "error" or "failed" map to 'error', strings containing "warn" or
 * "rate_limit" map to 'warning', and all other strings map to 'info'.
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { classifySeverity } from './eventBus.js'

describe('Property 3: Severity Classification Totality', () => {
  it('classifySeverity always returns exactly one of error, warning, or info for any string', () => {
    /**
     * Feature: realtime-error-logging, Property 3: Severity Classification Totality
     * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
     *
     * For any arbitrary string, the return value is always one of the three
     * valid severity levels — no undefined, no exceptions, no other values.
     */
    fc.assert(
      fc.property(fc.string(), (type) => {
        const result = classifySeverity(type)
        expect(['error', 'warning', 'info']).toContain(result)
      }),
      { numRuns: 200 }
    )
  })

  it('strings containing "error" or "failed" always map to "error"', () => {
    /**
     * Feature: realtime-error-logging, Property 3: Severity Classification Totality
     * **Validates: Requirements 3.2**
     *
     * Any string that contains "error" or "failed" (case-insensitive) must
     * classify as 'error'.
     */
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.oneof(fc.constant('error'), fc.constant('failed')), fc.string()),
        ([prefix, keyword, suffix]) => {
          const type = prefix + keyword + suffix
          expect(classifySeverity(type)).toBe('error')
        }
      ),
      { numRuns: 200 }
    )
  })

  it('strings containing "warn" or "rate_limit" (without "error"/"failed") map to "warning"', () => {
    /**
     * Feature: realtime-error-logging, Property 3: Severity Classification Totality
     * **Validates: Requirements 3.3**
     *
     * Any string that contains "warn" or "rate_limit" but does NOT contain
     * "error" or "failed" must classify as 'warning'.
     */
    fc.assert(
      fc.property(
        fc.tuple(fc.string(), fc.oneof(fc.constant('warn'), fc.constant('rate_limit')), fc.string()),
        ([prefix, keyword, suffix]) => {
          const type = prefix + keyword + suffix
          const lower = type.toLowerCase()
          // Only assert warning when error/failed keywords aren't present
          // (error takes precedence per the implementation)
          fc.pre(!lower.includes('error') && !lower.includes('failed'))
          expect(classifySeverity(type)).toBe('warning')
        }
      ),
      { numRuns: 200 }
    )
  })

  it('strings without error/failed/warn/rate_limit always map to "info"', () => {
    /**
     * Feature: realtime-error-logging, Property 3: Severity Classification Totality
     * **Validates: Requirements 3.4**
     *
     * Any string that does NOT contain "error", "failed", "warn", or "rate_limit"
     * (case-insensitive) must classify as 'info'.
     */
    fc.assert(
      fc.property(fc.string(), (type) => {
        const lower = (type || '').toLowerCase()
        fc.pre(
          !lower.includes('error') &&
          !lower.includes('failed') &&
          !lower.includes('warn') &&
          !lower.includes('rate_limit')
        )
        expect(classifySeverity(type)).toBe('info')
      }),
      { numRuns: 200 }
    )
  })
})
