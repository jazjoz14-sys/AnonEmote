/**
 * Property-based tests for ReactionBar optimistic state and rollback
 *
 * @vitest-environment jsdom
 */

// Feature: onboarding-terms-qol, Property 6: Reaction optimistic state and rollback
// Validates: Requirements 5.3, 5.4

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, cleanup, fireEvent, act, waitFor } from '@testing-library/react'
import { createElement } from 'react'

// Mock the api module
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn(),
}))

// Mock the store
const mockApplyReaction = vi.fn()
const mockSetReportTarget = vi.fn()
const mockShowToast = vi.fn()

vi.mock('../../store/useAppStore', () => {
  const store = {
    sessionId: 'test-session-id',
    isAuthenticated: true,
    reactions: {},
    applyReaction: (...args) => mockApplyReaction(...args),
    setReportTarget: (...args) => mockSetReportTarget(...args),
    showToast: (...args) => mockShowToast(...args),
    setState: vi.fn(),
  }
  const useAppStore = () => store
  useAppStore.setState = store.setState
  useAppStore.getState = () => store
  return { default: useAppStore }
})

import { apiFetch } from '../../lib/api'
import ReactionBar from './ReactionBar.jsx'

const mockPost = { id: 'test-post-123' }

describe('ReactionBar — Property 6: Reaction optimistic state and rollback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('Property 6a: initiating a reaction sets opacity to 0.4 and disables all buttons', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('🫂', '💙', '😢', '🌱', '✨'),
        (emoji) => {
          cleanup()
          vi.clearAllMocks()

          // Mock apiFetch to never resolve (keeps the pending state active)
          apiFetch.mockImplementation(() => new Promise(() => {}))

          const { container } = render(createElement(ReactionBar, { post: mockPost }))

          // Find the button with the target emoji
          const buttons = container.querySelectorAll('button')
          const emojiButtons = Array.from(buttons).filter(
            (btn) => btn.querySelector('.text-sm')?.textContent
          )

          const targetButton = emojiButtons.find(
            (btn) => btn.querySelector('.text-sm').textContent === emoji
          )

          expect(targetButton).toBeTruthy()

          // Click the emoji button
          act(() => {
            fireEvent.click(targetButton)
          })

          // After click, the button should show opacity 0.4 (pending state)
          expect(targetButton.style.opacity).toBe('0.4')

          // All emoji buttons should be disabled
          emojiButtons.forEach((btn) => {
            expect(btn.disabled).toBe(true)
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('Property 6b: on failure, opacity reverts and buttons are re-enabled with error toast', async () => {
    // We need to test each emoji individually with async handling
    const emojis = ['🫂', '💙', '😢', '🌱', '✨']

    for (const emoji of emojis) {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(emoji),
          async (targetEmoji) => {
            cleanup()
            vi.clearAllMocks()

            // Mock apiFetch to reject
            apiFetch.mockImplementation(() =>
              Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Server error' }),
              })
            )

            const { container } = render(createElement(ReactionBar, { post: mockPost }))

            // Find the button with the target emoji
            const buttons = container.querySelectorAll('button')
            const emojiButtons = Array.from(buttons).filter(
              (btn) => btn.querySelector('.text-sm')?.textContent
            )

            const targetButton = emojiButtons.find(
              (btn) => btn.querySelector('.text-sm').textContent === targetEmoji
            )

            expect(targetButton).toBeTruthy()

            // Click the emoji button
            await act(async () => {
              fireEvent.click(targetButton)
              // Wait for the async rejection to propagate
              await new Promise((resolve) => setTimeout(resolve, 10))
            })

            // After failure, the opacity should revert (no longer 0.4)
            expect(targetButton.style.opacity).not.toBe('0.4')

            // Buttons should be re-enabled after failure
            const buttonsAfter = container.querySelectorAll('button')
            const emojiButtonsAfter = Array.from(buttonsAfter).filter(
              (btn) => btn.querySelector('.text-sm')?.textContent
            )
            emojiButtonsAfter.forEach((btn) => {
              expect(btn.disabled).toBe(false)
            })

            // showToast should have been called with error
            expect(mockShowToast).toHaveBeenCalledWith(
              expect.objectContaining({
                type: 'error',
              })
            )
          }
        ),
        { numRuns: 20 }
      )
    }
  })
})
