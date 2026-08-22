// Feature: admin-dashboard-overhaul, Property 7: Log buffer respects maximum capacity

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { addLogEntry, MAX_ENTRIES } from './LogsPage.jsx'

/**
 * Validates: Requirements 10.3
 *
 * Property 7: Log buffer respects maximum capacity
 * For any sequence of incoming SSE log entries, the entry buffer length SHALL
 * never exceed 500 items, with the oldest entries discarded first when the cap
 * is reached.
 */

/** Arbitrary for generating a realistic log entry */
const logEntryArb = fc.record({
  ts: fc.integer({ min: 1577836800000, max: 1893456000000 }).map((ms) => new Date(ms).toISOString()),
  severity: fc.constantFrom('error', 'warning', 'info'),
  type: fc.constantFrom('moderation', 'report', 'admin', 'rate_limit'),
  payload: fc.dictionary(fc.string({ minLength: 1, maxLength: 5 }), fc.string({ maxLength: 10 })),
})

/** Arbitrary for generating sequences of log entries (0–1000) */
const entrySequenceArb = fc.array(logEntryArb, { minLength: 0, maxLength: 1000 })

describe('Property 7: Log buffer respects maximum capacity', () => {
  it('buffer length never exceeds 500 after any number of additions', () => {
    fc.assert(
      fc.property(entrySequenceArb, (entries) => {
        let buffer = []

        for (const entry of entries) {
          buffer = addLogEntry(buffer, entry)
          // Invariant: buffer never exceeds MAX_ENTRIES
          expect(buffer.length).toBeLessThanOrEqual(MAX_ENTRIES)
        }
      }),
      { numRuns: 200 }
    )
  })

  it('most recent entry is always at index 0 after insertion', () => {
    fc.assert(
      fc.property(
        fc.array(logEntryArb, { minLength: 1, maxLength: 1000 }),
        (entries) => {
          let buffer = []

          for (const entry of entries) {
            buffer = addLogEntry(buffer, entry)
            // The newest entry is always first
            expect(buffer[0]).toBe(entry)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('oldest entries are discarded first when buffer exceeds capacity', () => {
    fc.assert(
      fc.property(
        fc.array(logEntryArb, { minLength: MAX_ENTRIES + 1, maxLength: 1000 }),
        (entries) => {
          let buffer = []

          for (const entry of entries) {
            buffer = addLogEntry(buffer, entry)
          }

          // Buffer should be exactly at MAX_ENTRIES since we added more than that
          expect(buffer.length).toBe(MAX_ENTRIES)

          // The buffer should contain the last MAX_ENTRIES entries added (newest first)
          const expectedEntries = entries.slice(-MAX_ENTRIES).reverse()
          for (let i = 0; i < MAX_ENTRIES; i++) {
            expect(buffer[i]).toBe(expectedEntries[i])
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('buffer with fewer than 500 entries grows by exactly 1 per addition', () => {
    fc.assert(
      fc.property(
        fc.array(logEntryArb, { minLength: 0, maxLength: MAX_ENTRIES - 1 }),
        logEntryArb,
        (initialEntries, newEntry) => {
          // Build a buffer under capacity
          let buffer = []
          for (const entry of initialEntries) {
            buffer = addLogEntry(buffer, entry)
          }
          const sizeBefore = buffer.length

          // Add one more entry (still under or at capacity)
          buffer = addLogEntry(buffer, newEntry)

          if (sizeBefore < MAX_ENTRIES) {
            expect(buffer.length).toBe(sizeBefore + 1)
          } else {
            expect(buffer.length).toBe(MAX_ENTRIES)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('empty buffer accepts first entry correctly', () => {
    fc.assert(
      fc.property(logEntryArb, (entry) => {
        const buffer = addLogEntry([], entry)
        expect(buffer.length).toBe(1)
        expect(buffer[0]).toBe(entry)
      }),
      { numRuns: 100 }
    )
  })
})
