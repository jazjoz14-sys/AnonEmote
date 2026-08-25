/**
 * Mood Space — Pure utility functions for the Check-In Experience.
 *
 * Implements the Yale Mood Meter quadrant model:
 *   - X axis (Pleasantness): left = unpleasant, right = pleasant
 *   - Y axis (Energy): bottom = calm, top = energised
 *
 * All functions are pure (no side effects, no DOM access) and suitable
 * for property-based testing.
 */

// ─── Quadrant Configuration ────────────────────────────────────────────────────

/**
 * Maps quadrant IDs to their properties: position in the 2D space,
 * associated colors (HSL), and the feeling IDs they contain.
 *
 * Layout:
 *   top-left = red (high energy + unpleasant)
 *   top-right = yellow (high energy + pleasant)
 *   bottom-left = blue (low energy + unpleasant)
 *   bottom-right = green (low energy + pleasant)
 */
export const QUADRANT_MAP = {
  yellow: {
    label: 'High Energy + Pleasant',
    position: { xMin: 0.5, xMax: 1.0, yMin: 0.5, yMax: 1.0 },
    color: { h: 38, s: 92, l: 50 },
    feelings: ['joy', 'doodle'],
  },
  red: {
    label: 'High Energy + Unpleasant',
    position: { xMin: 0.0, xMax: 0.5, yMin: 0.5, yMax: 1.0 },
    color: { h: 350, s: 80, l: 55 },
    feelings: ['vent', 'anxiety'],
  },
  green: {
    label: 'Low Energy + Pleasant',
    position: { xMin: 0.5, xMax: 1.0, yMin: 0.0, yMax: 0.5 },
    color: { h: 160, s: 72, l: 45 },
    feelings: ['neutral', 'advice'],
  },
  blue: {
    label: 'Low Energy + Unpleasant',
    position: { xMin: 0.0, xMax: 0.5, yMin: 0.0, yMax: 0.5 },
    color: { h: 240, s: 70, l: 45 },
    feelings: ['grief'],
  },
}

// ─── Quadrant Detection ────────────────────────────────────────────────────────

/**
 * Maps a normalized (x, y) position to a quadrant ID.
 *
 * x: 0 = far-unpleasant (left), 1 = far-pleasant (right)
 * y: 0 = calm (bottom), 1 = energised (top)
 *
 * @param {number} x - Normalized pleasantness [0, 1]
 * @param {number} y - Normalized energy [0, 1]
 * @returns {'yellow' | 'red' | 'green' | 'blue'}
 */
export function positionToQuadrant(x, y) {
  const isRight = x >= 0.5
  const isTop = y >= 0.5

  if (isTop && isRight) return 'yellow'
  if (isTop && !isRight) return 'red'
  if (!isTop && isRight) return 'green'
  return 'blue'
}

// ─── Quadrant → Feelings Lookup ────────────────────────────────────────────────

/**
 * Returns the array of feeling IDs associated with a given quadrant.
 *
 * @param {'yellow' | 'red' | 'green' | 'blue'} quadrant - Quadrant identifier
 * @returns {string[]} Array of feeling IDs (e.g., ['joy', 'doodle'])
 */
export function quadrantToFeelings(quadrant) {
  const entry = QUADRANT_MAP[quadrant]
  return entry ? [...entry.feelings] : []
}

// ─── Position → Feelings (Proximity-Aware) ─────────────────────────────────────

/**
 * Returns feeling IDs relevant to a given position, considering proximity
 * to quadrant boundaries. Near the center, feelings from adjacent quadrants
 * are included so users see more options when their mood is ambiguous.
 *
 * Proximity logic:
 * - If both x and y are within 0.15 of 0.5 (center zone): show ALL feelings from all 4 quadrants
 * - If x is within 0.15 of 0.5 (near vertical boundary): show feelings from both horizontal neighbors
 * - If y is within 0.15 of 0.5 (near horizontal boundary): show feelings from both vertical neighbors
 * - Otherwise: show only the current quadrant's feelings
 *
 * @param {number} x - Normalized pleasantness [0, 1]
 * @param {number} y - Normalized energy [0, 1]
 * @returns {string[]} Array of feeling IDs (deduplicated)
 */
