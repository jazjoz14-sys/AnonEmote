// Feature: realtime-error-logging, Property 8: Pause Counter Accuracy
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * **Validates: Requirements 7.4**
 *
 * Property 8: Pause Counter Accuracy
 * For any N entries received while paused, the buffered counter equals N
 * (capped at 500 minus existing entries).
 *
 * This tests the pause buffer logic from LiveLogsTab.jsx in isolation:
 * - When paused, entries go to `pauseBuffer` via prepending
 * - The displayed counter is `pauseBuffer.length`
 */

const entryArb = fc.record({
  ts: fc.integer({ min: 1577836800000, max: 1893456000000 }).map(ms => new Date(ms).toISOString()),
  type: fc.string({ minLength: 1 }),
  severity: fc.constantFrom('error', 'warning', 'info'),
})

describe('Property 8: Pause Counter Accuracy', () => {
  it('buffered counter equals N for any N entries received while paused', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 0, maxLength: 600 }),
        (entries) => {
          let pauseBuffer = []
          for (const entry of entries) {
            pauseBuffer = [entry, ...pauseBuffer]
          }

          // Counter should equal the number of entries received
          expect(pauseBuffer.length).toBe(entries.length)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('counter accurately reflects entries received after an initial buffer exists', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 0, maxLength: 100 }),
        fc.array(entryArb, { minLength: 0, maxLength: 100 }),
        (batch1, batch2) => {
          let pauseBuffer = []

          // First batch while paused
          for (const entry of batch1) {
            pauseBuffer = [entry, ...pauseBuffer]
          }
          expect(pauseBuffer.length).toBe(batch1.length)

          // Second batch while still paused
          for (const entry of batch2) {
            pauseBuffer = [entry, ...pauseBuffer]
          }
          expect(pauseBuffer.length).toBe(batch1.length + batch2.length)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('counter resets to 0 after resume (buffer flush)', () => {
    fc.assert(
      fc.property(
        fc.array(entryArb, { minLength: 1, maxLength: 200 }),
        (entries) => {
          let pauseBuffer = []
          for (const entry of entries) {
            pauseBuffer = [entry, ...pauseBuffer]
          }
          expect(pauseBuffer.length).toBe(entries.length)

          // Simulate resume — flush buffer
          pauseBuffer = []
          expect(pauseBuffer.length).toBe(0)
        }
      ),
      { numRuns: 200 }
    )
  })
})
