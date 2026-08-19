/**
 * Preservation Property Test: Landing Page Sections
 *
 * Validates: Requirements 3.5
 *
 * GOAL: Confirm that the hero, features (planet carousel), and CTA sections
 * render on the landing page. After scroll reduction fix, these DOM elements
 * must still exist.
 *
 * Observation: LandingScreen.jsx renders:
 *   - Hero section with "Speak Without Fear" headline and "Enter Space" CTA
 *   - PlanetCarousel section with "Seven Planets" / "One for every feeling"
 *   - Statement section with "Zero Knowledge Architecture"
 *   - Final CTA section with "Ready to speak without fear?" and "Join Free Today"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import React from 'react'

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

// Mock device hooks (useIsSmallScreen uses window.matchMedia which jsdom lacks)
vi.mock('../lib/device', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useIsSmallScreen: () => false, // desktop viewport for preservation tests
    useViewportSize: () => ({ width: 1024, height: 768 }),
  }
})

// Mock React Three Fiber Canvas (the 3D background is not needed for section tests)
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => React.createElement('div', { 'data-testid': 'r3f-canvas' }, null),
  useFrame: vi.fn(),
}))

// Mock Three.js
vi.mock('three', () => ({
  default: {},
  Color: vi.fn(),
  Vector3: vi.fn(),
}))

// Mock the clay module used by BackgroundPlanets
vi.mock('../components/3d/clay', () => ({
  CLAY: { roughness: 0.8, metalness: 0.1 },
  makeClayBlob: vi.fn(() => null),
}))

// Mock planets data
vi.mock('../data/planets', () => ({
  PLANETS: [
    { id: 'joy', label: 'Joy', color: '#f59e0b', description: 'Celebrate' },
    { id: 'vent', label: 'Venting', color: '#3b82f6', description: 'Release' },
    { id: 'advice', label: 'Seek Advice', color: '#10b981', description: 'Ask' },
    { id: 'grief', label: 'Grief & Loss', color: '#6366f1', description: 'Process' },
    { id: 'anxiety', label: 'Anxiety', color: '#ec4899', description: 'Name' },
    { id: 'neutral', label: 'Reflections', color: '#94a3b8', description: 'Observe' },
    { id: 'doodle', label: 'Doodle Drift', color: '#e2e2e2', description: 'Draw' },
  ],
}))

import LandingScreen from './LandingScreen'

describe('Preservation: Landing Page Sections Render', () => {
  let canvasGetContextSpy

  beforeEach(() => {
    vi.clearAllMocks()
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
  })

  it('renders the hero section with headline text', () => {
    render(<LandingScreen />)
    expect(screen.getByText('Speak')).toBeInTheDocument()
    expect(screen.getByText('Fear')).toBeInTheDocument()
  })

  it('renders the hero CTA button "Enter Space"', () => {
    render(<LandingScreen />)
    expect(screen.getByRole('button', { name: /enter space/i })).toBeInTheDocument()
  })

  it('renders the planet carousel header "One for every feeling."', () => {
    render(<LandingScreen />)
    expect(screen.getByText('One for every feeling.')).toBeInTheDocument()
  })

  it('renders the "Seven Planets" label', () => {
    render(<LandingScreen />)
    expect(screen.getByText('Seven Planets')).toBeInTheDocument()
  })

  it('renders the statement section "Zero Knowledge Architecture"', () => {
    render(<LandingScreen />)
    expect(screen.getByText('Zero Knowledge Architecture')).toBeInTheDocument()
  })

  it('renders the final CTA button "Join Free Today"', () => {
    render(<LandingScreen />)
    expect(screen.getByRole('button', { name: /join free today/i })).toBeInTheDocument()
  })

  it('renders the final CTA headline about speaking without fear', () => {
    render(<LandingScreen />)
    expect(screen.getByText(/ready to speak/i)).toBeInTheDocument()
  })
})
