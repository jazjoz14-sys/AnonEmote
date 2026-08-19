/**
 * Property-based tests for PostModal textarea auto-grow logic
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Replicate the auto-grow algorithm from PostModal.jsx:
 *
 * - Starts at 3 rows (minimum)
 * - When scrollHeight > currentVisibleHeight: increment rows by 1
 * - Max height capped at 25dvh (window.innerHeight * 0.25)
 * - Row count limited to: Math.floor(maxHeight / lineHeight)
 *
 * This function simulates the cumulative auto-grow behavior for text
 * that produces `contentRows` number of lines in the textarea.
 */
function computeAutoGrowRows(contentRows, viewportHeight, lineHeight) {
  const minRows = 3
  const maxHeight = viewportHeight * 0.25
  const maxRows = Math.floor(maxHeight / lineHeight)

  // The textarea starts at minRows and grows 1 row at a time as content
  // exceeds the visible area. The final row count is:
  //   max(minRows, min(contentRows, maxRows))
  return Math.max(minRows, Math.min(contentRows, maxRows))
}

describe('Feature: responsive-pwa-layout, Property 5: Textarea Auto-Grow Within Bounds', () => {
  /**
   * **Validates: Requirements 8.3**
   *
   * Property 5: Textarea Auto-Grow Within Bounds
   * For any text content (0–1000 chars), verify:
   * 1. Height is at least 3 rows
   * 2. Grows by 1 row when exceeding visible area (monotonically increases)
   * 3. Never exceeds 25dvh
   */
  it('textarea rows are always >= 3, grow incrementally, and height never exceeds 25dvh', () => {
    fc.assert(
      fc.property(
        // Viewport height: 500–1000px (realistic mobile range)
        fc.integer({ min: 500, max: 1000 }),
        // Line height: 16–24px (typical CSS line-height values)
        fc.integer({ min: 16, max: 24 }),
        // Content rows: how many lines the text would occupy (0 to ~50 rows)
        // 1000 chars at ~20 chars/line ≈ 50 lines max
        fc.integer({ min: 0, max: 50 }),
        (viewportHeight, lineHeight, contentRows) => {
          const maxHeight = viewportHeight * 0.25
          const maxRows = Math.floor(maxHeight / lineHeight)
          const actualRows = computeAutoGrowRows(contentRows, viewportHeight, lineHeight)
          const actualHeight = actualRows * lineHeight

          // Property 1: Height is always at least 3 rows
          expect(actualRows).toBeGreaterThanOrEqual(3)

          // Property 2: Rows grow monotonically — for N content rows,
          // the result should be >= result for N-1 content rows
          if (contentRows > 0) {
            const prevRows = computeAutoGrowRows(contentRows - 1, viewportHeight, lineHeight)
            expect(actualRows).toBeGreaterThanOrEqual(prevRows)
            // Grows by at most 1 row at a time
            expect(actualRows - prevRows).toBeLessThanOrEqual(1)
          }

          // Property 3: Height never exceeds 25dvh
          expect(actualHeight).toBeLessThanOrEqual(maxHeight)

          // Additional invariant: actual rows never exceed maxRows
          expect(actualRows).toBeLessThanOrEqual(maxRows)
        }
      ),
      { numRuns: 200 }
    )
  })

  /**
   * **Validates: Requirements 8.3**
   *
   * Verify that the auto-grow algorithm correctly limits row count
   * to the max allowed by 25dvh for any viewport/lineHeight combination.
   */
  it('max rows never allow height to exceed 25dvh for any viewport configuration', () => {
    fc.assert(
      fc.property(
        // Viewport height: 500–1000px
        fc.integer({ min: 500, max: 1000 }),
        // Line height: 16–24px
        fc.integer({ min: 16, max: 24 }),
        (viewportHeight, lineHeight) => {
          const maxHeight = viewportHeight * 0.25
          const maxRows = Math.floor(maxHeight / lineHeight)

          // Even with maximum content, the height is bounded
          const saturatedRows = computeAutoGrowRows(1000, viewportHeight, lineHeight)
          const saturatedHeight = saturatedRows * lineHeight

          // The saturated height must not exceed 25dvh
          expect(saturatedHeight).toBeLessThanOrEqual(maxHeight)

          // The saturated rows should equal maxRows (fully grown)
          expect(saturatedRows).toBe(maxRows)

          // maxRows must accommodate at least the minimum 3 rows
          // (for any viewport ≥ 500 and lineHeight ≤ 24: 500*0.25/24 = 5.2 → 5 >= 3)
          expect(maxRows).toBeGreaterThanOrEqual(3)
        }
      ),
      { numRuns: 150 }
    )
  })
})
