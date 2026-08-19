/**
 * Property-based tests for body scroll lock toggle.
 *
 * Feature: responsive-pwa-layout, Property 11: Body Scroll Lock Toggle
 *
 * For any bottom sheet open/close sequence, verify body overflow is 'hidden'
 * while ≥ 1 sheet is open, and restored within 100ms when all close.
 *
 * **Validates: Requirements 15.2**
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { acquireBodyLock, releaseBodyLock, _resetBodyLock } from './viewport.js'

describe('Feature: responsive-pwa-layout, Property 11: Body Scroll Lock Toggle', () => {
  beforeEach(() => {
    _resetBodyLock()
    document.body.style.overflow = ''
  })

  /**
   * **Validates: Requirements 15.2**
   *
   * Property 11: Body Scroll Lock Toggle
   * For any sequence of open/close events across 1–5 bottom sheets,
   * body.overflow === 'hidden' whenever at least one sheet is open,
   * and body.overflow is restored to its original value when all sheets close.
   */
  it('body overflow is hidden while ≥ 1 sheet open, restored when all close', () => {
    fc.assert(
      fc.property(
        // Generate a random initial overflow value (simulates pre-existing style)
        fc.constantFrom('', 'auto', 'scroll', 'visible'),
        // Generate a sequence of operations: [sheetIndex, action]
        // where action is 'open' or 'close' for sheets 0–4 (up to 5 sheets)
        fc.array(
          fc.record({
            sheet: fc.integer({ min: 0, max: 4 }),
            action: fc.constantFrom('open', 'close'),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (initialOverflow, operations) => {
          // Reset state for this iteration
          _resetBodyLock()
          document.body.style.overflow = initialOverflow

          // Track which sheets are currently open (simulating the reference counter)
          const openSheets = new Set()

          for (const op of operations) {
            if (op.action === 'open' && !openSheets.has(op.sheet)) {
              openSheets.add(op.sheet)
              acquireBodyLock()
            } else if (op.action === 'close' && openSheets.has(op.sheet)) {
              openSheets.delete(op.sheet)
              releaseBodyLock()
            }
            // Skip no-op (closing already closed, opening already open)

            // Invariant check after each operation:
            if (openSheets.size > 0) {
              // At least one sheet open → body must be locked
              expect(document.body.style.overflow).toBe('hidden')
            } else {
              // All sheets closed → body overflow must be restored to initial value
              expect(document.body.style.overflow).toBe(initialOverflow)
            }
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  /**
   * **Validates: Requirements 15.2**
   *
   * Verifies that the restoration happens synchronously (well within 100ms)
   * by checking overflow is correct immediately after the final release.
   * Uses sequences that always end with all sheets closed.
   */
  it('overflow restored immediately (< 100ms) when all sheets close', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', 'auto', 'scroll', 'visible'),
        // Generate number of sheets to open (1-5)
        fc.integer({ min: 1, max: 5 }),
        (initialOverflow, sheetCount) => {
          _resetBodyLock()
          document.body.style.overflow = initialOverflow

          // Open all sheets
          for (let i = 0; i < sheetCount; i++) {
            acquireBodyLock()
          }

          // Body must be locked
          expect(document.body.style.overflow).toBe('hidden')

          // Close all sheets — measure time
          const start = performance.now()
          for (let i = 0; i < sheetCount; i++) {
            releaseBodyLock()
          }
          const elapsed = performance.now() - start

          // Overflow must be restored to initial value
          expect(document.body.style.overflow).toBe(initialOverflow)

          // Restoration must be synchronous (well within 100ms)
          expect(elapsed).toBeLessThan(100)
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 15.2**
   *
   * Extra releases (more closes than opens) should not corrupt state —
   * lockCount floors at 0 and overflow remains at initial value.
   */
  it('extra releases do not corrupt overflow state', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('', 'auto', 'scroll', 'visible'),
        fc.integer({ min: 1, max: 5 }),  // sheets to open
        fc.integer({ min: 1, max: 3 }),  // extra releases beyond balance
        (initialOverflow, openCount, extraReleases) => {
          _resetBodyLock()
          document.body.style.overflow = initialOverflow

          // Open sheets
          for (let i = 0; i < openCount; i++) {
            acquireBodyLock()
          }
          expect(document.body.style.overflow).toBe('hidden')

          // Close all sheets
          for (let i = 0; i < openCount; i++) {
            releaseBodyLock()
          }
          expect(document.body.style.overflow).toBe(initialOverflow)

          // Extra releases should not break anything
          for (let i = 0; i < extraReleases; i++) {
            releaseBodyLock()
          }
          // Overflow should still be at initial value (not corrupted)
          expect(document.body.style.overflow).toBe(initialOverflow)
        }
      ),
      { numRuns: 100 }
    )
  })
})
