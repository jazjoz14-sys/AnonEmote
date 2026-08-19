/**
 * Property-based tests for viewport.js
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { initViewportProperties } from './viewport.js'

describe('Feature: responsive-pwa-layout, Property 3: Viewport Budget Constraint', () => {
  let cleanup

  beforeEach(() => {
    // Reset root inline styles before each test
    document.documentElement.style.cssText = ''
  })

  afterEach(() => {
    if (cleanup) {
      cleanup()
      cleanup = null
    }
    document.documentElement.style.cssText = ''
  })

  /**
   * **Validates: Requirements 6.1**
   *
   * Property 3: Viewport Budget Constraint
   * For any mobile viewport width < 768px, the sum of --hud-height and
   * --nav-height must not exceed 84px (excluding safe-area insets).
   */
  it('HUD + Nav heights sum ≤ 84px for all mobile viewport widths (< 768px)', () => {
    fc.assert(
      fc.property(
        // Generate mobile viewport widths: 280px to 767px
        fc.integer({ min: 280, max: 767 }),
        // Also vary the viewport height to ensure it doesn't affect the budget
        fc.integer({ min: 300, max: 2000 }),
        (width, height) => {
          // Mock window dimensions
          Object.defineProperty(window, 'innerWidth', {
            value: width,
            writable: true,
            configurable: true,
          })
          Object.defineProperty(window, 'innerHeight', {
            value: height,
            writable: true,
            configurable: true,
          })

          // Run viewport initialization
          cleanup = initViewportProperties()

          // Read the CSS custom properties from :root
          const root = document.documentElement
          const hudHeight = parseInt(root.style.getPropertyValue('--hud-height'), 10)
          const navHeight = parseInt(root.style.getPropertyValue('--nav-height'), 10)

          // Assert both are valid numbers
          expect(hudHeight).not.toBeNaN()
          expect(navHeight).not.toBeNaN()

          // Core property: sum must not exceed 84px
          const totalChrome = hudHeight + navHeight
          expect(totalChrome).toBeLessThanOrEqual(84)

          // Clean up for next iteration
          cleanup()
          cleanup = null
        }
      ),
      { numRuns: 100 }
    )
  })
})
