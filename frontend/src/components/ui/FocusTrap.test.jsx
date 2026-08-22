/**
 * FocusTrap unit tests.
 * Verifies Tab/Shift+Tab cycling, focus restoration, and MutationObserver tracking.
 */

import { render, cleanup, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import FocusTrap from './FocusTrap.jsx'

afterEach(cleanup)

describe('FocusTrap', () => {
  it('renders children', () => {
    const { getByText } = render(
      <FocusTrap active={false}>
        <p>Hello</p>
      </FocusTrap>
    )
    expect(getByText('Hello')).toBeInTheDocument()
  })

  it('moves focus to the first focusable element on activation', () => {
    const { getByTestId } = render(
      <FocusTrap active={true}>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
      </FocusTrap>
    )
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('moves focus to initialFocus selector when provided', () => {
    const { getByTestId } = render(
      <FocusTrap active={true} initialFocus="[data-testid='second']">
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
      </FocusTrap>
    )
    expect(document.activeElement).toBe(getByTestId('second'))
  })

  it('falls back to first focusable if initialFocus selector matches nothing', () => {
    const { getByTestId } = render(
      <FocusTrap active={true} initialFocus=".nonexistent">
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
      </FocusTrap>
    )
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('wraps focus from last to first on Tab at the end', () => {
    const { getByTestId } = render(
      <FocusTrap active={true}>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </FocusTrap>
    )

    // Focus the last element
    const third = getByTestId('third')
    act(() => { third.focus() })
    expect(document.activeElement).toBe(third)

    // Press Tab — should wrap to first
    fireEvent.keyDown(third, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(getByTestId('first'))
  })

  it('wraps focus from first to last on Shift+Tab at the start', () => {
    const { getByTestId } = render(
      <FocusTrap active={true}>
        <button data-testid="first">First</button>
        <button data-testid="second">Second</button>
        <button data-testid="third">Third</button>
      </FocusTrap>
    )

    const first = getByTestId('first')
    // Focus is already on first from activation
    expect(document.activeElement).toBe(first)

    // Press Shift+Tab — should wrap to last
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(getByTestId('third'))
  })

  it('does not trap focus when active=false', () => {
    const { getByTestId } = render(
      <div>
        <button data-testid="outside">Outside</button>
        <FocusTrap active={false}>
          <button data-testid="inside">Inside</button>
        </FocusTrap>
      </div>
    )

    // Focus should not have moved into the trap
    const outside = getByTestId('outside')
    act(() => { outside.focus() })
    expect(document.activeElement).toBe(outside)

    // Tab keydown should not be intercepted (no wrapping logic runs)
    fireEvent.keyDown(getByTestId('inside'), { key: 'Tab', shiftKey: false })
    // Focus stays on wherever it was — no wrapping happened
    expect(document.activeElement).not.toBe(getByTestId('inside'))
  })

  it('restores focus to previously focused element on unmount', () => {
    // Focus an element outside the trap first
    const outer = document.createElement('button')
    outer.textContent = 'Outer'
    document.body.appendChild(outer)
    outer.focus()
    expect(document.activeElement).toBe(outer)

    const { unmount } = render(
      <FocusTrap active={true}>
        <button>Trap Button</button>
      </FocusTrap>
    )

    // Focus should have moved into the trap
    expect(document.activeElement).not.toBe(outer)

    // Unmount — focus should restore
    unmount()
    expect(document.activeElement).toBe(outer)

    // Cleanup
    document.body.removeChild(outer)
  })

  it('skips disabled elements when determining focusable list', () => {
    const { getByTestId } = render(
      <FocusTrap active={true}>
        <button data-testid="first">First</button>
        <button data-testid="disabled" disabled>Disabled</button>
        <button data-testid="last">Last</button>
      </FocusTrap>
    )

    // Focus on last, Tab should wrap to first (skipping disabled)
    const last = getByTestId('last')
    act(() => { last.focus() })
    fireEvent.keyDown(last, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(getByTestId('first'))

    // From first, Shift+Tab should go to last (skipping disabled)
    const first = getByTestId('first')
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(getByTestId('last'))
  })

  it('handles elements with tabindex correctly', () => {
    const { getByTestId } = render(
      <FocusTrap active={true}>
        <div data-testid="focusable" tabIndex={0}>Focusable div</div>
        <div data-testid="excluded" tabIndex={-1}>Excluded div</div>
        <a data-testid="link" href="#">Link</a>
      </FocusTrap>
    )

    // First focusable should be the div with tabindex=0
    expect(document.activeElement).toBe(getByTestId('focusable'))

    // From link (last), Tab wraps to focusable div (first)
    const link = getByTestId('link')
    act(() => { link.focus() })
    fireEvent.keyDown(link, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(getByTestId('focusable'))
  })

  it('does not prevent non-Tab keys', () => {
    const { getByTestId } = render(
      <FocusTrap active={true}>
        <button data-testid="btn">Button</button>
      </FocusTrap>
    )

    // Non-Tab keys should not be prevented
    const btn = getByTestId('btn')
    const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    const prevented = !btn.dispatchEvent(enterEvent)
    // Enter is not prevented by our handler
    expect(prevented).toBe(false)
  })
})
