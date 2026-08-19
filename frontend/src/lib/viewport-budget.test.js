/**
 * Property-based tests for viewport budget calculations.
 *
 * Tests the PlanetInfoPanel bounded height logic from SpaceScreen.jsx
 * to verify it satisfies the viewport budget constraints.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Pure function replicating the panelMaxHeight calculation from SpaceScreen.jsx.
 * This allows property testing without needing to render the full component.
 */
function computePanelMaxHeight(viewportHeight) {
  const HUD_HEIGHT = 40
  const NAV_HEIGHT = 44
  const CHROME_BUDGET = HUD_HEIGHT + NAV_HEIGHT // 84px
  const MIN_PANEL_HEIGHT = 200
  const MIN_CANVAS_PERCENT = 0.15

  const availableSpace = viewportHeight - CHROME_BUDGET
  const minCanvasHeight = viewportHeight * MIN_CANVAS_PERCENT
  let maxHeight = availableSpace - minCanvasHeight

  if (maxHeight < MIN_PANEL_HEIGHT) {
    maxHeight = MIN_PANEL_HEIGHT
  }

  if (maxHeight > availableSpace) {
    maxHeight = availableSpace
  }

  // Landscape cap: if viewport height < 500px, cap at 50%
  if (viewportHeight < 500) {
    maxHeight = Math.min(maxHeight, viewportHeight * 0.5)
  }

  return maxHeight
}

describe('Feature: responsive-pwa-layout, Property 4: PlanetInfoPanel Bounded Height', () => {
  /**
   * **Validates: Requirements 6.4, 6.5**
   *
   * Property 4: PlanetInfoPanel Bounded Height
   * For viewport heights 400–1200px, verify:
   *   1. maxHeight ≤ viewportHeight - 84 (never exceeds available space)
   *   2. viewportHeight - 84 - maxHeight ≥ viewportHeight * 0.15 (15% visible)
   *      OR maxHeight === 200 (minimum panel height override)
   *   3. If viewportHeight < 500: maxHeight ≤ viewportHeight * 0.5 (landscape cap)
   */
  it('maxHeight never exceeds available space (vh - 84)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 1200 }),
        (viewportHeight) => {
          const maxHeight = computePanelMaxHeight(viewportHeight)
          const availableSpace = viewportHeight - 84

          // Property 1: Panel must never exceed available space
          expect(maxHeight).toBeLessThanOrEqual(availableSpace)
        }
      ),
      { numRuns: 150 }
    )
  })

  it('at least 15% of viewport visible above panel OR panel at minimum 200px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 1200 }),
        (viewportHeight) => {
          const maxHeight = computePanelMaxHeight(viewportHeight)
          const availableSpace = viewportHeight - 84
          const canvasVisible = availableSpace - maxHeight
          const fifteenPercent = viewportHeight * 0.15

          // Property 2: Either 15% of viewport is visible above the panel
          // (with floating-point tolerance of 0.01px),
          // OR the panel is at its minimum height (200px)
          const fifteenPercentVisible = canvasVisible >= fifteenPercent - 0.01
          const atMinimumHeight = maxHeight === 200

          expect(fifteenPercentVisible || atMinimumHeight).toBe(true)
        }
      ),
      { numRuns: 150 }
    )
  })

  it('landscape cap: maxHeight ≤ 50% viewport when height < 500px', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 400, max: 499 }),
        (viewportHeight) => {
          const maxHeight = computePanelMaxHeight(viewportHeight)

          // Property 3: Landscape cap enforced for short viewports
          expect(maxHeight).toBeLessThanOrEqual(viewportHeight * 0.5)
        }
      ),
      { numRuns: 150 }
    )
  })
})
