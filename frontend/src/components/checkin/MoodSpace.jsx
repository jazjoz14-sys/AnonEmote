/**
 * MoodSpace — 2D interactive mood positioning area based on the Yale Mood Meter.
 *
 * Renders a bounded 2D area where the user positions a glowing Cursor along two axes:
 *   - X axis (Pleasantness): left = unpleasant, right = pleasant
 *   - Y axis (Energy): bottom = calm, top = energised
 *
 * Supports drag (pointer move >10px from origin) and tap (≤10px within 300ms)
 * via the Pointer Events API. Keyboard users navigate with arrow keys (10%/step)
 * and confirm with Enter/Space.
 *
 * Quadrant detection drives:
 *   - Background gradient interpolation (≤20% opacity over #050510)
 *   - Particle speed/opacity scaling
 *   - Candidate feeling label display (multi-feeling quadrants)
 *   - Auto-selection (single-feeling quadrants like blue → grief)
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.4, 2.7, 7.1, 7.2, 7.3, 7.6, 8.1, 8.2, 8.3, 8.6, 10.2
 *
 * @param {Object} props
 * @param {boolean} props.interactive - Whether input is accepted (false during breathing)
 * @param {(feelingId: string) => void} props.onFeelingSelected - Called when a feeling is chosen
 * @param {(quadrant: string, feelings: string[]) => void} props.onQuadrantChange - Called on quadrant boundary crossing
 * @param {React.RefObject} props.announcerRef - Ref to AriaAnnouncer for screen reader announcements
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  positionToQuadrant,
  quadrantToFeelings,
  positionToFeelings,
  interpolateQuadrantColor,
  computeParticleOpacity,
  classifyPointerGesture,
  moveCursorByKey,
  QUADRANT_MAP,
} from '../../lib/moodSpace.js'
import Cursor from './Cursor.jsx'
import ParticleField from './ParticleField.jsx'
import CandidateLabels from './CandidateLabels.jsx'
import { qualityTier } from '../../lib/device.js'

// ─── Component ─────────────────────────────────────────────────────────────────

export default function MoodSpace({ interactive, onFeelingSelected, onQuadrantChange, announcerRef }) {
  // ─── State ─────────────────────────────────────────────────────────────────

  /** Cursor position in normalized [0, 1] coordinates. Center start. */
  const [cursorPos, setCursorPos] = useState({ x: 0.5, y: 0.5 })

  /** Currently active quadrant ID ('yellow' | 'red' | 'green' | 'blue') */
  const [activeQuadrant, setActiveQuadrant] = useState(() => positionToQuadrant(0.5, 0.5))

  /** Whether the user is actively dragging */
  const [isDragging, setIsDragging] = useState(false)

  /** Whether a feeling has been confirmed (prevents double-fire) */
  const [confirmed, setConfirmed] = useState(false)

  // ─── Refs ──────────────────────────────────────────────────────────────────

  /** Container element ref for coordinate calculations */
  const containerRef = useRef(null)

  /** Previous quadrant for boundary-crossing detection */
  const prevQuadrantRef = useRef(activeQuadrant)

  /** Pointer-down position for gesture classification */
  const pointerDownRef = useRef({ x: 0, y: 0, time: 0 })

  // ─── Coordinate Helpers ────────────────────────────────────────────────────

  /**
   * Converts a pointer event's page coordinates to normalized [0, 1] mood space coords.
   * X maps directly (left=0, right=1). Y is inverted (bottom=0 in mood space, but
   * page coords increase downward).
   *
   * @param {PointerEvent} e - Pointer event with clientX/clientY
   * @returns {{ x: number, y: number }} Clamped normalized coordinates
   */
  const pointerToNormalized = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0.5, y: 0.5 }

    const rawX = (e.clientX - rect.left) / rect.width
    const rawY = (e.clientY - rect.top) / rect.height

    // Clamp to [0, 1] and invert Y (CSS top=0 → mood bottom=1)
    const x = Math.max(0, Math.min(1, rawX))
    const y = Math.max(0, Math.min(1, 1 - rawY))

    return { x, y }
  }, [])

  // ─── Quadrant Change Detection ────────────────────────────────────────────

  useEffect(() => {
    const newQuadrant = positionToQuadrant(cursorPos.x, cursorPos.y)

    if (newQuadrant !== activeQuadrant) {
      setActiveQuadrant(newQuadrant)
    }

    // Detect boundary crossing and announce
    if (newQuadrant !== prevQuadrantRef.current) {
      prevQuadrantRef.current = newQuadrant
      const feelings = quadrantToFeelings(newQuadrant)
      const quadrantData = QUADRANT_MAP[newQuadrant]

      // Notify parent of quadrant change
      if (onQuadrantChange) {
        onQuadrantChange(newQuadrant, feelings)
      }

      // Announce via AriaAnnouncer for screen readers
      if (announcerRef?.current) {
        const feelingNames = feelings.join(', ')
        announcerRef.current.announcePolite(
          `${quadrantData.label} quadrant. Feelings: ${feelingNames}`
        )
      }
    }
  }, [cursorPos, activeQuadrant, onQuadrantChange, announcerRef])

  // ─── Auto-select for Single-Feeling Quadrants ─────────────────────────────

  /**
   * When the user confirms their position (via tap, Enter, or Space) in a quadrant
   * with only one feeling, auto-select it immediately.
   * When there are multiple feelings, CandidateLabels handles the selection.
   */
  const confirmPosition = useCallback(() => {
    if (!interactive || confirmed) return

    const quadrant = positionToQuadrant(cursorPos.x, cursorPos.y)
    const feelings = quadrantToFeelings(quadrant)

    if (feelings.length === 1) {
      // Single feeling: auto-select (e.g., blue → grief)
      setConfirmed(true)
      onFeelingSelected(feelings[0])

      // Announce confirmation
      if (announcerRef?.current) {
        announcerRef.current.announceAssertive(
          `Selected: ${feelings[0]}. Moving to nuance selection.`
        )
      }
    } else if (feelings.length > 1) {
      // Multiple feelings: announce that user should pick one
      if (announcerRef?.current) {
        announcerRef.current.announceAssertive(
          `${QUADRANT_MAP[quadrant].label} quadrant confirmed. Choose a feeling: ${feelings.join(', ')}`
        )
      }
    }
  }, [interactive, confirmed, cursorPos, onFeelingSelected, announcerRef])

  // ─── Pointer Event Handlers ───────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    if (!interactive || confirmed) return

    // Record start position and time for gesture classification
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    }

    setIsDragging(true)

    // Capture pointer for reliable move/up tracking even outside bounds
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [interactive, confirmed])

  const handlePointerMove = useCallback((e) => {
    if (!interactive || !isDragging || confirmed) return

    // Prevent default scroll on touch devices (requirement 7.3)
    e.preventDefault()

    // Update cursor position (visual feedback within 100ms per req 7.6)
    const normalized = pointerToNormalized(e)
    setCursorPos(normalized)
  }, [interactive, isDragging, confirmed, pointerToNormalized])

  const handlePointerUp = useCallback((e) => {
    if (!interactive || confirmed) return

    const downPos = { x: pointerDownRef.current.x, y: pointerDownRef.current.y }
    const upPos = { x: e.clientX, y: e.clientY }
    const elapsed = Date.now() - pointerDownRef.current.time

    const gesture = classifyPointerGesture(downPos, upPos, elapsed)

    if (gesture === 'tap') {
      // On tap, move cursor to the tapped position
      const normalized = pointerToNormalized(e)
      setCursorPos(normalized)
    }

    setIsDragging(false)

    // Release pointer capture
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }, [interactive, confirmed, pointerToNormalized])

  // ─── Keyboard Handler ─────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e) => {
    if (!interactive || confirmed) return

    const arrowKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

    if (arrowKeys.includes(e.key)) {
      e.preventDefault()
      const newPos = moveCursorByKey(cursorPos, e.key)
      setCursorPos(newPos)
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      confirmPosition()
    }
  }, [interactive, confirmed, cursorPos, confirmPosition])

  // ─── Candidate Label Selection ────────────────────────────────────────────

  const handleCandidateSelect = useCallback((feelingId) => {
    if (!interactive || confirmed) return

    setConfirmed(true)
    onFeelingSelected(feelingId)

    // Announce confirmation
    if (announcerRef?.current) {
      announcerRef.current.announceAssertive(
        `Selected: ${feelingId}. Moving to nuance selection.`
      )
    }
  }, [interactive, confirmed, onFeelingSelected, announcerRef])

  // ─── Computed Values ──────────────────────────────────────────────────────

  const interpolatedColor = interpolateQuadrantColor(cursorPos.x, cursorPos.y)
  const particleOpacity = computeParticleOpacity(cursorPos.x)
  const currentFeelings = positionToFeelings(cursorPos.x, cursorPos.y)
  const showCandidates = !confirmed && currentFeelings.length >= 1

  // Background gradient: interpolated color at ≤15% opacity, fixed center to avoid visual shake.
  // Color shifts smoothly with 800ms transition — gentle and non-jarring.
  const bgStyle = {
    background: `radial-gradient(circle at 50% 50%, ${interpolatedColor.replace('hsl(', 'hsla(').replace(')', ', 0.15)')}, transparent 70%), #050510`,
    transition: 'background 800ms ease-out',
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center w-full">
      {/* Mood Space Container */}
      <div
        ref={containerRef}
        role="application"
        aria-label="Mood space: use arrow keys to position your mood along energy (up-down) and pleasantness (left-right) axes. Press Enter or Space to confirm."
        tabIndex={0}
        className="relative w-full min-h-[60vh] max-w-[600px] mx-auto rounded-2xl overflow-hidden cursor-crosshair select-none outline-none focus:ring-2 focus:ring-violet-500/60 md:min-h-[50vh]"
        style={{
          ...bgStyle,
          '--particle-opacity': particleOpacity,
          touchAction: 'none', // Prevent scroll on touch drag (requirement 7.3)
          padding: '16px',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        {/* Axis Labels */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          {/* Energy axis (vertical) */}
          <span className="absolute top-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/40 uppercase tracking-wide">
            Energised
          </span>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-semibold text-white/40 uppercase tracking-wide">
            Calm
          </span>

          {/* Pleasantness axis (horizontal) */}
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/40 uppercase tracking-wide writing-mode-vertical"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            Unpleasant
          </span>
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-white/40 uppercase tracking-wide"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
          >
            Pleasant
          </span>
        </div>

        {/* Particle Field — ambient CSS-animated particles */}
        <ParticleField
          qualityTier={qualityTier}
        />

        {/* Cursor — glowing orb indicator */}
        <Cursor x={cursorPos.x} y={cursorPos.y} />
      </div>

      {/* Candidate Labels — shown when active quadrant has multiple feelings */}
      {showCandidates && (
        <div className="mt-4 w-full max-w-[600px]">
          <p className="text-xs text-white/50 text-center mb-2 uppercase tracking-wide">
            Pick an emotion planet
          </p>
          <CandidateLabels
            feelings={currentFeelings}
            onSelect={handleCandidateSelect}
          />
        </div>
      )}
    </div>
  )
}
