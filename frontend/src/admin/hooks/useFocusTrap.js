import { useEffect, useCallback, useRef } from 'react'

/**
 * Selector for all focusable elements within a container.
 * Matches anchors, buttons, inputs, and elements with explicit tabindex
 * that aren't disabled or tabindex="-1".
 */
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * useFocusTrap — Traps keyboard focus within a container element.
 *
 * On activation:
 *   - Queries all focusable elements inside containerRef
 *   - Moves focus to the first focusable element (typically the first nav item)
 *
 * While active:
 *   - Intercepts Tab at the last element → cycles to first
 *   - Intercepts Shift+Tab at the first element → cycles to last
 *   - Intercepts Escape → calls onClose, returns focus to triggerRef
 *
 * On deactivation:
 *   - Returns focus to the trigger element (e.g. hamburger button)
 *
 * @param {React.RefObject<HTMLElement>} containerRef - Ref to the container that traps focus
 * @param {React.RefObject<HTMLElement>} triggerRef - Ref to the element that opened the container (receives focus on close)
 * @param {{ active: boolean, onClose: () => void }} options - Control activation and close callback
 */
export function useFocusTrap(containerRef, triggerRef, { active, onClose }) {
  // Store onClose in a ref to avoid re-attaching listeners on every render
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  /**
   * Handles keydown events to trap Tab/Shift+Tab within the container
   * and close on Escape.
   */
  const handleKeyDown = useCallback((e) => {
    const container = containerRef.current
    if (!container) return

    // Escape key: close the trap and return focus to trigger
    if (e.key === 'Escape') {
      e.preventDefault()
      onCloseRef.current()
      // Focus return is handled in the deactivation effect below
      return
    }

    // Only trap Tab key
    if (e.key !== 'Tab') return

    const focusableElements = container.querySelectorAll(FOCUSABLE_SELECTOR)
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (e.shiftKey) {
      // Shift+Tab at first element → wrap to last
      if (document.activeElement === firstElement) {
        e.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab at last element → wrap to first
      if (document.activeElement === lastElement) {
        e.preventDefault()
        firstElement.focus()
      }
    }
  }, [containerRef])

  useEffect(() => {
    if (!active) return

    const container = containerRef.current
    if (!container) return

    // Move focus to the first focusable element on activation
    const focusableElements = container.querySelectorAll(FOCUSABLE_SELECTOR)
    if (focusableElements.length > 0) {
      // Small delay to ensure DOM is painted (e.g. after CSS transition starts)
      requestAnimationFrame(() => {
        focusableElements[0].focus()
      })
    }

    // Attach keydown listener to the document to catch all key events
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // On deactivation, return focus to the trigger element
      if (triggerRef.current) {
        triggerRef.current.focus()
      }
    }
  }, [active, containerRef, triggerRef, handleKeyDown])
}
