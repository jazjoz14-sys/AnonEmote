/**
 * Integration tests for CheckInScreen.
 *
 * Tests the full 3-step flow (breathing → mood → nuance → space) and various
 * skip/back/keyboard/accessibility scenarios.
 *
 * Validates: Requirements 1.6, 3.5, 5.1, 5.6, 6.2, 6.3, 6.6, 8.1, 9.5
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import CheckInScreen from '../screens/CheckInScreen.jsx'

// ─── Mocks ─────────────────────────────────────────────────────────────────────

// Mock store methods
const mockSetPhase = vi.fn()
const mockSetSelectedPlanet = vi.fn()
const mockSetCheckIn = vi.fn()
const mockSetPostModalOpen = vi.fn()

vi.mock('../store/useAppStore', () => ({
  default: () => ({
    setPhase: mockSetPhase,
    setSelectedPlanet: mockSetSelectedPlanet,
    setCheckIn: mockSetCheckIn,
    setPostModalOpen: mockSetPostModalOpen,
  }),
}))

// Mock getPlanetById to return a planet object
vi.mock('../data/planets', () => ({
  getPlanetById: (id) => {
    if (!id) return undefined
    return { id, name: id.charAt(0).toUpperCase() + id.slice(1), orbitRadius: 5 }
  },
}))

// Mock device.js to avoid navigator.userAgent issues in jsdom
vi.mock('../lib/device', () => ({
  useIsSmallScreen: () => false,
  useIsLandscape: () => false,
  useIsNarrow: () => false,
  isSmallScreen: false,
  isMobile: false,
  qualityTier: 'medium',
  sceneConfig: { starCount: 2000 },
}))

// Mock PreloadManager (it uses useGLTF which needs Three.js context)
vi.mock('../components/3d/models/PreloadManager', () => ({
  default: () => null,
}))

// ─── jsdom Polyfills ────────────────────────────────────────────────────────────

beforeEach(() => {
  // Polyfill pointer capture methods (not available in jsdom)
  if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = vi.fn()
  }
  if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => true)
  }

  // Override ResizeObserver to immediately report realistic dimensions.
  // NuanceConstellation relies on ResizeObserver to get container size before
  // computing constellation positions. In jsdom, elements have 0x0 dimensions.
  globalThis.ResizeObserver = class {
    constructor(callback) {
      this._callback = callback
    }
    observe(el) {
      // Immediately fire with realistic dimensions
      // Also mock getBoundingClientRect on the observed element
      Object.defineProperty(el, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ width: 400, height: 300, left: 0, top: 0, right: 400, bottom: 300 }),
      })
      // Fire the callback synchronously with contentRect
      this._callback([{
        target: el,
        contentRect: { width: 400, height: 300 },
      }])
    }
    unobserve() {}
    disconnect() {}
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Advances past the BreathingMoment by fast-forwarding the 3s timer.
 */
async function skipBreathing() {
  await act(async () => {
    vi.advanceTimersByTime(3100)
  })
}

/**
 * Moves the cursor into the blue (bottom-left) quadrant via keyboard.
 * The cursor starts at (0.5, 0.5). Each keypress must be wrapped in act()
 * to allow React to batch-process state updates correctly.
 * We also advance timers by 1 frame (16ms) to flush rAF callbacks used by
 * AriaAnnouncer and CandidateLabels.
 */
async function moveCursorToBlueQuadrant(element) {
  // Move left 3 times (x: 0.5 → 0.4 → 0.3 → 0.2)
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      fireEvent.keyDown(element, { key: 'ArrowLeft' })
      vi.advanceTimersByTime(16)
    })
  }
  // Move down 3 times (y: 0.5 → 0.4 → 0.3 → 0.2)
  for (let i = 0; i < 3; i++) {
    await act(async () => {
      fireEvent.keyDown(element, { key: 'ArrowDown' })
      vi.advanceTimersByTime(16)
    })
  }
}

