/**
 * CandidateLabels — Selectable feeling labels for quadrants with multiple candidates.
 *
 * When the user positions the Cursor in a Quadrant that maps to more than one
 * feeling (e.g., Yellow → ['joy', 'doodle']), this component renders those
 * candidates as accessible, clickable labels so the user can pick the specific
 * feeling they resonate with.
 *
 * Styled with the Card component appearance (border-white/[0.08], bg-transparent)
 * per Requirement 10.4. Keyboard accessible via native <button> elements (Enter/Space
 * activate per Requirement 1.5).
 *
 * @param {Object} props
 * @param {string[]} props.feelings - Array of feeling IDs (e.g., ['joy', 'doodle'])
 * @param {(feelingId: string) => void} props.onSelect - Called when user picks a feeling
 */

import { useState, useEffect } from 'react'

/**
 * Capitalizes a feeling ID for display.
 * e.g., 'joy' → 'Joy', 'doodle' → 'Doodle', 'anxiety' → 'Anxiety'
 *
 * @param {string} id - Feeling ID string
 * @returns {string} Capitalized label
 */
function capitalize(id) {
  if (!id) return ''
  return id.charAt(0).toUpperCase() + id.slice(1)
}

export default function CandidateLabels({ feelings, onSelect }) {
  // Fade-in on mount: opacity 0 → 1 over 200ms
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Trigger fade-in on next frame so the transition plays
    const frame = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  if (!feelings || feelings.length === 0) return null

  return (
    <div
      className={[
        'flex flex-wrap items-center justify-center gap-3',
        'transition-opacity duration-200 ease-out',
        visible ? 'opacity-100' : 'opacity-0',
      ].join(' ')}
      role="group"
      aria-label="Choose a feeling"
    >
      {feelings.map((feelingId) => (
        <button
          key={feelingId}
          type="button"
          onClick={() => onSelect(feelingId)}
          className={[
            // Card-like appearance (Requirement 10.4)
            'border border-white/[0.08] bg-transparent rounded-xl',
            // Minimum 44×44px touch target
            'min-w-[44px] min-h-[44px] px-4 py-2',
            // Typography
            'text-sm font-semibold text-white/70',
            // Hover state
            'hover:border-white/20 hover:text-white/90',
            // Transition
            'transition-all duration-200',
            // Focus ring (keyboard accessible, violet accent)
            'focus:outline-none focus:ring-2 focus:ring-violet-500/60',
            // Cursor
            'cursor-pointer',
          ].join(' ')}
          aria-label={`Select ${capitalize(feelingId)} feeling`}
        >
          {capitalize(feelingId)}
        </button>
      ))}
    </div>
  )
}
