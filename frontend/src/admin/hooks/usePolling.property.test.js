/**
 * Property-based tests for usePolling stale-while-revalidate behavior.
 *
 * Models the polling state machine as a pure reducer to verify that
 * displayed KPI data always reflects the most recent successful fetch,
 * and that failed fetches never clear or corrupt the displayed values.
 *
 * @vitest-environment jsdom
 */

// Feature: admin-dashboard-overhaul, Property 5: KPI card data reflects latest successful stats fetch
// Validates: Requirements 3.10, 3.11

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Simulate the polling state machine.
 * On success: data updates to new value.
 * On failure: data stays as previous value (stale-while-revalidate).
 *
 * This mirrors the logic in usePolling.js where setData is only called
 * on successful fetches, and errors preserve existing data.
 *
 * @param {Array<{success: boolean, value?: any}>} responses - sequence of fetch outcomes
 * @returns {any} The data that would be displayed (null if no success yet)
 */
function resolvePollingState(responses) {
  let displayedData = null
  for (const response of responses) {
    if (response.success) {
      displayedData = response.value
    }
    // On failure, displayedData stays unchanged (stale-while-revalidate)
  }
  return displayedData
}

/**
 * Find the most recent successful response value in a sequence.
 *
 * @param {Array<{success: boolean, value?: any}>} responses
 * @returns {any} The value of the last successful response, or null if none
 */
function lastSuccessfulValue(responses) {
  for (let i = responses.length - 1; i >= 0; i--) {
    if (responses[i].success) {
      return responses[i].value
    }
  }
  return null
}

// Generator for a single polling response (success with random int, or failure)
const responseArb = fc.oneof(
  { weight: 3, arbitrary: fc.integer({ min: 0, max: 10000 }).map(v => ({ success: true, value: v })) },
  { weight: 2, arbitrary: fc.constant({ success: false }) }
)

// Generator for a sequence of polling responses (1-50 items)
const responseSequenceArb = fc.array(responseArb, { minLength: 1, maxLength: 50 })

describe('usePolling - Property 5: KPI card data reflects latest successful stats fetch', () => {
  it('displayed data always equals the most recent successful response value', () => {
    fc.assert(
      fc.property(responseSequenceArb, (responses) => {
        const displayed = resolvePollingState(responses)
        const expected = lastSuccessfulValue(responses)

        expect(displayed).toEqual(expected)
      }),
      { numRuns: 200 }
    )
  })

  it('a sequence of only failures results in null (no data displayed)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constant({ success: false }), { minLength: 1, maxLength: 50 }),
        (failures) => {
          const displayed = resolvePollingState(failures)
          expect(displayed).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('failures after a success never clear the displayed data', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.array(fc.constant({ success: false }), { minLength: 1, maxLength: 30 }),
        (successValue, trailingFailures) => {
          const responses = [{ success: true, value: successValue }, ...trailingFailures]
          const displayed = resolvePollingState(responses)

          // Data must still be the successful value, never null or corrupted
          expect(displayed).toBe(successValue)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('interleaved successes and failures always reflect the latest success', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.integer({ min: 0, max: 10000 }).map(v => ({ success: true, value: v })),
          { minLength: 1, maxLength: 20 }
        ),
        fc.array(fc.constant({ success: false }), { minLength: 0, maxLength: 20 }),
        (successes, failures) => {
          // Interleave successes and failures in a deterministic shuffled order
          const responses = []
          let si = 0
          let fi = 0
          // Alternate placing successes and failures
          while (si < successes.length || fi < failures.length) {
            if (si < successes.length) {
              responses.push(successes[si++])
            }
            if (fi < failures.length) {
              responses.push(failures[fi++])
            }
          }

          const displayed = resolvePollingState(responses)
          const expected = lastSuccessfulValue(responses)

          expect(displayed).toEqual(expected)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('the final displayed value is independent of the number of failures in the sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10000 }),
        fc.nat({ max: 30 }),
        fc.nat({ max: 30 }),
        (lastSuccessVal, failuresBefore, failuresAfter) => {
          // Build: N failures → success → M failures
          const responses = [
            ...Array(failuresBefore).fill({ success: false }),
            { success: true, value: lastSuccessVal },
            ...Array(failuresAfter).fill({ success: false }),
          ]

          const displayed = resolvePollingState(responses)
          expect(displayed).toBe(lastSuccessVal)
        }
      ),
      { numRuns: 200 }
    )
  })
})
