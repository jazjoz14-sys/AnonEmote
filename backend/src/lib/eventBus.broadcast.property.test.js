// Feature: realtime-error-logging, Property 1: Event Bus Broadcast Integrity
import { describe, it, expect, afterEach } from 'vitest'
import * as fc from 'fast-check'
import bus, { emitAudit, onAudit, offAudit, classifySeverity } from './eventBus.js'

/**
 * Validates: Requirements 1.1
 *
 * Property 1: Event Bus Broadcast Integrity
 * For any valid audit entry and N registered listeners (1–10),
 * all listeners receive the entry with severity added.
 */
describe('Property 1: Event Bus Broadcast Integrity', () => {
  afterEach(() => {
    bus.removeAllListeners('audit')
  })

  it('for any valid entry and N listeners (1-10), all listeners receive the entry with severity', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.string({ minLength: 1 }),
          ts: fc.string({ minLength: 1 }),
        }),
        fc.integer({ min: 1, max: 10 }),
        (entry, listenerCount) => {
          const received = Array.from({ length: listenerCount }, () => [])
          const listeners = received.map((arr) => (e) => arr.push(e))

          // Register all listeners
          listeners.forEach((l) => onAudit(l))

          // Emit the entry
          emitAudit(entry)

          // All listeners should have received exactly one entry
          for (const arr of received) {
            expect(arr).toHaveLength(1)
            expect(arr[0].type).toBe(entry.type)
            expect(arr[0].ts).toBe(entry.ts)
            expect(arr[0].severity).toBe(classifySeverity(entry.type))
          }

          // Cleanup
          listeners.forEach((l) => offAudit(l))
        }
      ),
      { numRuns: 200 }
    )
  })

  it('emitted entry always has severity field added', () => {
    fc.assert(
      fc.property(
        fc.record({
          type: fc.string(),
          ts: fc.integer({ min: 946684800000, max: 1924905600000 }).map((n) => new Date(n).toISOString()),
          payload: fc.object(),
        }),
        (entry) => {
          let received = null
          const listener = (e) => {
            received = e
          }
          onAudit(listener)

          emitAudit(entry)

          expect(received).not.toBeNull()
          expect(received.severity).toBeDefined()
          expect(['error', 'warning', 'info']).toContain(received.severity)

          offAudit(listener)
        }
      ),
      { numRuns: 200 }
    )
  })
})
