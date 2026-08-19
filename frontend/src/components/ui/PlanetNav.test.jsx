/**
 * Property-based test for PlanetNav active planet indicator correctness.
 *
 * Feature: responsive-pwa-layout, Property 6: Active Planet Indicator Correctness
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import React from 'react'
import { render, cleanup } from '@testing-library/react'

// Planet data (static import to get the colors)
import { PLANETS } from '../../data/planets.js'

// ── Store mock state (mutable so we can change selectedPlanet per iteration) ──
let mockSelectedPlanet = null

// Mock the Zustand store
vi.mock('../../store/useAppStore', () => {
  const useAppStore = () => ({
    get selectedPlanet() { return mockSelectedPlanet },
    setSelectedPlanet: vi.fn(),
  })

  return { default: useAppStore }
})

// Mock the device module to simulate mobile viewport
vi.mock('../../lib/device', () => ({
  useIsSmallScreen: () => true,
  isMobile: true,
  isSmallScreen: true,
}))

// Mock the viewport module for orientation (portrait mode for mobile nav bar)
vi.mock('../../lib/viewport', () => ({
  useOrientation: () => ({ isLandscape: false, isPortrait: true }),
  useBodyLock: vi.fn(),
  initViewportProperties: vi.fn(),
}))

// Import the component under test AFTER mocks are set up
import PlanetNav from './PlanetNav.jsx'

/**
 * Convert a hex color string to rgb() format for comparison with computed styles.
 * jsdom normalizes inline style colors from hex to rgb().
 * @param {string} hex - e.g. '#f59e0b'
 * @returns {string} - e.g. 'rgb(245, 158, 11)'
 */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}

describe('Feature: responsive-pwa-layout, Property 6: Active Planet Indicator Correctness', () => {
  beforeEach(() => {
    // Simulate mobile viewport width
    Object.defineProperty(window, 'innerWidth', {
      value: 375,
      writable: true,
      configurable: true,
    })

    // Mock matchMedia for the useIsNarrow hook inside PlanetNav
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false, // Not narrow (>= 380px)
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }))
  })

  afterEach(() => {
    cleanup()
    mockSelectedPlanet = null
  })

  /**
   * **Validates: Requirements 9.3**
   *
   * Property 6: Active Planet Indicator Correctness
   * For any selected planet from the set of 7 planets, the Planet_Nav active
   * button SHALL have a 2px bottom border whose color matches that planet's
   * configured accent color (as defined in planets.js), and all other buttons
   * SHALL NOT have this border.
   */
  it('active planet button has correct accent color border and others do not', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...PLANETS),
        (planet) => {
          // Set the selected planet in the mocked store
          mockSelectedPlanet = planet

          const { container } = render(<PlanetNav />)

          // Get all nav buttons
          const buttons = container.querySelectorAll('button')

          // Verify we have buttons for all planets
          expect(buttons.length).toBe(PLANETS.length)

          buttons.forEach((button) => {
            const borderBottom = button.style.borderBottom
            const ariaLabel = button.getAttribute('aria-label')

            // Determine which planet this button corresponds to
            const matchedPlanet = PLANETS.find(
              (p) => ariaLabel === `Focus on ${p.label} planet`
            )
            expect(matchedPlanet).toBeDefined()

            if (matchedPlanet.id === planet.id) {
              // Active button: should have 2px solid ${planet.color} border-bottom
              // jsdom normalizes hex colors to rgb() format
              const expectedColor = hexToRgb(planet.color)
              expect(borderBottom).toBe(`2px solid ${expectedColor}`)
            } else {
              // Inactive buttons: should have transparent border (no accent color)
              expect(borderBottom).toBe('2px solid transparent')
            }
          })

          // Cleanup render for next iteration
          cleanup()
        }
      ),
      { numRuns: 100 }
    )
  })
})


// ─────────────────────────────────────────────────────────────────────────────
// Property 7: Planet Label Abbreviation Fits Viewport
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abbreviated labels for narrow viewports (< 380px).
 * Copied from PlanetNav.jsx for pure logic testing.
 */
const NARROW_LABELS = {
  joy: 'Joy',
  vent: 'Vent',
  advice: 'Advice',
  grief: 'Grief',
  anxiety: 'Anx',
  neutral: 'Reflect',
  doodle: 'Doodle',
}

const PLANET_IDS = Object.keys(NARROW_LABELS)

/**
 * Estimate button width for a given label.
 * Each button uses px-3 (12px each side = 24px padding) + text.
 * At 10px font, each char is approximately 6px wide.
 * Minimum button width is 44px (tap target).
 */
function estimateButtonWidth(label) {
  const HORIZONTAL_PADDING = 24 // px-3 = 12px each side
  const CHAR_WIDTH = 6 // approx 6px per char at 10px font
  const MIN_WIDTH = 44 // minimum tap target

  const textWidth = label.length * CHAR_WIDTH
  return Math.max(MIN_WIDTH, textWidth + HORIZONTAL_PADDING)
}

describe('Feature: responsive-pwa-layout, Property 7: Planet Label Abbreviation Fits Viewport', () => {
  /**
   * **Validates: Requirements 9.5**
   *
   * Property 7: Planet Label Abbreviation Fits Viewport
   * For any planet in the set of 7, when viewport width is below 380px,
   * the abbreviated label SHALL be at most 7 characters long, and at least
   * 4 complete button labels SHALL fit within 380px of horizontal space
   * without overflow.
   */
  it('abbreviated labels are at most 7 characters long', () => {
    const planetArb = fc.constantFrom(...PLANET_IDS)

    fc.assert(
      fc.property(planetArb, (planetId) => {
        const label = NARROW_LABELS[planetId]
        expect(label.length).toBeLessThanOrEqual(7)
      }),
      { numRuns: 100 }
    )
  })

  it('at least 4 buttons fit within 380px of horizontal space', () => {
    // Generate all possible subsets of 4 planets from the 7 available
    const fourPlanetsArb = fc.shuffledSubarray(PLANET_IDS, { minLength: 4, maxLength: 4 })

    fc.assert(
      fc.property(fourPlanetsArb, (selectedPlanets) => {
        const totalWidth = selectedPlanets.reduce((sum, planetId) => {
          return sum + estimateButtonWidth(NARROW_LABELS[planetId])
        }, 0)

        // 4 buttons + gaps (gap-1 = 4px between each, so 3 gaps for 4 buttons)
        const GAP = 4
        const totalWithGaps = totalWidth + (selectedPlanets.length - 1) * GAP

        // Plus container padding (px-2 = 8px each side = 16px)
        const CONTAINER_PADDING = 16
        const totalRequired = totalWithGaps + CONTAINER_PADDING

        expect(totalRequired).toBeLessThanOrEqual(380)
      }),
      { numRuns: 100 }
    )
  })
})
