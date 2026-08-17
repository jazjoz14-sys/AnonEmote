/**
 * Bug Condition Exploration Test: markDbUnavailable
 *
 * **Validates: Requirements 1.9**
 *
 * Bug: markDbUnavailable() calls itself recursively, causing a stack overflow.
 * Expected: It should set the dbUnavailable flag without infinite recursion.
 *
 * This test is EXPECTED TO FAIL on unfixed code (proves bug exists).
 */
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const storagePath = resolve(__dirname, 'storage.js')
const source = readFileSync(storagePath, 'utf8')

describe('Bug Condition: markDbUnavailable recursive call (Bug #9)', () => {
  it('markDbUnavailable should set flag directly without recursive self-call', () => {
    /**
     * **Validates: Requirements 1.9**
     *
     * The function body should assign `dbUnavailable = true` directly,
     * NOT call `markDbUnavailable()` recursively.
     *
     * On unfixed code: the function body contains `markDbUnavailable()`
     * which causes infinite recursion → stack overflow.
     */

    // Extract the markDbUnavailable function body
    const fnMatch = source.match(/function markDbUnavailable\(\)\s*\{([\s\S]*?)\n\}/)
    expect(fnMatch).not.toBeNull()

    const fnBody = fnMatch[1]

    // Check if the function contains a recursive call to itself
    // On unfixed code, the FIRST statement is markDbUnavailable() — a recursive call
    const hasRecursiveCall = /\bmarkDbUnavailable\(\)/.test(fnBody)

    // The function should NOT call itself recursively
    // On unfixed code: this will FAIL because it DOES have markDbUnavailable() in the body
    expect(hasRecursiveCall).toBe(false)
  })

  it('markDbUnavailable should contain direct assignment dbUnavailable = true', () => {
    /**
     * **Validates: Requirements 1.9**
     *
     * The correct implementation sets the flag directly:
     *   dbUnavailable = true
     *
     * On unfixed code: it calls markDbUnavailable() instead.
     */
    const fnMatch = source.match(/function markDbUnavailable\(\)\s*\{([\s\S]*?)\n\}/)
    expect(fnMatch).not.toBeNull()

    const fnBody = fnMatch[1]

    // Should contain direct assignment
    const hasDirectAssignment = /dbUnavailable\s*=\s*true/.test(fnBody)

    // On unfixed code: this will FAIL because the body has markDbUnavailable() not dbUnavailable = true
    expect(hasDirectAssignment).toBe(true)
  })

  it('property: for any number of calls, markDbUnavailable must not recurse', () => {
    /**
     * **Validates: Requirements 1.9**
     *
     * Property: For any invocation count (1-100), the function should complete
     * without causing a stack overflow.
     */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (callCount) => {
          // Extract and analyze the function
          const fnMatch = source.match(/function markDbUnavailable\(\)\s*\{([\s\S]*?)\n\}/)
          if (!fnMatch) throw new Error('markDbUnavailable not found in source')

          const fnBody = fnMatch[1]
          const hasRecursiveCall = /\bmarkDbUnavailable\(\)/.test(fnBody)

          if (hasRecursiveCall) {
            throw new Error(
              `markDbUnavailable contains recursive self-call. ` +
              `Calling it ${callCount} time(s) would cause stack overflow. ` +
              `Found in body: ${fnBody.trim()}`
            )
          }
        }
      )
    )
  })
})
