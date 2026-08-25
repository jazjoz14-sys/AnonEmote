/**
 * Constellation Layout Algorithm
 *
 * Generates organic, scattered positions for nuance words in the
 * NuanceConstellation check-in step. Words float like stars rather
 * than sitting in a rigid grid — the layout uses a seeded PRNG so
 * positions are deterministic (same seed → same arrangement) but
 * visually feel hand-placed.
 *
 * Strategy:
 * 1. Divide container into a 3×2 grid of cells (for 6 items)
 * 2. Place each item at the cell center
 * 3. Apply random offsets (±10–30% horizontal, ±5–20% vertical)
 * 4. Validate no overlaps; nudge items if hit areas collide
 * 5. Clamp all positions to container bounds
 *
 * All exported functions are pure — no DOM access, no side effects.
 */

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum hit-area dimension in px (WCAG touch target). */
const MIN_HIT = 44

/** Minimum gap between adjacent hit areas in px. */
const MIN_GAP = 8

/** Grid subdivision for initial placement. */
const COLS = 3
const ROWS = 2

// ─── Seeded PRNG ────────────────────────────────────────────────────────────

/**
 * Creates a mulberry32 pseudo-random number generator from a seed.
 * Returns a function that produces the next float in [0, 1) on each call.
 *
 * Mulberry32 is a simple 32-bit PRNG with good statistical properties
 * and minimal code footprint — ideal for deterministic layout without
 * importing a library.
 *
 * @param {number} seed - Integer seed value
 * @returns {() => number} Function returning next pseudo-random float [0, 1)
 */
export function createPRNG(seed) {
  let s = seed | 0
  return function rand() {
    s = (s + 0x6D2B79F5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Layout Generation ──────────────────────────────────────────────────────

/**
 * Generates organic, non-grid positions for nuance words within a container.
 * Uses a seeded pseudo-random approach for deterministic but scattered placement.
 * Ensures all items have ≥ 44×44px hit areas with ≥ 8px gaps.
 *
 * Each returned position represents the center of the item's hit area.
 * The `width` and `height` fields define the interactive region around that center.
 *
 * @param {number} count - Number of items to place (typically 6)
 * @param {number} containerWidth - Available width in px (must be ≥ 280)
 * @param {number} containerHeight - Available height in px (must be ≥ 200)
 * @param {number} seed - Deterministic seed for reproducibility
 * @returns {Array<{ index: number, x: number, y: number, width: number, height: number, drift: number, duration: number, delay: number }>}
 */
export function generateConstellationPositions(count, containerWidth, containerHeight, seed) {
  const rand = createPRNG(seed)

  const cellW = containerWidth / COLS
  const cellH = containerHeight / ROWS
  const itemWidth = Math.max(MIN_HIT, cellW * 0.7)

  const positions = []

  for (let i = 0; i < count; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)

    // Cell center
    const cx = cellW * (col + 0.5)
    const cy = cellH * (row + 0.5)

    // Random offset: scatter within the cell but stay organic.
    // Use cell-relative ranges that approximate the spec's ±10-30% / ±5-20%
    // while keeping items near their grid slots to avoid impossible collisions.
    const maxOffsetX = (cellW - itemWidth) / 2 - MIN_GAP
    const maxOffsetY = (cellH - MIN_HIT) / 2 - MIN_GAP
    const offsetX = maxOffsetX > 0 ? (rand() * 2 - 1) * maxOffsetX * (0.4 + rand() * 0.6) : 0
    const offsetY = maxOffsetY > 0 ? (rand() * 2 - 1) * maxOffsetY * (0.3 + rand() * 0.7) : 0

    // Clamp to container bounds (keeping half the hit area inside)
    const x = Math.max(MIN_HIT / 2, Math.min(containerWidth - MIN_HIT / 2, cx + offsetX))
    const y = Math.max(MIN_HIT / 2, Math.min(containerHeight - MIN_HIT / 2, cy + offsetY))

    positions.push({
      index: i,
      x,
      y,
      width: itemWidth,
      height: MIN_HIT,
      drift: 2 + rand() * 4,       // 2–6px floating amplitude
      duration: 3 + rand() * 3,    // 3–6s per cycle
      delay: i * 0.15,             // stagger entrance
    })
  }

  // Collision resolution: nudge overlapping items apart.
  // Multiple passes handle cascading nudges and wall-clamping edge cases.
  // With 6 items in a 3×2 grid, 3 passes converge in all practical cases.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i]
        const b = positions[j]
        const dx = Math.abs(a.x - b.x)
        const dy = Math.abs(a.y - b.y)
        const minDx = (a.width + b.width) / 2 + MIN_GAP
        const minDy = (a.height + b.height) / 2 + MIN_GAP

        if (dx < minDx && dy < minDy) {
          // Try nudging on the axis with less overlap first;
          // if wall clamping prevents sufficient separation, nudge the other axis.
          const nudgeOnX = () => {
            const currentDx = Math.abs(positions[i].x - positions[j].x)
            const deficit = minDx - currentDx
            if (deficit <= 0) return
            const nudge = deficit / 2 + 1
            positions[i].x = Math.max(MIN_HIT / 2, positions[i].x - nudge)
            positions[j].x = Math.min(containerWidth - MIN_HIT / 2, positions[j].x + nudge)
          }
          const nudgeOnY = () => {
            const currentDy = Math.abs(positions[i].y - positions[j].y)
            const deficit = minDy - currentDy
            if (deficit <= 0) return
            const nudge = deficit / 2 + 1
            positions[i].y = Math.max(MIN_HIT / 2, positions[i].y - nudge)
            positions[j].y = Math.min(containerHeight - MIN_HIT / 2, positions[j].y + nudge)
          }

          if (dx <= dy) {
            nudgeOnX()
            // Check if clamping prevented sufficient separation — try Y too
            const newDx = Math.abs(positions[i].x - positions[j].x)
            if (newDx < minDx) {
              nudgeOnY()
            }
          } else {
            nudgeOnY()
            // Check if clamping prevented sufficient separation — try X too
            const newDy = Math.abs(positions[i].y - positions[j].y)
            if (newDy < minDy) {
              nudgeOnX()
            }
          }
        }
      }
    }
  }

  return positions
}

