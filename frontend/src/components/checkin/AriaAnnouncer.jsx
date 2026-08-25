import { forwardRef, useImperativeHandle, useState, useCallback } from 'react'

/**
 * AriaAnnouncer — provides aria-live regions for screen reader announcements.
 *
 * Used by MoodSpace to announce quadrant changes (polite) and by CheckInScreen
 * to announce phase transitions or confirmations (assertive).
 *
 * Exposes an imperative API via ref:
 *   - announcePolite(msg)   → updates the aria-live="polite" region
 *   - announceAssertive(msg) → updates the aria-live="assertive" region
 *
 * The clear-then-set pattern forces assistive technology to re-read the
 * region even when the same message is announced consecutively.
 *
 * @param {Object} _props - No props consumed
 * @param {React.Ref} ref - Exposes { announcePolite(msg), announceAssertive(msg) }
 */
const AriaAnnouncer = forwardRef(function AriaAnnouncer(_props, ref) {
  const [politeMessage, setPoliteMessage] = useState('')
  const [assertiveMessage, setAssertiveMessage] = useState('')

  /**
   * Announce a message via the aria-live="polite" region.
   * Clears then sets to force re-announcement for repeated messages.
   * @param {string} msg - The message to announce
   */
  const announcePolite = useCallback((msg) => {
    setPoliteMessage('')
    // Use a microtask to ensure the clear is processed before the new value
    requestAnimationFrame(() => {
      setPoliteMessage(msg)
    })
  }, [])

  /**
   * Announce a message via the aria-live="assertive" region.
   * Clears then sets to force re-announcement for repeated messages.
   * @param {string} msg - The message to announce
   */
  const announceAssertive = useCallback((msg) => {
    setAssertiveMessage('')
    requestAnimationFrame(() => {
      setAssertiveMessage(msg)
    })
  }, [])

  useImperativeHandle(ref, () => ({
    announcePolite,
    announceAssertive,
  }), [announcePolite, announceAssertive])

  return (
    <>
      {/* Polite live region — used for informational updates (quadrant changes) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        role="status"
        className="sr-only"
      >
        {politeMessage}
      </div>

      {/* Assertive live region — used for important confirmations (feeling confirmed) */}
      <div
        aria-live="assertive"
        aria-atomic="true"
        role="alert"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </>
  )
})

export default AriaAnnouncer