/**
 * Moves the cursor into the yellow (top-right) quadrant via keyboard.
 * From center (0.5, 0.5) move right 1 (→0.6) + up 1 (→0.6).
 */
async function moveCursorToYellowQuadrant(element) {
  await act(async () => {
    fireEvent.keyDown(element, { key: 'ArrowRight' })
    vi.advanceTimersByTime(16)
  })
  await act(async () => {
    fireEvent.keyDown(element, { key: 'ArrowUp' })
    vi.advanceTimersByTime(16)
  })
}

// ─── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

// ─── Tests ──────────────────────────────────────────────────────────────────────

describe('CheckInScreen — Integration Tests', () => {
  describe('Happy path: breathing → mood → nuance → space', () => {
    it('completes full flow and calls store methods in correct order', async () => {
      render(<CheckInScreen />)

      // Step 1: Breathing moment is visible
      expect(screen.getByText('Take a breath. How does right now feel?')).toBeInTheDocument()

      // Advance past 3s breathing timer
      await skipBreathing()

      // Step 2: MoodSpace becomes interactive
      const moodSpace = screen.getByRole('application')
      expect(moodSpace).toBeInTheDocument()

      // Move cursor to blue quadrant (grief — single feeling, auto-advances)
      await moveCursorToBlueQuadrant(moodSpace)

      // Confirm the position (Enter key)
      await act(async () => {
        fireEvent.keyDown(moodSpace, { key: 'Enter' })
        vi.advanceTimersByTime(16) // flush rAF for announcer
      })

      // Step 3: NuanceConstellation appears with grief nuances
      await waitFor(() => {
        expect(screen.getByText('Grieving')).toBeInTheDocument()
      })

      // Select a nuance word
      await act(async () => {
        fireEvent.click(screen.getByText('Grieving'))
      })

      // Advance the 300ms fade-out timer
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      // Verify store calls in exact order: setSelectedPlanet → setCheckIn → setPhase → setPostModalOpen
      expect(mockSetSelectedPlanet).toHaveBeenCalledTimes(1)
      expect(mockSetSelectedPlanet).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'grief' })
      )

      expect(mockSetCheckIn).toHaveBeenCalledTimes(1)
      expect(mockSetCheckIn).toHaveBeenCalledWith({
        feeling: 'grief',
        nuance: 'grieving',
        prompt: 'Who or what are you missing?',
      })

      expect(mockSetPhase).toHaveBeenCalledWith('space')
      expect(mockSetPostModalOpen).toHaveBeenCalledWith(true)

      // Verify ordering: setSelectedPlanet before setCheckIn before setPhase before setPostModalOpen
      const planetOrder = mockSetSelectedPlanet.mock.invocationCallOrder[0]
      const checkInOrder = mockSetCheckIn.mock.invocationCallOrder[0]
      const phaseOrder = mockSetPhase.mock.invocationCallOrder[0]
      const modalOrder = mockSetPostModalOpen.mock.invocationCallOrder[0]

      expect(planetOrder).toBeLessThan(checkInOrder)
      expect(checkInOrder).toBeLessThan(phaseOrder)
      expect(phaseOrder).toBeLessThan(modalOrder)
    })
  })

  describe('Skip from mood step', () => {
    it('calls only setPhase("space") — no check-in data in store', async () => {
      render(<CheckInScreen />)

      // Skip breathing
      await skipBreathing()

      // Click "Just float" skip button
      const skipButton = screen.getByText('Just float')
      fireEvent.click(skipButton)

      // Advance fade-out timer
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      // Only setPhase('space') should be called
      expect(mockSetPhase).toHaveBeenCalledWith('space')
      expect(mockSetSelectedPlanet).not.toHaveBeenCalled()
      expect(mockSetCheckIn).not.toHaveBeenCalled()
      expect(mockSetPostModalOpen).not.toHaveBeenCalled()
    })
  })

  describe('Skip from nuance step', () => {
    it('discards partial selection — only setPhase("space") called', async () => {
      render(<CheckInScreen />)

      // Skip breathing
      await skipBreathing()

      // Navigate to blue quadrant (grief - single feeling auto-advances)
      const moodSpace = screen.getByRole('application')
      await moveCursorToBlueQuadrant(moodSpace)

      await act(async () => {
        fireEvent.keyDown(moodSpace, { key: 'Enter' })
        vi.advanceTimersByTime(16)
      })

      // Wait for nuance constellation to appear
      await waitFor(() => {
        expect(screen.getByText('Grieving')).toBeInTheDocument()
      })

      // Now skip from nuance step
      const skipButton = screen.getByText('Just float')
      fireEvent.click(skipButton)

      // Advance fade-out timer
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      // Only setPhase('space') should be called — partial feeling is discarded
      expect(mockSetPhase).toHaveBeenCalledWith('space')
      expect(mockSetSelectedPlanet).not.toHaveBeenCalled()
      expect(mockSetCheckIn).not.toHaveBeenCalled()
      expect(mockSetPostModalOpen).not.toHaveBeenCalled()
    })
  })

  describe('Back button', () => {
    it('calls setPhase("avatar") to return to avatar screen', async () => {
      render(<CheckInScreen />)

      // Skip breathing
      await skipBreathing()

      // Click back button
      const backButton = screen.getByLabelText('Back to avatar')
      fireEvent.click(backButton)

      // Advance fade-out timer
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      expect(mockSetPhase).toHaveBeenCalledWith('avatar')
      expect(mockSetSelectedPlanet).not.toHaveBeenCalled()
      expect(mockSetCheckIn).not.toHaveBeenCalled()
      expect(mockSetPostModalOpen).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard navigation', () => {
    it('arrow keys move cursor and Enter confirms position', async () => {
      render(<CheckInScreen />)

      // Skip breathing
      await skipBreathing()

      const moodSpace = screen.getByRole('application')

      // Move cursor to bottom-left quadrant (blue/grief) using arrow keys
      await moveCursorToBlueQuadrant(moodSpace)

      // Confirm position with Enter — blue quadrant has single feeling (grief), auto-advances
      await act(async () => {
        fireEvent.keyDown(moodSpace, { key: 'Enter' })
        vi.advanceTimersByTime(16)
      })

      // NuanceConstellation should appear with grief nuances
      await waitFor(() => {
        expect(screen.getByText('Grieving')).toBeInTheDocument()
      })

      // Select nuance with keyboard (Enter on a nuance word button)
      const grievingButton = screen.getByText('Grieving')
      await act(async () => {
        fireEvent.keyDown(grievingButton, { key: 'Enter' })
      })

      // Advance fade-out timer
      await act(async () => {
        vi.advanceTimersByTime(350)
      })

      // Verify full completion
      expect(mockSetSelectedPlanet).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'grief' })
      )
      expect(mockSetCheckIn).toHaveBeenCalledWith({
        feeling: 'grief',
        nuance: 'grieving',
        prompt: 'Who or what are you missing?',
      })
      expect(mockSetPhase).toHaveBeenCalledWith('space')
      expect(mockSetPostModalOpen).toHaveBeenCalledWith(true)
    })

    it('Space key also confirms position', async () => {
      render(<CheckInScreen />)
      await skipBreathing()

      const moodSpace = screen.getByRole('application')

      // Move to bottom-left for single-feeling auto-select
      await moveCursorToBlueQuadrant(moodSpace)

      // Confirm with Space
      await act(async () => {
        fireEvent.keyDown(moodSpace, { key: ' ' })
        vi.advanceTimersByTime(16)
      })

      // Should advance to nuance step
      await waitFor(() => {
        expect(screen.getByText('Grieving')).toBeInTheDocument()
      })
    })
  })

  describe('Single-feeling quadrant (blue/grief) auto-advances', () => {
    it('auto-selects grief and advances to nuance constellation', async () => {
      render(<CheckInScreen />)
      await skipBreathing()

      const moodSpace = screen.getByRole('application')

      // Navigate to blue quadrant with keyboard
      await moveCursorToBlueQuadrant(moodSpace)

      // Confirm position
      await act(async () => {
        fireEvent.keyDown(moodSpace, { key: 'Enter' })
        vi.advanceTimersByTime(16)
      })

      // NuanceConstellation should appear with all 6 grief nuances
      await waitFor(() => {
        expect(screen.getByText('Grieving')).toBeInTheDocument()
        expect(screen.getByText('Lonely')).toBeInTheDocument()
        expect(screen.getByText('Hurt')).toBeInTheDocument()
        expect(screen.getByText('Disappointed')).toBeInTheDocument()
        expect(screen.getByText('Empty')).toBeInTheDocument()
        expect(screen.getByText('Regretful')).toBeInTheDocument()
      })
    })
  })

  describe('prefers-reduced-motion', () => {
    it('disables breathing pulse animation when reduced motion preferred', async () => {
      // Override matchMedia to return reduced motion preference
      const originalMatchMedia = window.matchMedia
      window.matchMedia = (query) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: () => false,
      })

      render(<CheckInScreen />)

      // BreathingMoment's aria-label distinguishes it from AriaAnnouncer's status
      const breathingOverlay = screen.getByLabelText(
        'Breathing moment — tap or press any key to skip'
      )

      // The backdrop div inside is the first child with aria-hidden="true"
      const backdrop = breathingOverlay.querySelector('[aria-hidden="true"]')

      expect(backdrop).toBeTruthy()
      expect(backdrop.className).not.toContain('animate-breathing-pulse')
      expect(backdrop.className).toContain('opacity-60')

      // Restore
      window.matchMedia = originalMatchMedia
    })
  })

  describe('Breathing moment interaction', () => {
    it('breathing moment is skippable by any keypress', async () => {
      render(<CheckInScreen />)

      // Breathing should be visible
      expect(screen.getByText('Take a breath. How does right now feel?')).toBeInTheDocument()

      // Press a key to skip breathing
      await act(async () => {
        fireEvent.keyDown(document, { key: 'Escape' })
      })

      // MoodSpace should become interactive (instruction text visible)
      expect(
        screen.getByText('Drag or tap to place yourself. No wrong answers.')
      ).toBeInTheDocument()
    })

    it('breathing moment completes after 3 seconds', async () => {
      render(<CheckInScreen />)

      expect(screen.getByText('Take a breath. How does right now feel?')).toBeInTheDocument()

      // Advance timer to just after 3s
      await act(async () => {
        vi.advanceTimersByTime(3100)
      })

      // MoodSpace instructions should appear
      expect(
        screen.getByText('Drag or tap to place yourself. No wrong answers.')
      ).toBeInTheDocument()
    })
  })

  describe('Multi-feeling quadrant requires candidate selection', () => {
    it('yellow quadrant shows candidate labels for joy and doodle', async () => {
      render(<CheckInScreen />)
      await skipBreathing()

      const moodSpace = screen.getByRole('application')

      // Move cursor to yellow quadrant (top-right)
      await moveCursorToYellowQuadrant(moodSpace)

      // Confirm position — yellow has multiple feelings, so candidates appear
      await act(async () => {
        fireEvent.keyDown(moodSpace, { key: 'Enter' })
        vi.advanceTimersByTime(16)
      })

      // Candidate labels should appear (capitalized feeling names)
      await waitFor(() => {
        expect(screen.getByText('Joy')).toBeInTheDocument()
        expect(screen.getByText('Doodle')).toBeInTheDocument()
      })

      // Select 'joy' candidate
      await act(async () => {
        fireEvent.click(screen.getByText('Joy'))
      })

      // Now nuance constellation should appear with joy nuances
      await waitFor(() => {
        expect(screen.getByText('Grateful')).toBeInTheDocument()
      })
    })
  })
})
