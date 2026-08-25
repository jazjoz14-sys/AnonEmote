import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

/**
 * LandingScreen Desktop Canvas Count Test
 *
 * Validates Requirements 5.1, 5.3, 8.1, 8.5:
 * - Exactly 2 WebGL Canvas elements on desktop (background + carousel)
 * - No per-slide Canvas instantiation
 *
 * Strategy: Mock @react-three/fiber's Canvas to render a trackable
 * <div data-testid="r3f-canvas"> so we can count instances without
 * needing actual WebGL (jsdom has no GPU).
 */

// ── Setup ──────────────────────────────────────────────────────────────────────

// Polyfill HTMLCanvasElement.getContext for jsdom (Particles component uses 2D canvas)
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  clearRect: () => {},
  beginPath: () => {},
  arc: () => {},
  fill: () => {},
  fillStyle: '',
}))

// ── Mocks ──────────────────────────────────────────────────────────────────────

// Mock R3F Canvas to render a countable DOM element
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, onCreated, ...props }) => {
    // Simulate onCreated callback so CarouselCanvas's handleCreated runs
    if (onCreated) {
      const mockCanvas = document.createElement('canvas')
      const mockGl = {
        domElement: mockCanvas,
      }
      // Use queueMicrotask so the component is mounted before callback fires
      queueMicrotask(() => onCreated({ gl: mockGl }))
    }
    return <div data-testid="r3f-canvas">{children}</div>
  },
  useFrame: () => {},
  useThree: () => ({ gl: { domElement: document.createElement('canvas') } }),
}))

vi.mock('@react-three/drei', () => {
  const View = ({ children }) => <div data-testid="drei-view">{children}</div>
  View.Port = () => <div data-testid="drei-view-port" />
  return { View }
})

// Mock Three.js geometry/material classes to avoid WebGL dependency
vi.mock('three', () => ({
  SphereGeometry: class {
    dispose() {}
  },
  MeshStandardMaterial: class {
    dispose() {}
  },
  Color: class {
    constructor() {}
  },
  Vector3: class {
    constructor() { this.x = 0; this.y = 0; this.z = 0 }
  },
}))

// Mock device hook — return false for desktop (viewport > 768px)
vi.mock('../lib/device', () => ({
  useIsSmallScreen: () => false,
}))

// Mock Zustand store
vi.mock('../store/useAppStore', () => ({
  default: (selector) => {
    if (typeof selector === 'function') {
      return selector({ setPhase: () => {}, phase: 'landing' })
    }
    return { setPhase: () => {}, phase: 'landing' }
  },
}))

// Mock clay blob generation to avoid procedural geometry in jsdom
vi.mock('../components/3d/clay', () => ({
  CLAY: { roughness: 0.95, metalness: 0.0 },
  makeClayBlob: () => ({
    dispose: () => {},
    attributes: { position: { array: new Float32Array(0) } },
  }),
}))

// Mock CarouselPlanetScene — avoids Three.js mesh/material rendering
vi.mock('../components/3d/CarouselPlanetScene', () => ({
  default: ({ planet, active }) => (
    <div data-testid="carousel-planet-scene" data-planet={planet?.id} data-active={active} />
  ),
}))

// Mock PlanetDecor to avoid Three.js geometry
vi.mock('../components/3d/PlanetDecor', () => ({
  default: () => <div data-testid="planet-decor" />,
}))

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('LandingScreen desktop Canvas count', () => {
  it('renders exactly 2 Canvas elements (background + carousel)', async () => {
    // Dynamic import after mocks are registered
    const { default: LandingScreen } = await import('./LandingScreen')

    const { container } = render(<LandingScreen />)

    const canvases = container.querySelectorAll('[data-testid="r3f-canvas"]')

    // Requirement 5.1: All carousel scenes use one shared Canvas
    // Requirement 5.3: No more than 2 total Canvas elements
    // Requirement 8.1: Max 2 WebGL contexts on desktop
    // Requirement 8.5: No per-slide Canvas elements
    expect(canvases).toHaveLength(2)
  })

  it('does not create per-slide Canvas elements (no context explosion)', async () => {
    const { default: LandingScreen } = await import('./LandingScreen')

    const { container } = render(<LandingScreen />)

    const canvases = container.querySelectorAll('[data-testid="r3f-canvas"]')

    // If the old bug existed (8+ canvases for 7 planets + background), this would fail
    expect(canvases.length).toBeLessThanOrEqual(2)
    // Specifically: should NOT have 7+ canvases (one per planet slide)
    expect(canvases.length).not.toBeGreaterThan(2)
  })
})
