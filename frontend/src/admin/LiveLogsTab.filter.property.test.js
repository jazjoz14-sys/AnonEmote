// Feature: realtime-error-logging, Property 6: Filter Correctness
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Validates: Requirements 6.3
 *
 * Property 6: Filter Correctness
 * For any list of entries and any active filter, every entry in the filtered
 * output matches the filter criteria.
 */

/**
 * Replicates the filter logic from LiveLogsTab.
 */
function filterEntries(entries, severityFilter, typeFilter) {
  return entries.filter((entry) => {
    if (severityFilter !== 'all' && entry.severity !== severityFilter) return false
    if (typeFilter !== 'all' && !(entry.type || '').includes(typeFilter)) return false
    return true
  })
}

const severityArb = fc.constantFrom('error', 'warning', 'info')
const typeArb = fc.constantFrom('moderation', 'report', 'admin_login', 'admin_action', 'rate_limit', 'admin_login_failed')
const severityFilterArb = fc.constantFrom('all', 'error', 'warning', 'info')
const typeFilterArb = fc.constantFrom('all', 'moderation', 'report', 'admin', 'rate_limit')

const entryArb = fc.record({
  ts: fc.integer({ min: 946684800000, max: 1924905600000 }).map((ms) => new Date(ms).toISOString()),
  type: typeArb,
  severity: severityArb,
})

describe('Property 6: Filter Correctness', () => {
  it('every entry in the filtered output matches the active severity filter', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 100 }),
        severityFilterArb,
        (entries, filter) => {
          const result = filterEntries(entries, filter, 'all')
          for (const entry of result) {
            if (filter !== 'all') {
              expect(entry.severity).toBe(filter)
            }
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('every entry in the filtered output matches the active type filter', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 100 }),
        typeFilterArb,
        (entries, filter) => {
          const result = filterEntries(entries, 'all', filter)
          for (const entry of result) {
            if (filter !== 'all') {
              expect(entry.type).toContain(filter)
            }
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('"all" filter returns all entries unchanged', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 0, maxLength: 100 }),
        (entries) => {
          const result = filterEntries(entries, 'all', 'all')
          expect(result).toHaveLength(entries.length)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('combined severity + type filter: all results match both criteria', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 100 }),
        severityFilterArb,
        typeFilterArb,
        (entries, sevFilter, typeFilter) => {
          const result = filterEntries(entries, sevFilter, typeFilter)
          for (const entry of result) {
            if (sevFilter !== 'all') expect(entry.severity).toBe(sevFilter)
            if (typeFilter !== 'all') expect(entry.type).toContain(typeFilter)
          }
        }
      ),
      { numRuns: 200 }
    )
  })
})
