/**
 * Unit Test: WebGL Context Loss Fallback Behavior
 *
 * Validates: Requirements 5.8, 8.3
 *
 * Tests that when the WebGL context is lost (or Canvas hasn't initialized),
 * the carousel falls back to static planet icon images without crashing
 * or showing blank slides.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import React from 'react'

// ── Track the onContextLost callback registered by CarouselCanvas ────────────
let capturedOnContextLost = null
let capturedOnReady = null

// Mock useAppStore to provide setPhase
vi.mock('../store/useAppStore', () => ({
  default: Object.assign(
    (selector) => {
      const state = { setPhase: vi.fn() }
      return selector ? selector(state) : state
    },
    { getState: () => ({ setPhase: vi.fn() }) }
  ),
}))

// Mock device hooks — desktop viewport (useIsSmallScreen = false)
vi.mock('../lib/device', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useIsSmallScreen: () => false,
    useViewportSize: () => ({ width: 1024, height: 768 }),
  }
})

// Mock React Three Fiber — Canvas renders a simple div, useFrame is a no-op
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => React.createElement('div', { 'data-testid': 'r3f-canvas' }, null),
  useFrame: vi.fn(),
}))

// Mock @react-three/drei — View renders nothing (we test fallback path), View.Port is null
vi.mock('@react-three/drei', () => ({
  View: ({ children }) => React.createElement('div', { 'data-testid': 'drei-view' }, children),
}))
// Assign View.Port after import
vi.mock('@react-three/drei', () => {
  const View = ({ children }) => React.createElement('div', { 'data-testid': 'drei-view' }, children)
  View.Port = () => null
  return { View }
})

// Mock Three.js
vi.mock('three', () => ({
  default: {},
  Color: vi.fn(),
  Vector3: vi.fn(),
}))

// Mock clay module
vi.mock('../components/3d/clay', () => ({
  CLAY: { roughness: 0.95, metalness: 0.0 },
  makeClayBlob: vi.fn(() => ({
    dispose: vi.fn(),
    attributes: { position: { array: new Float32Array(30) } },
  })),
}))

// Mock CarouselCanvas — captures onContextLost and onReady, renders a placeholder
vi.mock('../components/3d/CarouselCanvas', () => ({
  default: ({ onContextLost, onReady, fallback }) => {
    capturedOnContextLost = onContextLost
    capturedOnReady = onReady
    if (fallback) return null
    return React.createElement('div', { 'data-testid': 'carousel-canvas' })
  },
}))

// Mock CarouselPlanetScene — renders a simple placeholder
vi.mock('../components/3d/CarouselPlanetScene', () => ({
  default: ({ planet, active }) =>
    React.createElement('div', { 'data-testid': `planet-scene-${planet.id}` }),
}))

// Mock planets data
vi.mock('../data/planets', () => ({
  PLANETS: [
    { id: 'joy', label: 'Joy', color: '#f59e0b', size: 1.2, spinSpeed: 0.25 },
    { id: 'vent', label: 'Venting', color: '#3b82f6', size: 1.1, spinSpeed: 0.22 },
    { id: 'advice', label: 'Seek Advice', color: '#10b981', size: 1.0, spinSpeed: 0.20 },
    { id: 'grief', label: 'Grief & Loss', color: '#6366f1', size: 1.15, spinSpeed: 0.24 },
    { id: 'anxiety', label: 'Anxiety', color: '#ec4899', size: 1.05, spinSpeed: 0.21 },
    { id: 'neutral', label: 'Reflections', color: '#94a3b8', size: 1.1, spinSpeed: 0.23 },
    { id: 'doodle', label: 'Doodle Drift', color: '#e2e2e2', size: 1.0, spinSpeed: 0.19 },
  ],
}))

import LandingScreen from './LandingScreen'

describe('Context Loss Fallback Behavior (Req 5.8, 8.3)', () => {
  let canvasGetContextSpy

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnContextLost = null
    capturedOnReady = null

    // Mock canvas 2D context for the Particles component
    const mockCtx = {
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    }
    canvasGetContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(mockCtx)
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1)
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    cleanup()
    canvasGetContextSpy?.mockRestore()
    vi.restoreAllMocks()
  })

  it('shows static planet icons as fallback before Canvas is ready', () => {
    render(<LandingScreen />)

    // Before onReady is called, static icons should be visible (opacity-100)
    const joyIcons = screen.getAllByAltText('Joy')
    // At least one joy icon should be visible (the one in the slide)
    expect(joyIcons.length).toBeGreaterThan(0)

    // The planet slide images should be in the document
    const allImgs = document.querySelectorAll('img')
    const planetIconPaths = ['/icons/joy.png', '/icons/venting.png', '/icons/seek advice.png',
      '/icons/grief.png', '/icons/anxiety.png', '/icons/reflections.png', '/icons/doodle.svg']
    
    const foundIconPaths = Array.from(allImgs).map(img => img.getAttribute('src'))
    // All 7 planet icons should be present somewhere in the DOM
    for (const iconPath of planetIconPaths) {
      expect(foundIconPaths).toContain(iconPath)
    }
  })

  it('shows static planet icons after context loss event', () => {
    render(<LandingScreen />)

    // First, signal that Canvas is ready (so static icons fade out)
    expect(capturedOnReady).toBeInstanceOf(Function)
    act(() => {
      capturedOnReady()
    })

    // Now simulate context loss
    expect(capturedOnContextLost).toBeInstanceOf(Function)
    act(() => {
      capturedOnContextLost()
    })

    // After context loss, static icons should be visible again (opacity-100 class)
    // Check that all planet icon images are rendered in the fallback state
    const allImgs = document.querySelectorAll('img')
    const planetIconPaths = ['/icons/joy.png', '/icons/venting.png', '/icons/seek advice.png',
      '/icons/grief.png', '/icons/anxiety.png', '/icons/reflections.png', '/icons/doodle.svg']
    
    const foundSrcs = Array.from(allImgs).map(img => img.getAttribute('src'))
    for (const iconPath of planetIconPaths) {
      expect(foundSrcs).toContain(iconPath)
    }

    // The large slide fallback icons (w-40 h-40) should have opacity-100 (visible)
    // Filter to only the large icons used as fallback in the tracking region
    const slideImgs = Array.from(allImgs).filter(img =>
      planetIconPaths.includes(img.getAttribute('src')) &&
      img.className.includes('transition-opacity')
    )
    expect(slideImgs.length).toBe(7) // one per planet slide
    for (const img of slideImgs) {
      expect(img.className).toContain('opacity-100')
    }
  })

  it('does not crash or show blank slides on context loss', () => {
    const { container } = render(<LandingScreen />)

    // Signal ready, then lose context
    act(() => {
      if (capturedOnReady) capturedOnReady()
    })
    act(() => {
      if (capturedOnContextLost) capturedOnContextLost()
    })

    // Page should still be rendered — check hero headline exists
    expect(screen.getByText('Speak')).toBeInTheDocument()
    expect(screen.getByText('Fear')).toBeInTheDocument()

    // The carousel section should still have content (not blank)
    expect(screen.getByText('One for every feeling.')).toBeInTheDocument()

    // All 7 planet labels should still be visible in the info panels
    expect(screen.getAllByText('Joy').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Venting').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Seek Advice').length).toBeGreaterThan(0)
  })

  it('removes 3D Views (drei-view) from DOM after context loss', () => {
    const { container } = render(<LandingScreen />)

    // Before context loss, View elements should be present
    act(() => {
      if (capturedOnReady) capturedOnReady()
    })

    const viewsBefore = container.querySelectorAll('[data-testid="drei-view"]')
    // Views should be present when context is healthy
    expect(viewsBefore.length).toBeGreaterThan(0)

    // Trigger context loss
    act(() => {
      capturedOnContextLost()
    })

    // After context loss, Views should be removed (contextLost === true suppresses them)
    const viewsAfter = container.querySelectorAll('[data-testid="drei-view"]')
    expect(viewsAfter.length).toBe(0)
  })

  it('CarouselCanvas receives fallback=true after context loss', () => {
    const { container } = render(<LandingScreen />)

    // Before context loss, the carousel canvas placeholder should be rendered
    expect(container.querySelector('[data-testid="carousel-canvas"]')).toBeTruthy()

    // Trigger context loss
    act(() => {
      if (capturedOnReady) capturedOnReady()
    })
    act(() => {
      capturedOnContextLost()
    })

    // After context loss, CarouselCanvas renders null (fallback=true)
    expect(container.querySelector('[data-testid="carousel-canvas"]')).toBeNull()
  })
})
