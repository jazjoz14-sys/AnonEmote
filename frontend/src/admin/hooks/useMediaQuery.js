import { useState, useEffect } from 'react'

/**
 * useMediaQuery — reactive matchMedia hook.
 *
 * Accepts a CSS media query string and returns a boolean indicating whether
 * the document currently matches the query. Automatically updates when the
 * match state changes (e.g. on viewport resize or orientation flip).
 *
 * @param {string} query - A valid CSS media query, e.g. '(max-width: 1023px)'
 * @returns {boolean} Whether the media query currently matches
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 1023px)')
 */
export default function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    // SSR guard — matchMedia only available in browser
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mql = window.matchMedia(query)

    // Sync state immediately in case the query changed between renders
    setMatches(mql.matches)

    /** @param {MediaQueryListEvent} event */
    const handler = (event) => {
      setMatches(event.matches)
    }

    // Modern browsers support addEventListener on MediaQueryList.
    // Older Safari (< 14) only has addListener — we handle both.
    if (mql.addEventListener) {
      mql.addEventListener('change', handler)
    } else {
      mql.addListener(handler)
    }

    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handler)
      } else {
        mql.removeListener(handler)
      }
    }
  }, [query])

  return matches
}
