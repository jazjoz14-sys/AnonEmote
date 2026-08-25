import React from 'react'

/**
 * Glowing orb cursor for the MoodSpace 2D interaction area.
 * Positioned via CSS transform from normalized coordinates.
 * Matches the radial-gradient technique used by avatar particle effects.
 *
 * @param {Object} props
 * @param {number} props.x - Normalized pleasantness [0, 1] (left to right)
 * @param {number} props.y - Normalized energy [0, 1] (bottom to top)
 */
export default function Cursor({ x, y }) {
  // Convert normalized coords to CSS percentages.
  // X maps directly (0 = left, 1 = right).
  // Y is inverted for CSS (y=0 is bottom in mood space but top in CSS).
  const left = `${x * 100}%`
  const top = `${(1 - y) * 100}%`

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left,
        top,
        width: 32,
        height: 32,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, #8b5cf6 30%, transparent 70%)',
        boxShadow: '0 0 12px 4px rgba(139, 92, 246, 0.4)',
        borderRadius: '50%',
      }}
      aria-hidden="true"
    />
  )
}