export function positionToFeelings(x, y) {
  const BOUNDARY_THRESHOLD = 0.15
  const nearVerticalBoundary = Math.abs(x - 0.5) < BOUNDARY_THRESHOLD
  const nearHorizontalBoundary = Math.abs(y - 0.5) < BOUNDARY_THRESHOLD

  // Determine which quadrants to include
  const quadrantsToInclude = new Set()

  // Always include the primary quadrant
  quadrantsToInclude.add(positionToQuadrant(x, y))

  if (nearVerticalBoundary && nearHorizontalBoundary) {
    // Near center: include all 4 quadrants
    quadrantsToInclude.add('yellow')
    quadrantsToInclude.add('red')
    quadrantsToInclude.add('green')
    quadrantsToInclude.add('blue')
  } else if (nearVerticalBoundary) {
    // Near vertical boundary (x ≈ 0.5): include left AND right quadrants at current y level
    if (y >= 0.5) {
      quadrantsToInclude.add('yellow') // top-right
      quadrantsToInclude.add('red')    // top-left
    } else {
      quadrantsToInclude.add('green')  // bottom-right
      quadrantsToInclude.add('blue')   // bottom-left
    }
  } else if (nearHorizontalBoundary) {
    // Near horizontal boundary (y ≈ 0.5): include top AND bottom quadrants at current x level
    if (x >= 0.5) {
      quadrantsToInclude.add('yellow') // top-right
      quadrantsToInclude.add('green')  // bottom-right
    } else {
      quadrantsToInclude.add('red')    // top-left
      quadrantsToInclude.add('blue')   // bottom-left
    }
  }

  // Collect and deduplicate feelings
  const feelings = []
  for (const quadrant of quadrantsToInclude) {
    for (const feeling of QUADRANT_MAP[quadrant].feelings) {
      if (!feelings.includes(feeling)) {
        feelings.push(feeling)
      }
    }
  }

  return feelings
}

// ─── Color Interpolation ───────────────────────────────────────────────────────

/**
 * Computes the background gradient color based on cursor position.
 * Uses bilinear interpolation across the 4 quadrant corner colors so
 * transitions are smooth across boundaries (no abrupt jumps).
 *
 * Corner mapping:
 *   topLeft     = red    (h:350, s:80, l:55)
 *   topRight    = yellow (h:38,  s:92, l:50)
 *   bottomLeft  = blue   (h:240, s:70, l:45)
 *   bottomRight = green  (h:160, s:72, l:45)
 *
 * @param {number} x - Normalized pleasantness [0, 1]
 * @param {number} y - Normalized energy [0, 1]
 * @returns {string} CSS hsl() color string
 */
export function interpolateQuadrantColor(x, y) {
  const corners = {
    topLeft:     { h: 350, s: 80, l: 55 },
    topRight:    { h: 38,  s: 92, l: 50 },
    bottomLeft:  { h: 240, s: 70, l: 45 },
    bottomRight: { h: 160, s: 72, l: 45 },
  }

  // Bilinear interpolation for each HSL channel
  const topH = corners.topLeft.h + (corners.topRight.h - corners.topLeft.h) * x
  const bottomH = corners.bottomLeft.h + (corners.bottomRight.h - corners.bottomLeft.h) * x
  const h = bottomH + (topH - bottomH) * y

  const topS = corners.topLeft.s + (corners.topRight.s - corners.topLeft.s) * x
  const bottomS = corners.bottomLeft.s + (corners.bottomRight.s - corners.bottomLeft.s) * x
  const s = bottomS + (topS - bottomS) * y

  const topL = corners.topLeft.l + (corners.topRight.l - corners.topLeft.l) * x
  const bottomL = corners.bottomLeft.l + (corners.bottomRight.l - corners.bottomLeft.l) * x
  const l = bottomL + (topL - bottomL) * y

  // Normalize hue to [0, 360) range (handles interpolation through negatives)
  const normalizedH = ((Math.round(h) % 360) + 360) % 360

  return `hsl(${normalizedH}, ${Math.round(s)}%, ${Math.round(l)}%)`
}

