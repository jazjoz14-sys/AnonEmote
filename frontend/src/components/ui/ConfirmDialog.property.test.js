/**
 * Property-based tests for ConfirmDialog visibility logic
 *
 * @vitest-environment jsdom
 */

// Feature: onboarding-terms-qol, Property 9: Confirmation dialog shown iff content is non-empty
// Validates: Requirements 7.1, 7.2, 7.3

import { describe, it, expect, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, cleanup, fireEvent, screen } from '@testing-library/react'
import { useState, createElement } from 'react'
import ConfirmDialog from './ConfirmDialog.jsx'

/**
 * Test helper component that simulates the PostModal's close behavior:
 * - Has a text input and a close button
 * - Uses `showConfirm` state logic: if text.length > 0, show ConfirmDialog on close;
 *   otherwise close immediately
 * - Renders the ConfirmDialog conditionally
 */
function CloseLogicWrapper({ initialText = '' }) {
  const [text, setText] = useState(initialText)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isClosed, setIsClosed] = useState(false)

  const handleClose = () => {
    if (text.length > 0) {
      setShowConfirm(true)
    } else {
      setIsClosed(true)
    }
  }

  const handleConfirmDiscard = () => {
    setShowConfirm(false)
    setText('')
    setIsClosed(true)
  }

  const handleCancelDiscard = () => {
    setShowConfirm(false)
  }

  if (isClosed) {
    return createElement('div', { 'data-testid': 'closed-state' }, 'Modal closed')
  }

  return createElement('div', { 'data-testid': 'modal-open' },
    createElement('input', {
      'data-testid': 'text-input',
      value: text,
      onChange: (e) => setText(e.target.value),
      'aria-label': 'Content input',
    }),
    createElement('button', {
      'data-testid': 'close-button',
      onClick: handleClose,
    }, 'Close'),
    createElement(ConfirmDialog, {
      open: showConfirm,
      message: 'Discard your draft?',
      cancelLabel: 'Keep Writing',
      confirmLabel: 'Discard',
      onCancel: handleCancelDiscard,
      onConfirm: handleConfirmDiscard,
    })
  )
}

describe('ConfirmDialog — Property 9: Confirmation dialog shown iff content is non-empty', () => {
  afterEach(() => {
    cleanup()
  })

  it('for any non-empty string: clicking close shows ConfirmDialog (role="alertdialog" in DOM)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 280 }),
        (text) => {
          cleanup()

          const { container } = render(createElement(CloseLogicWrapper, { initialText: text }))

          // Click the close button
          const closeBtn = container.querySelector('[data-testid="close-button"]')
          fireEvent.click(closeBtn)

          // ConfirmDialog should be visible (role="alertdialog" in DOM)
          const alertDialog = container.querySelector('[role="alertdialog"]')
          expect(alertDialog).not.toBeNull()

          // Modal should NOT be closed
          const closedState = container.querySelector('[data-testid="closed-state"]')
          expect(closedState).toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('for empty string: clicking close does NOT render ConfirmDialog, and modal closes immediately', () => {
    fc.assert(
      fc.property(
        fc.constant(''),
        () => {
          cleanup()

          const { container } = render(createElement(CloseLogicWrapper, { initialText: '' }))

          // Click the close button
          const closeBtn = container.querySelector('[data-testid="close-button"]')
          fireEvent.click(closeBtn)

          // ConfirmDialog should NOT be visible
          const alertDialog = container.querySelector('[role="alertdialog"]')
          expect(alertDialog).toBeNull()

          // Modal should be closed
          const closedState = container.querySelector('[data-testid="closed-state"]')
          expect(closedState).not.toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('for any text typed then cleared: clicking close should close immediately without dialog', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 280 }),
        (text) => {
          cleanup()

          const { container } = render(createElement(CloseLogicWrapper, { initialText: '' }))

          // Type something into the input
          const input = container.querySelector('[data-testid="text-input"]')
          fireEvent.change(input, { target: { value: text } })

          // Now clear it
          fireEvent.change(input, { target: { value: '' } })

          // Click the close button — should close immediately since text is empty
          const closeBtn = container.querySelector('[data-testid="close-button"]')
          fireEvent.click(closeBtn)

          // ConfirmDialog should NOT appear
          const alertDialog = container.querySelector('[role="alertdialog"]')
          expect(alertDialog).toBeNull()

          // Modal should be closed
          const closedState = container.querySelector('[data-testid="closed-state"]')
          expect(closedState).not.toBeNull()
        }
      ),
      { numRuns: 100 }
    )
  })

  it('biconditional: dialog shown iff content.length > 0 at close time', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 280 }),
        (text) => {
          cleanup()

          const { container } = render(createElement(CloseLogicWrapper, { initialText: text }))

          // Click the close button
          const closeBtn = container.querySelector('[data-testid="close-button"]')
          fireEvent.click(closeBtn)

          const alertDialog = container.querySelector('[role="alertdialog"]')
          const closedState = container.querySelector('[data-testid="closed-state"]')

          if (text.length > 0) {
            // Non-empty → dialog shown, modal still open
            expect(alertDialog).not.toBeNull()
            expect(closedState).toBeNull()
          } else {
            // Empty → no dialog, modal closed immediately
            expect(alertDialog).toBeNull()
            expect(closedState).not.toBeNull()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
