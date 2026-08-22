/**
 * FocusTrap — traps keyboard focus within a container.
 *
 * When active, Tab and Shift+Tab cycle among focusable descendants only.
 * On mount, stores document.activeElement and restores it on unmount
 * (unless the element has been removed from the DOM).
 *
 * Uses a MutationObserver to keep the internal focusable-element list
 * up to date when children are added/removed dynamically.
 *
 * @param {Object} props
 * @param {boolean} props.active - Whether focus trapping is enabled
 * @param {string} [props.initialFocus] - CSS selector for the element to focus on activation
 * @param {React.ReactNode} props.children
 */

import { useRef, useEffect, useCallback } from 'react'

/**
 * Selector matching all natively focusable elements that are not disabled
 * and do not have tabindex="-1".
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Returns all currently focusable elements within a container.
 * @param {HTMLElement} container
 * @returns {HTMLElement[]}
 */
function getFocusableElements(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
}

export default function FocusTrap({ active, initialFocus, children }) {
  const containerRef = useRef(null)
  /** Stores the element that had focus before the trap activated. */
  const previousFocusRef = useRef(null)
  /** Cached list of focusable elements, updated by MutationObserver. */
  const focusableListRef = useRef([])

  // Refresh the internal focusable elements list
  const updateFocusableList = useCallback(() => {
    focusableListRef.current = getFocusableElements(containerRef.current)
  }, [])

  // --- Activation: store previous focus, move focus into trap ---
  useEffect(() => {
    if (!active) return

    // Capture the currently focused element so we can restore it later
    previousFocusRef.current = document.activeElement

    // Build initial focusable list
    updateFocusableList()

    // Move focus into the trap
    const container = containerRef.current
    if (container) {
      // If an initialFocus selector is provided, try to match it
      if (initialFocus) {
        const target = container.querySelector(initialFocus)
        if (target) {
          target.focus()
        } else if (focusableListRef.current.length > 0) {
          focusableListRef.current[0].focus()
        }
      } else if (focusableListRef.current.length > 0) {
        focusableListRef.current[0].focus()
      }
    }

    // Restore focus on deactivation/unmount
    return () => {
      const prev = previousFocusRef.current
      if (prev && document.contains(prev)) {
        prev.focus()
      }
    }
  }, [active, initialFocus, updateFocusableList])

  // --- MutationObserver: watch for DOM changes within the container ---
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const observer = new MutationObserver(() => {
      updateFocusableList()
    })

    observer.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['disabled', 'tabindex', 'href'],
    })

    return () => observer.disconnect()
  }, [active, updateFocusableList])

  // --- Keyboard handler: intercept Tab / Shift+Tab ---
  const handleKeyDown = useCallback(
    (e) => {
      if (!active) return
      if (e.key !== 'Tab') return

      // Refresh in case something changed between observer ticks
      updateFocusableList()
      const focusable = focusableListRef.current
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        // Shift+Tab — wrap from first to last
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        // Tab — wrap from last to first
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [active, updateFocusableList]
  )

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  )
}
