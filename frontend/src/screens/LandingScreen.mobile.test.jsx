/**
 * @vitest-environment jsdom
 *
 * Unit tests for the LandingScreen mobile path.
 * Validates: Requirements 7.1, 7.2, 7.3
 *
 * On mobile (viewport < 768px), the landing page should:
 * - NOT mount any Canvas elements for the carousel section
 * - Render all 7 planet cards with warm copy from PLANET_DESCRIPTIONS
 * - Use MobileBackground CSS gradients instead of BackgroundPlanets WebGL Canvas
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock device hook to simulate mobile viewport (< 768px)
vi.mock('../lib/device', () => ({
  useIsSmallScreen: () => true,
  useIsNarrow: () => false,
  useIsLandscape: () => false,
  useViewportSize: () => ({ width: 375, height: 812 }),
  isMobile: true,
  isSmallScreen: true,
  isLowEnd: true,
  qualityTier: 'low',
  sceneConfig: {
    starCount: 800,
    planetDetail: 2,
    decorEnabled: false,
    shadowMapSize: 0,
    bloomEnabled: false,
    dpr: [1, 1],
  },
}))

// Mock R3F — Canvas should never be called on mobile, but provide mock for safety
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }) => createElement('div', { 'data-testid': 'r3f-canvas' }, children),
  useFrame: () => {},
  useThree: () => ({}),
}))

// Mock drei View
vi.mock('@react-three/drei', () => ({
  View: ({ children }) => createElement('div', { 'data-testid': 'drei-view' }, children),
}))

// Mock the 3D carousel components (not needed on mobile)
vi.mock('../components/3d/CarouselCanvas', () => ({
  default: ({ children }) => createElement('div', { 'data-testid': 'carousel-canvas' }, children),
}))

vi.mock('../components/3d/CarouselPlanetScene', () => ({
  default: () => createElement('div', { 'data-testid': 'carousel-planet-scene' }),
}))

// Mock makeClayBlob and CLAY since they depend on Three.js geometry
vi.mock('../components/3d/clay', () => ({
  makeClayBlob: () => null,
  CLAY: { roughness: 0.95, metalness: 0.0 },
}))

// Mock the Zustand store
vi.mock('../store/useAppStore', () => ({
  default: (selector) => {
    const state = {
      setPhase: () => {},
      phase: 'landing',
      authUser: null,
      isAuthenticated: false,
    }
    return typeof selector === 'function' ? selector(state) : state
  },
}))

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
}))

// ─── Import after mocks ───────────────────────────────────────────────────────

import LandingScreen from './LandingScreen'
import { PLANET_DESCRIPTIONS } from '../data/landingCopy'

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LandingScreen — Mobile path (viewport < 768px)', () => {
  // Mock HTMLCanvasElement.getContext for the Particles component (uses 2D context)
  let originalGetContext
  let originalRAF
  beforeAll(() => {
    originalGetContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        clearRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        fillStyle: '',
      }
    }
    originalRAF = window.requestAnimationFrame
    window.requestAnimationFrame = (cb) => setTimeout(cb, 0)
    window.cancelAnimationFrame = (id) => clearTimeout(id)
  })
  afterAll(() => {
    HTMLCanvasElement.prototype.getContext = originalGetContext
    window.requestAnimationFrame = originalRAF
  })

  it('renders zero Canvas elements in the carousel section (Req 7.2)', () => {
    render(createElement(LandingScreen))

    // On mobile, BackgroundPlanets is replaced by MobileBackground (CSS gradients)
    // and PlanetCarousel is replaced by MobilePlanetList (no Canvas)
    const canvasElements = screen.queryAllByTestId('r3f-canvas')
    expect(canvasElements).toHaveLength(0)
  })

  it('renders all 7 planet cards in mobile layout (Req 7.1, 7.3)', () => {
    render(createElement(LandingScreen))

    // All 7 planet labels should be visible in the mobile card list
    const expectedLabels = [
      'Joy',
      'Venting',
      'Seek Advice',
      'Grief & Loss',
      'Anxiety',
      'Reflections',
      'Doodle Drift',
    ]

    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('displays warm tagline copy from PLANET_DESCRIPTIONS for each planet (Req 7.3)', () => {
    render(createElement(LandingScreen))

    // Each planet card should show the warm tagline from landingCopy.js
    const planetIds = ['joy', 'vent', 'advice', 'grief', 'anxiety', 'neutral', 'doodle']

    for (const id of planetIds) {
      const tagline = PLANET_DESCRIPTIONS[id].tagline
      expect(screen.getByText(tagline)).toBeInTheDocument()
    }
  })

  it('does not mount CarouselCanvas or drei Views on mobile (Req 7.2)', () => {
    render(createElement(LandingScreen))

    // CarouselCanvas mock would show data-testid="carousel-canvas" if mounted
    // On mobile, PlanetCarousel is not rendered — MobilePlanetList is used instead
    const carouselCanvas = screen.queryByTestId('carousel-canvas')
    expect(carouselCanvas).not.toBeInTheDocument()

    // No drei Views should be present on mobile
    const views = screen.queryAllByTestId('drei-view')
    expect(views).toHaveLength(0)
  })

  it('renders planet icon images in each mobile card (Req 7.1)', () => {
    render(createElement(LandingScreen))

    // Each planet card should have an img element with the planet label as alt text
    const expectedLabels = [
      'Joy',
      'Venting',
      'Seek Advice',
      'Grief & Loss',
      'Anxiety',
      'Reflections',
      'Doodle Drift',
    ]

    for (const label of expectedLabels) {
      const img = screen.getByAltText(label)
      expect(img).toBeInTheDocument()
      expect(img.tagName).toBe('IMG')
    }
  })
})
