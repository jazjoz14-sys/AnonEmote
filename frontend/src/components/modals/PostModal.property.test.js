/**
 * Property-based tests for PostModal loading states
 *
 * @vitest-environment jsdom
 */

// Feature: onboarding-terms-qol, Property 4: Post submission disables inputs
// Feature: onboarding-terms-qol, Property 5: Post failure re-enables inputs
// Validates: Requirements 5.1, 5.2

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { createElement } from 'react'

// Mock apiFetch from ../../lib/api
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
  apiUrl: vi.fn((path) => path),
}))

// Mock useAppStore
vi.mock('../../store/useAppStore', () => {
  const store = vi.fn(() => ({
    selectedPlanet: { id: 'joy', label: 'Joy', color: '#FFD700' },
    setPostModalOpen: vi.fn(),
    openCrisis: vi.fn(),
    crisis: null,
    sessionId: 'test-session-123',
    addPost: vi.fn(),
    checkIn: null,
    showToast: vi.fn(),
  }))
  store.getState = vi.fn(() => ({
    selectedPlanet: { id: 'joy', label: 'Joy', color: '#FFD700' },
    setPostModalOpen: vi.fn(),
    openCrisis: vi.fn(),
    crisis: null,
    sessionId: 'test-session-123',
    addPost: vi.fn(),
    checkIn: null,
    showToast: vi.fn(),
  }))
  store.setState = vi.fn()
  return { default: store }
})

// Mock useDraggable
vi.mock('../../hooks/useDraggable', () => ({
  default: () => ({
    position: { x: 100, y: 100 },
    isDragging: false,
    setPosition: vi.fn(),
    dragProps: { onPointerDown: vi.fn(), style: { touchAction: 'none' } },
    handleProps: {
      onPointerDown: vi.fn(),
      onKeyDown: vi.fn(),
      tabIndex: 0,
      'aria-label': 'Drag to move this panel, or use arrow keys',
      style: { cursor: 'grab', touchAction: 'none' },
    },
  }),
}))

// Mock device hooks
vi.mock('../../lib/device', () => ({
  useIsSmallScreen: () => false,
  useViewportSize: () => ({ width: 1024, height: 768 }),
  isMobile: false,
  isSmallScreen: false,
}))

// Mock viewport hooks
vi.mock('../../lib/viewport', () => ({
  useOrientation: () => ({ isLandscape: false, isPortrait: true }),
  useBodyLock: vi.fn(),
}))

// Mock BottomSheet component (not used in desktop mode)
vi.mock('../ui/BottomSheet', () => ({
  default: ({ children }) => createElement('div', { 'data-testid': 'bottom-sheet' }, children),
}))

// Mock ConfirmDialog component
vi.mock('../ui/ConfirmDialog', () => ({
  default: () => null,
}))

import PostModal from './PostModal.jsx'
import { apiFetch } from '../../lib/api'

