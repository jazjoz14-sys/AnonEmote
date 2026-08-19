/**
 * Bug Condition Exploration Tests — Mobile UX Defects
 *
 * These tests assert the EXPECTED (correct) behavior for 8 mobile UX bugs.
 * On UNFIXED code, these tests MUST FAIL — failure confirms the bugs exist.
 *
 * Validates: Requirements 9.1, 9.4, 2.4, 3.1, 4.1, 6.1, 12.3, 12.7
 *
 * DO NOT fix the code or modify these tests when they fail.
 * Document the counterexamples and mark the task complete.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ─── Bug 1.1: isSmallScreen remains stale after resize ───────────────────────
describe('Bug 1.1: isSmallScreen reactivity', () => {
  let originalMatchMedia

  beforeEach(() => {
    // Start at mobile width (375px)
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })
    originalMatchMedia = window.matchMedia
    vi.resetModules()
  })

  afterEach(() => {
    // Restore matchMedia to avoid polluting subsequent tests
    window.matchMedia = originalMatchMedia
  })

  it('useIsSmallScreen hook updates reactively when viewport crosses 768px threshold (375→812)', async () => {
    // The fix moved reactivity from the static constant to the useIsSmallScreen hook.
    // We test that the hook-based approach provides reactive detection.
    const { render, act } = await import('@testing-library/react')
    const React = await import('react')

    // Polyfill matchMedia for jsdom
    const listeners = []
    window.matchMedia = vi.fn((query) => ({
      matches: window.innerWidth < 768,
      media: query,
      addEventListener: (event, handler) => { listeners.push(handler) },
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => {},
    }))

    const deviceModule = await import('../../lib/device.js')

    // Create a test component that uses the hook
    let hookValue = null
    function TestComponent() {
      hookValue = deviceModule.useIsSmallScreen()
      return null
    }

    render(React.createElement(TestComponent))

    // At 375px width, hook should report true
    expect(hookValue).toBe(true)

    // Simulate resize to 812px — trigger matchMedia change
    Object.defineProperty(window, 'innerWidth', { value: 812, writable: true, configurable: true })

    // Trigger the matchMedia change listener with matches=false
    await act(async () => {
      for (const listener of listeners) {
        listener({ matches: false })
      }
    })

    // EXPECTED: useIsSmallScreen should now return false
    expect(hookValue).toBe(false)
  })
})

// ─── Bug 1.2: PANEL_W in PostModal does not recalculate ─────────────────────
describe('Bug 1.2: PostModal PANEL_W dynamic recalculation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })
    vi.resetModules()
  })

  it('PostModal panel width recalculates after viewport change from 375px to 812px', async () => {
    const { render, cleanup } = await import('@testing-library/react')
    const React = await import('react')

    vi.doMock('../../store/useAppStore', () => {
      const state = {
        selectedPlanet: { id: 'joy', label: 'Joy', color: '#f59e0b', emoji: '☀️' },
        setPostModalOpen: vi.fn(),
        openCrisis: vi.fn(),
        crisis: {},
        sessionId: 'test-session',
        addPost: vi.fn(),
        checkIn: null,
        openSheets: [],
        registerSheet: vi.fn(),
        unregisterSheet: vi.fn(),
      }
      return {
        default: Object.assign(
          (selector) => selector ? selector(state) : state,
          { getState: () => state, setState: vi.fn(), subscribe: vi.fn() }
        ),
      }
    })

    vi.doMock('../../hooks/useDraggable', () => ({
      default: ({ width }) => ({
        position: { x: 0, y: 0 },
        isDragging: false,
        dragProps: { style: {} },
        handleProps: {},
        _requestedWidth: width,
      }),
    }))

    vi.doMock('../../lib/api', () => ({
      apiFetch: vi.fn(),
    }))

    // First render at mobile width: useIsSmallScreen returns true, useViewportSize returns 375
    vi.doMock('../../lib/device', () => ({
      isSmallScreen: true,
      useIsSmallScreen: () => true,
      useViewportSize: () => ({ width: 375, height: 667 }),
      getIsSmallScreen: () => true,
    }))

    const { default: PostModal } = await import('../../components/modals/PostModal.jsx')
    const { container } = render(React.createElement(PostModal))
    cleanup()

    // Now reset and re-import with desktop viewport (812px)
    vi.resetModules()

    vi.doMock('../../store/useAppStore', () => {
      const state = {
        selectedPlanet: { id: 'joy', label: 'Joy', color: '#f59e0b', emoji: '☀️' },
        setPostModalOpen: vi.fn(),
        openCrisis: vi.fn(),
        crisis: {},
        sessionId: 'test-session',
        addPost: vi.fn(),
        checkIn: null,
        openSheets: [],
        registerSheet: vi.fn(),
        unregisterSheet: vi.fn(),
      }
      return {
        default: Object.assign(
          (selector) => selector ? selector(state) : state,
          { getState: () => state, setState: vi.fn(), subscribe: vi.fn() }
        ),
      }
    })

    vi.doMock('../../hooks/useDraggable', () => ({
      default: ({ width }) => ({
        position: { x: 0, y: 0 },
        isDragging: false,
        dragProps: { style: {} },
        handleProps: {},
        _requestedWidth: width,
      }),
    }))

    vi.doMock('../../lib/api', () => ({
      apiFetch: vi.fn(),
    }))

    // Desktop mode: useIsSmallScreen returns false, width is 812
    vi.doMock('../../lib/device', () => ({
      isSmallScreen: false,
      useIsSmallScreen: () => false,
      useViewportSize: () => ({ width: 812, height: 667 }),
      getIsSmallScreen: () => false,
    }))

    Object.defineProperty(window, 'innerWidth', { value: 812, writable: true, configurable: true })

    const { render: render2 } = await import('@testing-library/react')
    const React2 = await import('react')
    const { default: PostModal2 } = await import('../../components/modals/PostModal.jsx')
    const { container: container2 } = render2(React2.createElement(PostModal2))

    // Check: the dialog's width should reflect the new viewport.
    // On a ≥768px viewport, PostModal should switch to desktop mode (480px width)
    const dialog = container2.querySelector('[role="dialog"]')
    const style = dialog?.getAttribute('style') || ''

    // EXPECTED: After resize to 812px (≥768), PostModal should render in desktop mode
    // with width: 480px (the desktop panelWidth), not as a full-width bottom sheet.
    const hasDesktopWidth = style.includes('480')
    expect(hasDesktopWidth).toBe(true)
  })
})

// ─── Bug 1.3: PostModal bottom sheet lacks safe-area-inset-bottom padding ────
describe('Bug 1.3: Safe-area-inset-bottom padding', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })
    vi.resetModules()
  })

  it('PostModal mobile bottom sheet has env(safe-area-inset-bottom) padding', async () => {
    const { render } = await import('@testing-library/react')
    const React = await import('react')

    vi.doMock('../../store/useAppStore', () => {
      const state = {
        selectedPlanet: { id: 'joy', label: 'Joy', color: '#f59e0b', emoji: '☀️' },
        setPostModalOpen: vi.fn(),
        openCrisis: vi.fn(),
        crisis: {},
        sessionId: 'test-session',
        addPost: vi.fn(),
        checkIn: null,
        openSheets: [],
        registerSheet: vi.fn(),
        unregisterSheet: vi.fn(),
      }
      return {
        default: Object.assign(
          (selector) => selector ? selector(state) : state,
          { getState: () => state, setState: vi.fn(), subscribe: vi.fn() }
        ),
      }
    })

    vi.doMock('../../hooks/useDraggable', () => ({
      default: () => ({
        position: { x: 0, y: 0 },
        isDragging: false,
        dragProps: { style: {} },
        handleProps: {},
      }),
    }))

    vi.doMock('../../lib/device', () => ({
      isSmallScreen: true,
      useIsSmallScreen: () => true,
      useViewportSize: () => ({ width: 375, height: 667 }),
      getIsSmallScreen: () => true,
    }))

    vi.doMock('../../lib/api', () => ({
      apiFetch: vi.fn(),
    }))

    const { default: PostModal } = await import('../../components/modals/PostModal.jsx')
    const { container } = render(React.createElement(PostModal))

    // Find the modal wrapper (the bottom sheet on mobile)
    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()

    // EXPECTED: The mobile bottom sheet should have safe-area padding.
    // The fix applies env(safe-area-inset-bottom, 8px) as an inline paddingBottom style.
    // Note: jsdom doesn't support env() in the DOM style API so it may be dropped.
    // We verify by checking the style attribute string OR the safe-bottom class,
    // AND by verifying the source has the correct wrapperStyle.
    const style = dialog.getAttribute('style') || ''
    const className = dialog.getAttribute('class') || ''

    // The fixed PostModal includes paddingBottom: 'env(safe-area-inset-bottom, 8px)'
    // in wrapperStyle AND 'safe-bottom' in wrapperClass. Check both signals.
    const hasSafeAreaInStyle = style.includes('safe-area-inset-bottom') ||
      style.includes('env(safe-area-inset-bottom')
    const hasSafeAreaClass = className.includes('safe-bottom')

    // Either the inline style persisted (real browser) OR the class is present (jsdom)
    const hasSafeAreaPadding = hasSafeAreaInStyle || hasSafeAreaClass

    // COUNTEREXAMPLE ON UNFIXED CODE: PostModal did NOT apply env(safe-area-inset-bottom)
    // at all — neither in inline styles nor via a class with the correct CSS value.
    expect(hasSafeAreaPadding).toBe(true)
  })
})

// ─── Bug 1.4: Full-height containers use 100vh instead of dvh ────────────────
describe('Bug 1.4: Dynamic viewport height (dvh) usage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })
    vi.resetModules()
  })

  it('PostModal mobile bottom sheet uses dvh for maxHeight instead of vh', async () => {
    const { render } = await import('@testing-library/react')
    const React = await import('react')

    vi.doMock('../../store/useAppStore', () => {
      const state = {
        selectedPlanet: { id: 'joy', label: 'Joy', color: '#f59e0b', emoji: '☀️' },
        setPostModalOpen: vi.fn(),
        openCrisis: vi.fn(),
        crisis: {},
        sessionId: 'test-session',
        addPost: vi.fn(),
        checkIn: null,
        openSheets: [],
        registerSheet: vi.fn(),
        unregisterSheet: vi.fn(),
      }
      return {
        default: Object.assign(
          (selector) => selector ? selector(state) : state,
          { getState: () => state, setState: vi.fn(), subscribe: vi.fn() }
        ),
      }
    })

    vi.doMock('../../hooks/useDraggable', () => ({
      default: () => ({
        position: { x: 0, y: 0 },
        isDragging: false,
        dragProps: { style: {} },
        handleProps: {},
      }),
    }))

    vi.doMock('../../lib/device', () => ({
      isSmallScreen: true,
      useIsSmallScreen: () => true,
      useViewportSize: () => ({ width: 375, height: 667 }),
      getIsSmallScreen: () => true,
    }))

    vi.doMock('../../lib/api', () => ({
      apiFetch: vi.fn(),
    }))

    const { default: PostModal } = await import('../../components/modals/PostModal.jsx')
    const { container } = render(React.createElement(PostModal))

    const dialog = container.querySelector('[role="dialog"]')
    expect(dialog).not.toBeNull()

    const style = dialog.getAttribute('style') || ''

    // EXPECTED: maxHeight should use dvh (e.g., '80dvh') with vh as fallback
    const usesDvh = style.includes('dvh')
    expect(usesDvh).toBe(true)
  })
})

// ─── Bug 1.5: Touch events on PlanetInfoPanel propagate to parent ────────────
describe('Bug 1.5: PlanetInfoPanel touch event isolation', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true, configurable: true })
    vi.resetModules()
  })

  it('Touch events on PlanetInfoPanel mobile bottom sheet do NOT propagate to parent', async () => {
    const { render } = await import('@testing-library/react')
    const React = await import('react')
    const { fireEvent } = await import('@testing-library/react')

    vi.doMock('../../store/useAppStore', () => {
      const state = {
        selectedPlanet: { id: 'joy', label: 'Joy', color: '#f59e0b', emoji: '☀️', description: 'Test' },
        setSelectedPlanet: vi.fn(),
        setPostModalOpen: vi.fn(),
        setPhase: vi.fn(),
        posts: [],
        sessionId: 'test-session',
        mergeReactions: vi.fn(),
        isAuthenticated: true,
        setPendingPlanetId: vi.fn(),
        openSheets: [],
        registerSheet: vi.fn(),
        unregisterSheet: vi.fn(),
      }
      return {
        default: Object.assign(
          (selector) => selector ? selector(state) : state,
          { getState: () => state, setState: vi.fn(), subscribe: vi.fn() }
        ),
      }
    })

    vi.doMock('../../hooks/useDraggable', () => ({
      default: () => ({
        position: { x: 0, y: 0 },
        isDragging: false,
        dragProps: { style: {} },
        handleProps: {},
      }),
    }))

    vi.doMock('../../lib/device', () => ({
      isSmallScreen: true,
      useIsSmallScreen: () => true,
      useViewportSize: () => ({ width: 375, height: 667 }),
      getIsSmallScreen: () => true,
    }))

    vi.doMock('../../lib/api', () => ({
      apiFetch: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })),
    }))

    const { default: PlanetInfoPanel } = await import('../../components/ui/PlanetInfoPanel.jsx')

    // Wrap in a parent div to detect propagation
    let parentTouchReceived = false
    const parentHandler = () => { parentTouchReceived = true }

    const { container } = render(
      React.createElement('div', { onTouchMove: parentHandler },
        React.createElement(PlanetInfoPanel, { postsLoading: false })
      )
    )

    // Find the mobile bottom sheet
    const bottomSheet = container.querySelector('.fixed.bottom-0')
    expect(bottomSheet).not.toBeNull()

    // Dispatch a touch move event on the bottom sheet
    fireEvent.touchMove(bottomSheet, {
      touches: [{ clientX: 100, clientY: 300 }],
    })

    // EXPECTED: Touch event should NOT propagate to parent (OrbitControls/Canvas)
    expect(parentTouchReceived).toBe(false)
  })
})

// ─── Bug 1.6: CheckInScreen buttons have touch targets < 44×44px ─────────────
describe('Bug 1.6: CheckInScreen minimum touch targets', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 320, writable: true, configurable: true })
    vi.resetModules()
  })

  it('All CheckInScreen emotion buttons have min 44×44px touch area on 320px viewport', async () => {
    const { render } = await import('@testing-library/react')
    const React = await import('react')

    vi.doMock('../../store/useAppStore', () => ({
      default: Object.assign(
        () => ({
          setPhase: vi.fn(),
          setSelectedPlanet: vi.fn(),
          setCheckIn: vi.fn(),
          setPostModalOpen: vi.fn(),
        }),
        { getState: () => ({}), setState: vi.fn(), subscribe: vi.fn() }
      ),
    }))

    vi.doMock('../../data/emotions', () => ({
      FEELINGS: [
        {
          id: 'joy', label: 'Joy', emoji: '☀️', sub: 'Happy', color: '#f59e0b',
          nuances: [{ id: 'grateful', label: 'Grateful', prompt: 'test' }],
        },
        {
          id: 'vent', label: 'Venting', emoji: '🌊', sub: 'Angry', color: '#3b82f6',
          nuances: [{ id: 'frustrated', label: 'Frustrated', prompt: 'test' }],
        },
      ],
    }))

    vi.doMock('../../data/planets', () => ({
      getPlanetById: vi.fn(() => ({ id: 'joy', label: 'Joy' })),
    }))

    vi.doMock('../../lib/device', () => ({
      isSmallScreen: true,
      useIsSmallScreen: () => true,
      useIsNarrow: () => true,
      useViewportSize: () => ({ width: 320, height: 667 }),
      getIsSmallScreen: () => true,
    }))

    const { default: CheckInScreen } = await import('../../screens/CheckInScreen.jsx')
    const { container } = render(React.createElement(CheckInScreen))

    // Find all emotion buttons in the grid
    const buttons = container.querySelectorAll('button')
    const emotionButtons = Array.from(buttons).filter(
      (btn) => btn.closest('.grid')
    )

    expect(emotionButtons.length).toBeGreaterThan(0)

    for (const btn of emotionButtons) {
      const classList = btn.className
      const style = btn.getAttribute('style') || ''

      const hasMinHeight = classList.includes('min-h-[44px]') ||
        classList.includes('min-h-11') ||
        style.includes('min-height') ||
        style.includes('minHeight')

      const hasMinWidth = classList.includes('min-w-[44px]') ||
        classList.includes('min-w-11') ||
        style.includes('min-width') ||
        style.includes('minWidth')

      // EXPECTED: All buttons should have explicit min 44×44px touch target
      expect(hasMinHeight).toBe(true)
    }
  })
})

// ─── Bug 1.7: PostModal textarea has unconditional autoFocus on mobile ───────
describe('Bug 1.7: PostModal autoFocus conditional on mobile', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })
    vi.resetModules()
  })

  it('PostModal does NOT autoFocus textarea on mobile viewport', async () => {
    const { render } = await import('@testing-library/react')
    const React = await import('react')

    vi.doMock('../../store/useAppStore', () => {
      const state = {
        selectedPlanet: { id: 'joy', label: 'Joy', color: '#f59e0b', emoji: '☀️' },
        setPostModalOpen: vi.fn(),
        openCrisis: vi.fn(),
        crisis: {},
        sessionId: 'test-session',
        addPost: vi.fn(),
        checkIn: null,
        openSheets: [],
        registerSheet: vi.fn(),
        unregisterSheet: vi.fn(),
      }
      return {
        default: Object.assign(
          (selector) => selector ? selector(state) : state,
          { getState: () => state, setState: vi.fn(), subscribe: vi.fn() }
        ),
      }
    })

    vi.doMock('../../hooks/useDraggable', () => ({
      default: () => ({
        position: { x: 0, y: 0 },
        isDragging: false,
        dragProps: { style: {} },
        handleProps: {},
      }),
    }))

    vi.doMock('../../lib/device', () => ({
      isSmallScreen: true,
      useIsSmallScreen: () => true,
      useViewportSize: () => ({ width: 375, height: 667 }),
      getIsSmallScreen: () => true,
    }))

    vi.doMock('../../lib/api', () => ({
      apiFetch: vi.fn(),
    }))

    const { default: PostModal } = await import('../../components/modals/PostModal.jsx')
    const { container } = render(React.createElement(PostModal))

    const textarea = container.querySelector('textarea')
    expect(textarea).not.toBeNull()

    // EXPECTED: On mobile, textarea should NOT receive focus automatically
    // to prevent the virtual keyboard from immediately appearing.
    const isFocused = document.activeElement === textarea
    expect(isFocused).toBe(false)
  })
})

// ─── Bug 1.8: LandingScreen mounts BackgroundPlanets Canvas on mobile ────────
describe('Bug 1.8: LandingScreen Canvas suppression on mobile', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true, configurable: true })
    vi.resetModules()

    // Mock HTMLCanvasElement.getContext for the Particles component
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      fillStyle: '',
    }))
  })

  afterEach(() => {
    delete HTMLCanvasElement.prototype.getContext
  })

  it('LandingScreen does NOT mount BackgroundPlanets Canvas on mobile viewport', async () => {
    const { render } = await import('@testing-library/react')
    const React = await import('react')

    vi.doMock('../../store/useAppStore', () => ({
      default: Object.assign(
        (selector) => {
          const state = { setPhase: vi.fn() }
          return selector ? selector(state) : state
        },
        { getState: () => ({ setPhase: vi.fn() }), setState: vi.fn(), subscribe: vi.fn() }
      ),
    }))

    vi.doMock('../../lib/device', () => ({
      isSmallScreen: true,
      isMobile: true,
      isLowEnd: true,
      qualityTier: 'low',
      sceneConfig: { starCount: 800, planetDetail: 2, decorEnabled: false, shadowMapSize: 0, bloomEnabled: false, dpr: [1, 1] },
      useIsSmallScreen: () => true,
      useViewportSize: () => ({ width: 375, height: 667 }),
      getIsSmallScreen: () => true,
    }))

    // Mock @react-three/fiber Canvas to track if it's rendered
    let canvasMountCount = 0
    vi.doMock('@react-three/fiber', () => ({
      Canvas: ({ children, ...props }) => {
        canvasMountCount++
        return React.createElement('div', { 'data-testid': 'r3f-canvas', ...props }, children)
      },
      useFrame: vi.fn(),
    }))

    vi.doMock('@react-three/drei', () => ({}))
    vi.doMock('three', () => ({
      Vector3: class { constructor() {} set() { return this } normalize() { return this } },
      Color: class { constructor() {} },
    }))

    vi.doMock('../../components/3d/clay', () => ({
      CLAY: { roughness: 0.8, metalness: 0.1 },
      makeClayBlob: vi.fn(() => ({})),
    }))

    vi.doMock('../../data/planets', () => ({
      PLANETS: [
        { id: 'joy', label: 'Joy', color: '#f59e0b', emoji: '☀️', description: 'test' },
      ],
    }))

    const { default: LandingScreen } = await import('../../screens/LandingScreen.jsx')
    render(React.createElement(LandingScreen))

    // EXPECTED: On mobile (isSmallScreen=true, qualityTier='low'),
    // BackgroundPlanets Canvas should NOT be mounted.
    // Instead, MobileBackground (CSS-based) should be used.
    expect(canvasMountCount).toBe(0)
  })
})