// ─── Animation Parameters ───────────────────────────────────────────────────

/**
 * Generates animation parameters for constellation items.
 * Each item gets unique drift, duration, and delay values so the
 * floating motion looks organic rather than synchronised.
 *
 * @param {number} count - Number of items to generate params for
 * @param {number} seed - Deterministic seed for reproducibility
 * @returns {Array<{ drift: number, duration: number, delay: number }>}
 *   - drift: floating amplitude in px [2, 6]
 *   - duration: cycle time in seconds [3, 6]
 *   - delay: animation start delay in seconds (staggered)
 */
export function generateAnimationParams(count, seed) {
  const rand = createPRNG(seed)
  const params = []

  for (let i = 0; i < count; i++) {
    params.push({
      drift: 2 + rand() * 4,       // 2–6px
      duration: 3 + rand() * 3,    // 3–6s
      delay: i * 0.15,             // stagger
    })
  }

  return params
}

// ─── Validation ─────────────────────────────────────────────────────────────

/**
 * Validates that all hit areas meet minimum sizing and spacing requirements.
 * Used in tests and at runtime (debug mode) to ensure WCAG touch-target
 * compliance.
 *
 * @param {Array<{ x: number, y: number, width: number, height: number }>} positions - Layout positions to validate
 * @param {number} [minSize=44] - Minimum hit area dimension in px
 * @param {number} [minGap=8] - Minimum gap between adjacent hit areas in px
 * @returns {{ valid: boolean, violations: Array<string> }}
 */
export function validateHitAreas(positions, minSize = MIN_HIT, minGap = MIN_GAP) {
  const violations = []

  // Check individual sizing
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]
    if (p.width < minSize) {
      violations.push(`Item ${i}: width ${p.width}px < minimum ${minSize}px`)
    }
    if (p.height < minSize) {
      violations.push(`Item ${i}: height ${p.height}px < minimum ${minSize}px`)
    }
  }

  // Check pairwise gaps.
  // Two items violate the gap requirement if their hit areas are closer
  // than minGap on BOTH axes simultaneously. If they're separated by ≥ minGap
  // on at least one axis, the visual gap is sufficient.
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const a = positions[i]
      const b = positions[j]

      // Edge-to-edge distance on each axis
      const dx = Math.abs(a.x - b.x)
      const dy = Math.abs(a.y - b.y)
      const gapX = dx - (a.width + b.width) / 2
      const gapY = dy - (a.height + b.height) / 2

      // If separated by ≥ minGap on at least one axis, no violation
      if (gapX >= minGap || gapY >= minGap) {
        continue
      }

      // Both axes are closer than minGap — report the worse one
      const actualGap = Math.max(gapX, gapY)
      violations.push(
        `Items ${i} and ${j}: gap ${actualGap.toFixed(1)}px < minimum ${minGap}px`
      )
    }
  }

  return { valid: violations.length === 0, violations }
}
