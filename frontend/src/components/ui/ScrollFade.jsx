/**
 * ScrollFade — wraps scrollable content and shows gradient fade indicators
 * at top/bottom when content overflows.
 *
 * Uses a debounced scroll listener to detect whether the container has
 * more content above (scrollTop > 0) or below (scrollTop < scrollHeight - clientHeight).
 * Fades are absolutely-positioned overlays with pointer-events-none so they
 * never block interaction with the scrollable content beneath.
 *
 * @param {Object} props
 * @param {string} [props.bgColor='#0d0d2b'] - Background color for gradient end (matches container bg)
 * @param {number} [props.fadeHeight=24] - Gradient overlay height in px
 * @param {string} [props.className=''] - Additional Tailwind classes for the outer wrapper
 * @param {React.ReactNode} props.children - Scrollable content
 */

import { useRef, useState, useEffect, useCallback } from 'react'

export default function ScrollFade({
  bgColor = '#0d0d2b',
  fadeHeight = 24,
  className = '',
  children,
}) {
  const scrollRef = useRef(null)
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)

  /**
   * Checks the scroll position of the container and updates
   * the top/bottom fade visibility accordingly.
   */
  const updateFades = useCallback(() => {
    const el = scrollRef.current
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    // Show top fade when scrolled away from the top
    setShowTop(scrollTop > 0)
    // Show bottom fade when there is more content below
    // (1px threshold to account for sub-pixel rounding)
    setShowBottom(scrollTop < scrollHeight - clientHeight - 1)
  }, [])

  /**
   * Debounced scroll handler — limits fade updates to ~60fps
   * using requestAnimationFrame for smooth performance.
   */
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let rafId = null

    const handleScroll = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        updateFades()
        rafId = null
      })
    }

    // Initial check on mount (content may already overflow)
    updateFades()

    el.addEventListener('scroll', handleScroll, { passive: true })

    // Also re-check on resize since container dimensions can change
    const resizeObserver = new ResizeObserver(() => {
      updateFades()
    })
    resizeObserver.observe(el)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (rafId !== null) cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [updateFades])

  /** Inline gradient style for the top fade overlay. */
  const topGradient = {
    height: `${fadeHeight}px`,
    background: `linear-gradient(to bottom, ${bgColor}, transparent)`,
  }

  /** Inline gradient style for the bottom fade overlay. */
  const bottomGradient = {
    height: `${fadeHeight}px`,
    background: `linear-gradient(to top, ${bgColor}, transparent)`,
  }

  return (
    <div className={`relative overflow-hidden ${className}`.trim()}>
      {/* Scrollable content area */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto overscroll-y-contain"
      >
        {children}
      </div>

      {/* Top fade — visible when content is scrolled down */}
      {showTop && (
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none transition-opacity duration-200"
          style={topGradient}
          aria-hidden="true"
        />
      )}

      {/* Bottom fade — visible when more content exists below */}
      {showBottom && (
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none transition-opacity duration-200"
          style={bottomGradient}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