describe('PostModal — Property 4: Post submission disables inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('for any non-empty text, submission disables button and shows broadcasting state', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 280 }).filter((s) => s.trim().length > 0),
        async (text) => {
          cleanup()

          // Mock apiFetch to never resolve (keeps loading state active)
          apiFetch.mockReturnValue(new Promise(() => {}))

          const { container } = render(createElement(PostModal))

          // Find textarea and submit button
          const textarea = container.querySelector('textarea[aria-label="Post content"]')
          const submitButton = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast'
          )

          // Set textarea value and flush state
          await act(async () => {
            fireEvent.change(textarea, { target: { value: text } })
          })

          // Click submit — triggers async handleSubmit which sets status='checking'
          // and rocketPhase='rumble' simultaneously
          await act(async () => {
            fireEvent.click(submitButton)
          })

          // After submission, the component enters 'checking' state.
          // The rocket animation overlay replaces the form content, effectively
          // preventing all user input (textarea and submit button are unmounted).
          // Verify the submit button with "Broadcasting..." is disabled OR
          // the form inputs are removed from the DOM (rocket animation showing).
          const broadcastingBtn = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcasting...'
          )
          const textareaAfter = container.querySelector('textarea[aria-label="Post content"]')

          if (broadcastingBtn) {
            // If button is visible, it must be disabled
            expect(broadcastingBtn).toBeDisabled()
          }

          if (textareaAfter) {
            // If textarea is visible, it must be disabled
            expect(textareaAfter).toBeDisabled()
          }

          // At minimum, the original "Broadcast" button should no longer be active
          const activeSubmit = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast' && !btn.disabled
          )
          expect(activeSubmit).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('submit button text changes to "Broadcasting..." during submission', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 280 }).filter((s) => s.trim().length > 0),
        async (text) => {
          cleanup()

          // Mock apiFetch to never resolve
          apiFetch.mockReturnValue(new Promise(() => {}))

          const { container } = render(createElement(PostModal))

          const textarea = container.querySelector('textarea[aria-label="Post content"]')
          const submitButton = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast'
          )

          await act(async () => {
            fireEvent.change(textarea, { target: { value: text } })
          })

          await act(async () => {
            fireEvent.click(submitButton)
          })

          // After submission, either the broadcasting button is visible (and disabled)
          // or the rocket animation has replaced the form entirely (inputs prevented)
          const broadcastingBtn = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcasting...'
          )
          const rocketAnimation = container.querySelector('.animate-rocket-rumble')

          // One of these must be true: either button shows "Broadcasting..." or rocket is animating
          expect(broadcastingBtn || rocketAnimation).toBeTruthy()

          // The original active "Broadcast" button must NOT exist
          const originalBtn = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast' && !btn.disabled
          )
          expect(originalBtn).toBeUndefined()
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('PostModal — Property 5: Post failure re-enables inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('for any non-empty text and server error (non-403), inputs are re-enabled and error shown', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 280 }).filter((s) => s.trim().length > 0),
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => /^[a-zA-Z0-9 ]+$/.test(s)),
        async (text, errorMessage) => {
          cleanup()

          // Mock apiFetch to return a 500 error (non-403, non-406)
          apiFetch.mockResolvedValue({
            status: 500,
            ok: false,
            json: () => Promise.resolve({ error: errorMessage }),
          })

          const { container } = render(createElement(PostModal))

          const textarea = container.querySelector('textarea[aria-label="Post content"]')
          const submitButton = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast'
          )

          fireEvent.change(textarea, { target: { value: text } })

          // Submit and wait for async resolution
          await act(async () => {
            fireEvent.click(submitButton)
          })

          // Advance timers to get past the rocket fail animation delay (700ms)
          await act(async () => {
            vi.advanceTimersByTime(800)
          })

          // Assert textarea is NOT disabled
          const textareaAfter = container.querySelector('textarea[aria-label="Post content"]')
          expect(textareaAfter).not.toBeDisabled()

          // Assert submit button is NOT disabled (text should be 'Broadcast' again)
          const submitAfter = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast'
          )
          expect(submitAfter).not.toBeNull()
          expect(submitAfter).not.toBeDisabled()

          // Assert error message is visible and non-empty
          const errorElement = container.querySelector('.text-orange-300')
          expect(errorElement).not.toBeNull()
          expect(errorElement.textContent.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('for any non-empty text and network failure (exception thrown), inputs are re-enabled with error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 280 }).filter((s) => s.trim().length > 0),
        async (text) => {
          cleanup()

          // Mock apiFetch to throw a network error
          apiFetch.mockRejectedValue(new Error('Network failure'))

          const { container } = render(createElement(PostModal))

          const textarea = container.querySelector('textarea[aria-label="Post content"]')
          const submitButton = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast'
          )

          fireEvent.change(textarea, { target: { value: text } })

          // Submit and wait for async resolution
          await act(async () => {
            fireEvent.click(submitButton)
          })

          // Advance timers to get past the rocket fail animation delay (700ms)
          await act(async () => {
            vi.advanceTimersByTime(800)
          })

          // Assert textarea is NOT disabled
          const textareaAfter = container.querySelector('textarea[aria-label="Post content"]')
          expect(textareaAfter).not.toBeDisabled()

          // Assert submit button is NOT disabled
          const submitAfter = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent === 'Broadcast'
          )
          expect(submitAfter).not.toBeNull()
          expect(submitAfter).not.toBeDisabled()

          // Assert error message is visible and non-empty
          const errorElement = container.querySelector('.text-orange-300')
          expect(errorElement).not.toBeNull()
          expect(errorElement.textContent.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
