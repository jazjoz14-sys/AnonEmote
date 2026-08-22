/**
 * announce — pushes a message to the #announce-region aria-live container.
 *
 * Screen readers will read the message aloud without disrupting visual UI.
 * Used for dynamic content changes that don't have a visual toast (e.g.,
 * "Post broadcast", "Reaction added", "Error occurred").
 *
 * The announce region is rendered in App.jsx with aria-live="polite"
 * and aria-atomic="true".
 *
 * @param {string} message - The announcement text for screen readers
 */
export function announce(message) {
  const el = document.getElementById('announce-region')
  if (!el) return

  // Clear and re-set to trigger a new announcement even if the message is the same
  el.textContent = ''
  // Use a microtask to ensure the DOM mutation is observed by the live region
  requestAnimationFrame(() => {
    el.textContent = message
  })
}
