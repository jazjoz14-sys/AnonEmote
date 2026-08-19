import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'

// Mock Three.js — DoodlePlanetHybrid imports THREE
vi.mock('three', () => ({
  CanvasTexture: vi.fn(),
  Box3: vi.fn(() => ({
    setFromObject: vi.fn().mockReturnThis(),
    getBoundingSphere: vi.fn(),
  })),
  Sphere: vi.fn(() => ({ radius: 1 })),
}))

// Mock the Zustand store
vi.mock('../../../../store/useAppStore', () => ({
  default: vi.fn(() => []),
}))

import { computeGrid } from '../DoodlePlanetHybrid.jsx'

// Feature: custom-3d-models, Property 16: Doodle Canvas Tiling
describe('Property 16: Doodle Canvas Tiling', () => {
  it('grid dimensions do not exceed canvas bounds (cols*cellW <= 1024, rows*cellH <= 1024)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (count) => {
          const { cols, rows, cellW, cellH } = computeGrid(count)

          // Grid must not exceed the 1024×1024 canvas
          expect(cols * cellW).toBeLessThanOrEqual(1024)
          expect(rows * cellH).toBeLessThanOrEqual(1024)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('grid has enough cells for all drawings (cols * rows >= count)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (count) => {
          const { cols, rows } = computeGrid(count)

          // Enough cells to hold every drawing
          expect(cols * rows).toBeGreaterThanOrEqual(count)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('cell dimensions are positive (cellW > 0 and cellH > 0)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (count) => {
          const { cellW, cellH } = computeGrid(count)

          expect(cellW).toBeGreaterThan(0)
          expect(cellH).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('each drawing maps to a unique non-overlapping cell', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (count) => {
          const { cols } = computeGrid(count)

          // Each drawing i gets cell (i % cols, floor(i / cols)) — verify uniqueness
          const cells = new Set()
          for (let i = 0; i < count; i++) {
            const col = i % cols
            const row = Math.floor(i / cols)
            const key = `${col},${row}`
            // No duplicate cell assignments
            expect(cells.has(key)).toBe(false)
            cells.add(key)
          }

          // All drawings have been assigned unique cells
          expect(cells.size).toBe(count)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('grid covers as much of the 1024×1024 canvas as possible (minimal waste)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (count) => {
          const { cols, rows, cellW, cellH } = computeGrid(count)

          // The wasted pixels per dimension should be less than one cell size
          // (since cellW = floor(1024 / cols), waste = 1024 - cols * cellW < cols)
          const wasteX = 1024 - cols * cellW
          const wasteY = 1024 - rows * cellH

          expect(wasteX).toBeGreaterThanOrEqual(0)
          expect(wasteX).toBeLessThan(cols)
          expect(wasteY).toBeGreaterThanOrEqual(0)
          expect(wasteY).toBeLessThan(rows)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('handles zero/negative count gracefully with a single full-size cell', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100, max: 0 }),
        (count) => {
          const { cols, rows, cellW, cellH } = computeGrid(count)

          expect(cols).toBe(1)
          expect(rows).toBe(1)
          expect(cellW).toBe(1024)
          expect(cellH).toBe(1024)
        }
      ),
      { numRuns: 100 }
    )
  })

  // **Validates: Requirements 8.2**
})
