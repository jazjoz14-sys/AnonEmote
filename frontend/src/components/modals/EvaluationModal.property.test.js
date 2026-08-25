/**
 * Property-based tests for EvaluationModal — Rating Icon Fill State.
 *
 * @vitest-environment jsdom
 */

// Feature: user-evaluation, Property 4: Rating Icon Fill State
// Validates: Requirements 3.3

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

// ── Mock useAppStore ────────────────────────────────────────────────────────────
// EvaluationModal reads openCrisis, showToast, closeEvaluationModal from the store.
const mockStoreActions = {
  openCrisis: vi.fn(),
  showToast: vi.fn(),
  closeEvaluationModal: vi.fn(),
  pushModal: vi.fn(),
  popModal: vi.fn(),
}

vi.mock('../../store/useAppStore', () => {
  const store = vi.fn((selector) => {
    if (typeof selector === 'function') return selector(mockStoreActions)
    return mockStoreActions
  })
  store.getState = vi.fn(() => mockStoreActions)
  store.setState = vi.fn()
  store.subscribe = vi.fn(() => vi.fn())
  return { default: store }
})

// ── Mock apiFetch (EvaluationModal imports it for submission) ────────────────────
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}))

// ── Mock device/viewport hooks used by ModalShell ───────────────────────────────
vi.mock('../../lib/device', () => ({
  useIsSmallScreen: () => false,
  useViewportSize: () => ({ width: 1024, height: 768 }),
}))

vi.mock('../../lib/viewport', () => ({
  useOrientation: () => ({ isLandscape: false }),
  useBodyLock: vi.fn(),
}))

// ── Mock useDraggable hook used by ModalShell ───────────────────────────────────
vi.mock('../../hooks/useDraggable', () => ({
  default: () => ({
    position: { x: 100, y: 100 },
    isDragging: false,
    handleProps: {},
  }),
}))

import EvaluationModal from './EvaluationModal.jsx'

// ── Property 4: Rating Icon Fill State ──────────────────────────────────────────

describe('Property 4: Rating Icon Fill State', () => {
  /**
   * For any selected rating value n (where 1 ≤ n ≤ 5), exactly n moon-phase icons
   * should render in the active/filled state (opacity-100), and exactly 5-n icons
   * should render in the inactive state (opacity-40).
   *
   * Validates: Requirements 3.3
   */

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('for any rating n (1–5), exactly n icons are active (opacity-100) and 5-n are inactive (opacity-40)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (n) => {
          cleanup()

          const { container } = render(
            createElement(EvaluationModal, { open: true, onClose: vi.fn() })
          )

          // Find all radio elements within the radiogroup
          const radioGroup = container.querySelector('[role="radiogroup"]')
          expect(radioGroup).not.toBeNull()

          const radios = radioGroup.querySelectorAll('[role="radio"]')
          expect(radios.length).toBe(5)

          // Click the nth rating (0-indexed: n-1)
          fireEvent.click(radios[n - 1])

          // Re-query after state update to get fresh classes
          const updatedRadios = radioGroup.querySelectorAll('[role="radio"]')

          // Count active (opacity-100) and inactive (opacity-40) icons
          let activeCount = 0
          let inactiveCount = 0

          updatedRadios.forEach((radio, index) => {
            const classes = radio.className
            if (classes.includes('opacity-100')) {
              activeCount++
              // Active icons should be at indices 0 through n-1
              expect(index).toBeLessThan(n)
            } else if (classes.includes('opacity-40')) {
              inactiveCount++
              // Inactive icons should be at indices n through 4
              expect(index).toBeGreaterThanOrEqual(n)
            }
          })

          // Exactly n icons are active, 5-n are inactive
          expect(activeCount).toBe(n)
          expect(inactiveCount).toBe(5 - n)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('active icons are contiguous from the start (indices 0 to n-1)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (n) => {
          cleanup()

          const { container } = render(
            createElement(EvaluationModal, { open: true, onClose: vi.fn() })
          )

          const radioGroup = container.querySelector('[role="radiogroup"]')
          const radios = radioGroup.querySelectorAll('[role="radio"]')

          // Click the nth rating
          fireEvent.click(radios[n - 1])

          // Re-query
          const updatedRadios = radioGroup.querySelectorAll('[role="radio"]')

          // Verify the exact pattern: first n are active, rest are inactive
          updatedRadios.forEach((radio, index) => {
            const classes = radio.className
            if (index < n) {
              expect(classes).toContain('opacity-100')
              expect(classes).not.toContain('opacity-40')
            } else {
              expect(classes).toContain('opacity-40')
              expect(classes).not.toContain('opacity-100')
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('the selected radio (index n-1) always has aria-checked="true"', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (n) => {
          cleanup()

          const { container } = render(
            createElement(EvaluationModal, { open: true, onClose: vi.fn() })
          )

          const radioGroup = container.querySelector('[role="radiogroup"]')
          const radios = radioGroup.querySelectorAll('[role="radio"]')

          // Click the nth rating
          fireEvent.click(radios[n - 1])

          // Re-query
          const updatedRadios = radioGroup.querySelectorAll('[role="radio"]')

          // Only the clicked radio should have aria-checked="true"
          updatedRadios.forEach((radio, index) => {
            if (index === n - 1) {
              expect(radio.getAttribute('aria-checked')).toBe('true')
            } else {
              expect(radio.getAttribute('aria-checked')).toBe('false')
            }
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})
