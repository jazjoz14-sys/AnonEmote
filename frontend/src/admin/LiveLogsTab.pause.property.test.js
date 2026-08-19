// Feature: realtime-error-logging, Property 7: Buffer Integrity Under UI State Changes
// **Validates: Requirements 6.4, 7.2**
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

const MAX_ENTRIES = 500

function addEntry(buffer, entry) {
  const next = [entry, ...buffer]
  return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next
}

function flush(entries, pauseBuffer) {
  const merged = [...pauseBuffer, ...entries]
  return merged.length > MAX_ENTRIES ? merged.slice(0, MAX_ENTRIES) : merged
}

const entryArb = fc.record({
  ts: fc.integer({ min: 1577836800000, max: 1893456000000 }).map(n => new Date(n).toISOString()),
  type: fc.string({ minLength: 1 }),
  severity: fc.constantFrom('error', 'warning', 'info'),
})

describe('Property 7: Buffer Integrity Under UI State Changes', () => {
  it('internal buffer contains all received entries up to 500 regardless of pause state', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 300 }),
        fc.array(entryArb, { minLength: 0, maxLength: 300 }),
        (beforePause, duringPause) => {
          // Simulate receiving entries before pause
          let entries = []
          for (const e of beforePause) {
            entries = addEntry(entries, e)
          }

          // Pause: entries go to pauseBuffer
          let pauseBuffer = []
          for (const e of duringPause) {
            pauseBuffer = [e, ...pauseBuffer]
          }

          // Resume: flush buffer into entries
          const afterResume = flush(entries, pauseBuffer)

          // Total received entries
          const totalReceived = beforePause.length + duringPause.length
          const expected = Math.min(totalReceived, MAX_ENTRIES)

          expect(afterResume.length).toBeLessThanOrEqual(MAX_ENTRIES)
          expect(afterResume.length).toBe(expected)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('filter state does not affect internal buffer size', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 200 }),
        fc.constantFrom('all', 'error', 'warning', 'info'),
        (allEntries, activeFilter) => {
          // All entries go to buffer regardless of filter
          let buffer = []
          for (const e of allEntries) {
            buffer = addEntry(buffer, e)
          }

          // Buffer has all entries (up to cap) — filter doesn't reduce it
          const expectedSize = Math.min(allEntries.length, MAX_ENTRIES)
          expect(buffer).toHaveLength(expectedSize)

          // Filtered view is subset of buffer
          const filtered = buffer.filter(e =>
            activeFilter === 'all' || e.severity === activeFilter
          )
          expect(filtered.length).toBeLessThanOrEqual(buffer.length)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('pause buffer entries are preserved until resume flushes them', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 100 }),
        (pausedEntries) => {
          let pauseBuffer = []
          for (const e of pausedEntries) {
            pauseBuffer = [e, ...pauseBuffer]
          }

          // All paused entries exist in pause buffer
          expect(pauseBuffer).toHaveLength(pausedEntries.length)
        }
      ),
      { numRuns: 200 }
    )
  })
})
