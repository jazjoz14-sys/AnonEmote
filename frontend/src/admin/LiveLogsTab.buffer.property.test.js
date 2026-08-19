// Feature: realtime-error-logging, Property 5: Bounded Buffer Invariant
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Validates: Requirements 4.6
 *
 * Property 5: Bounded Buffer Invariant
 * For any sequence of N entries (N > 0), the buffer never exceeds 500 items;
 * when N > 500, only the 500 most recent entries are kept.
 */

const MAX_ENTRIES = 500

/**
 * Simulates the buffer prepend logic from LiveLogsTab.
 * @param {Array} buffer - Current buffer state
 * @param {object} entry - New entry to prepend
 * @returns {Array} Updated buffer
 */
function addEntry(buffer, entry) {
  const next = [entry, ...buffer]
  return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next
}

describe('Property 5: Bounded Buffer Invariant', () => {
  it('buffer never exceeds 500 items for any sequence of entries', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ts: fc.integer({ min: 946684800000, max: 1924905600000 }).map((ms) => new Date(ms).toISOString()),
            type: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error', 'warning', 'info'),
          }),
          { minLength: 1, maxLength: 800 }
        ),
        (entries) => {
          let buffer = []
          for (const entry of entries) {
            buffer = addEntry(buffer, entry)
            expect(buffer.length).toBeLessThanOrEqual(MAX_ENTRIES)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('when N > 500 entries added, buffer contains only the 500 most recent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 501, max: 1000 }),
        (n) => {
          let buffer = []
          const allEntries = Array.from({ length: n }, (_, i) => ({
            ts: new Date(Date.now() + i).toISOString(),
            type: `event_${i}`,
            severity: 'info',
          }))

          for (const entry of allEntries) {
            buffer = addEntry(buffer, entry)
          }

          expect(buffer).toHaveLength(MAX_ENTRIES)
          // Most recent entry should be first
          expect(buffer[0]).toEqual(allEntries[allEntries.length - 1])
        }
      ),
      { numRuns: 100 }
    )
  })

  it('buffer preserves insertion order (newest first)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            ts: fc.string({ minLength: 1 }),
            type: fc.string({ minLength: 1 }),
            severity: fc.constantFrom('error', 'warning', 'info'),
          }),
          { minLength: 2, maxLength: 100 }
        ),
        (entries) => {
          let buffer = []
          for (const entry of entries) {
            buffer = addEntry(buffer, entry)
          }
          // First item in buffer should be the last entry added
          expect(buffer[0]).toEqual(entries[entries.length - 1])
        }
      ),
      { numRuns: 200 }
    )
  })
})