// ─── Particle Parameter Scaling ────────────────────────────────────────────────

/**
 * Computes particle travel speed from the energy (Y) axis position.
 * Linear scale: bottom (y=0) → 0.5 vw/s, top (y=1) → 4.0 vw/s
 *
 * @param {number} energyY - Normalized [0, 1]
 * @returns {number} Speed in viewport-width units per second
 */
export function computeParticleSpeed(energyY) {
  const MIN_SPEED = 0.5
  const MAX_SPEED = 4.0
  const clamped = Math.max(0, Math.min(1, energyY))
  return MIN_SPEED + (MAX_SPEED - MIN_SPEED) * clamped
}

/**
 * Computes particle glow opacity from the pleasantness (X) axis position.
 * Linear scale: left (x=0) → 0.2 opacity, right (x=1) → 1.0 opacity
 *
 * @param {number} pleasantnessX - Normalized [0, 1]
 * @returns {number} Opacity value [0.2, 1.0]
 */
export function computeParticleOpacity(pleasantnessX) {
  const MIN_OPACITY = 0.2
  const MAX_OPACITY = 1.0
  const clamped = Math.max(0, Math.min(1, pleasantnessX))
  return MIN_OPACITY + (MAX_OPACITY - MIN_OPACITY) * clamped
}

// ─── Pointer Gesture Classification ───────────────────────────────────────────

/**
 * Classifies a pointer interaction as either a "tap" or "drag".
 *
 * Tap: pointer up within 10px of pointer down AND within 300ms.
 * Drag: pointer moved more than 10px from origin OR elapsed > 300ms.
 *
 * @param {{ x: number, y: number }} downPos - Pointer-down coordinates (px)
 * @param {{ x: number, y: number }} upPos - Pointer-up coordinates (px)
 * @param {number} elapsed - Duration in ms between down and up
 * @returns {'tap' | 'drag'}
 */
export function classifyPointerGesture(downPos, upPos, elapsed) {
  const dx = upPos.x - downPos.x
  const dy = upPos.y - downPos.y
  const distance = Math.sqrt(dx * dx + dy * dy)

  if (distance <= 10 && elapsed <= 300) return 'tap'
  return 'drag'
}

// ─── Keyboard Cursor Movement ──────────────────────────────────────────────────

/**
 * Moves cursor position by discrete 10% steps, clamped to [0, 1].
 *
 * Arrow key mapping:
 *   ArrowUp    → y + 0.1 (more energised)
 *   ArrowDown  → y - 0.1 (more calm)
 *   ArrowRight → x + 0.1 (more pleasant)
 *   ArrowLeft  → x - 0.1 (more unpleasant)
 *
 * Returns the original position unchanged if the key is not a recognized arrow.
 *
 * @param {{ x: number, y: number }} current - Current normalized position
 * @param {string} key - Keyboard event key value
 * @returns {{ x: number, y: number }} New position (clamped to [0, 1])
 */
export function moveCursorByKey(current, key) {
  const STEP = 0.1
  let { x, y } = current

  switch (key) {
    case 'ArrowUp':
      y = Math.min(1, y + STEP)
      break
    case 'ArrowDown':
      y = Math.max(0, y - STEP)
      break
    case 'ArrowRight':
      x = Math.min(1, x + STEP)
      break
    case 'ArrowLeft':
      x = Math.max(0, x - STEP)
      break
    default:
      // Unrecognized key — return position unchanged
      break
  }

  return { x, y }
}
