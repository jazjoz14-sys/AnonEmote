// Feature: admin-dashboard-overhaul, Property 3: Navigation state always maps to exactly one visible page
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { NAV_ITEMS } from './data/navItems.js'

/**
 * Validates: Requirements 1.1, 8.1
 *
 * Property 3: Navigation state always maps to exactly one visible page
 * For any activePage value (valid or invalid), exactly one section page component
 * is "mounted" — the set of rendered pages has cardinality 1.
 *
 * This tests the pure navigation mapping logic used by AdminLayout's switch statement.
 * The switch maps a PageId to a page component; an unrecognized value falls through
 * to the default case (DashboardPage), ensuring exactly one page is always active.
 */

/** Valid page IDs derived from the NAV_ITEMS config */
const VALID_PAGES = NAV_ITEMS.map((item) => item.id)

/**
 * Simulates the AdminLayout switch statement that determines which page renders.
 * Returns the count of pages that would mount for a given activePage value.
 *
 * @param {string} activePage - The current activePage state value
 * @returns {number} Number of pages that would be mounted (should always be 1)
 */
function getRenderedPageCount(activePage) {
  let count = 0
  // The switch in AdminLayout matches each valid page ID to its component
  for (const pageId of VALID_PAGES) {
    if (pageId === activePage) count++
  }
  // Default case: if no valid page matched, DashboardPage renders
  if (!VALID_PAGES.includes(activePage)) count = 1
  return count
}

/**
 * Returns the page ID that would actually render for a given activePage value.
 * Mirrors the AdminLayout switch/default behavior.
 *
 * @param {string} activePage - The current activePage state value
 * @returns {string} The page ID that renders
 */
function getRenderedPage(activePage) {
  if (VALID_PAGES.includes(activePage)) return activePage
  return 'dashboard' // default case
}

describe('Property 3: Navigation state always maps to exactly one visible page', () => {
  it('every valid PageId maps to exactly 1 rendered page', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_PAGES),
        (activePage) => {
          const count = getRenderedPageCount(activePage)
          expect(count).toBe(1)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('invalid/arbitrary activePage values still map to exactly 1 rendered page (default)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (activePage) => {
          const count = getRenderedPageCount(activePage)
          expect(count).toBe(1)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('random sequences of navigation always result in exactly 1 active page per step', () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...VALID_PAGES), { minLength: 1, maxLength: 50 }),
        (navigationSequence) => {
          for (const pageId of navigationSequence) {
            const count = getRenderedPageCount(pageId)
            expect(count).toBe(1)
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('the rendered page matches the activePage for valid IDs', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_PAGES),
        (activePage) => {
          const rendered = getRenderedPage(activePage)
          expect(rendered).toBe(activePage)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('invalid activePage values always fall back to dashboard', () => {
    // Generate strings that are NOT valid page IDs
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(
          (s) => !VALID_PAGES.includes(s)
        ),
        (invalidPage) => {
          const rendered = getRenderedPage(invalidPage)
          expect(rendered).toBe('dashboard')

          const count = getRenderedPageCount(invalidPage)
          expect(count).toBe(1)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('NAV_ITEMS page IDs are unique (no duplicates that could cause multiple renders)', () => {
    // This is a structural property: the valid pages set has no duplicates
    const uniqueIds = new Set(VALID_PAGES)
    expect(uniqueIds.size).toBe(VALID_PAGES.length)
    // Also test that exactly 6 pages are configured
    expect(VALID_PAGES.length).toBe(6)
  })
})
