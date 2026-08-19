/**
 * Integration tests for onboarding activation and HUD help button behavior.
 *
 * @vitest-environment jsdom
 *
 * Tests:
 * 1. Onboarding activates for new users (no onboarding_completed_at)
 * 2. Onboarding does NOT activate for returning users with onboarding_completed_at set
 * 3. Help button triggers restart from step 1
 * 4. Help button hidden while onboarding active
 *
 * Requirements: 3.1, 3.7, 4.1, 4.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { createElement, useEffect } from 'react'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock supabase module — controls getUser responses per test
const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn(() => Promise.resolve({ error: null }))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args) => mockGetUser(...args),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      updateUser: (...args) => mockUpdateUser(...args),
    },
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(() => ({ status: 'ok' })),
      unsubscribe: vi.fn(),
      track: vi.fn(),
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },
}))

// Mock device hooks
vi.mock('../../lib/device', () => ({
  useIsSmallScreen: vi.fn(() => false),
  useViewportSize: vi.fn(() => ({ width: 1024, height: 768 })),
  sceneConfig: { pixelRatio: 1, bloom: true, vignette: true },
  isMobile: false,
  isSmallScreen: false,
  isLowEnd: false,
}))

// Mock viewport hooks
vi.mock('../../lib/viewport', () => ({
  useOrientation: vi.fn(() => ({ isLandscape: false, isPortrait: true })),
}))

// Mock hint store
vi.mock('../../lib/hintStore', () => ({
  isHintDismissed: vi.fn(() => true),
  dismissHint: vi.fn(),
  HINT_PLANET_PULSE: 'anonemote_hint_planet_pulse',
}))

// ─── Store mock ─────────────────────────────────────────────────────────────
const mockStartOnboarding = vi.fn()
const mockSetPhase = vi.fn()

let mockStoreState = {
  setPhase: mockSetPhase,
  privateNotes: [],
  onboarding: { active: false, step: 0, totalSteps: 6 },
  startOnboarding: mockStartOnboarding,
}

vi.mock('../../store/useAppStore', () => {
  const store = vi.fn(() => mockStoreState)
  store.getState = vi.fn(() => mockStoreState)
  store.setState = vi.fn()
  return { default: store }
})

import { supabase } from '../../lib/supabase'
import useAppStore from '../../store/useAppStore'
import HUD from './HUD.jsx'

// ─── Test: Onboarding trigger logic ─────────────────────────────────────────
// Replicate the SpaceScreen useEffect logic in a minimal harness to avoid
// needing WebGL/R3F context.

describe('Onboarding integration — Activation trigger (Requirements 3.1, 3.7)', () => {
  /** Minimal component that replicates SpaceScreen's onboarding check logic */
  function OnboardingTriggerHarness({ onStart }) {
    useEffect(() => {
      let cancelled = false

      const checkOnboarding = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (cancelled) return

          if (!user) return
          const completedAt = user.user_metadata?.onboarding_completed_at
          if (!completedAt) {
            onStart()
          }
        } catch (err) {
          // Silently fail — onboarding is non-critical
        }
      }

      checkOnboarding()
      return () => { cancelled = true }
    }, [onStart])

    return null
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('activates onboarding for a new user without onboarding_completed_at', async () => {
    const startFn = vi.fn()

    // Mock: user has no onboarding_completed_at in metadata
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'new@example.com',
          user_metadata: {},
        },
      },
    })

    render(createElement(OnboardingTriggerHarness, { onStart: startFn }))

    await waitFor(() => {
      expect(startFn).toHaveBeenCalledTimes(1)
    })
  })

  it('does NOT activate onboarding for a returning user with onboarding_completed_at set', async () => {
    const startFn = vi.fn()

    // Mock: user has onboarding_completed_at in metadata
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-456',
          email: 'returning@example.com',
          user_metadata: {
            onboarding_completed_at: '2024-01-01T00:00:00Z',
          },
        },
      },
    })

    render(createElement(OnboardingTriggerHarness, { onStart: startFn }))

    // Wait for the async effect to resolve
    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled()
    })

    // startOnboarding should NOT have been called
    expect(startFn).not.toHaveBeenCalled()
  })

  it('does NOT activate onboarding when no user is authenticated', async () => {
    const startFn = vi.fn()

    // Mock: no user (guest/not logged in)
    mockGetUser.mockResolvedValue({
      data: { user: null },
    })

    render(createElement(OnboardingTriggerHarness, { onStart: startFn }))

    await waitFor(() => {
      expect(mockGetUser).toHaveBeenCalled()
    })

    expect(startFn).not.toHaveBeenCalled()
  })
})

// ─── Test: HUD help button ──────────────────────────────────────────────────

describe('Onboarding integration — HUD help button (Requirements 4.1, 4.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('help button triggers startOnboarding (restart from step 1)', () => {
    // Set store state: onboarding inactive (button should be visible)
    mockStoreState = {
      setPhase: mockSetPhase,
      privateNotes: [],
      onboarding: { active: false, step: 0, totalSteps: 6 },
      startOnboarding: mockStartOnboarding,
    }
    useAppStore.mockReturnValue(mockStoreState)

    const { container } = render(createElement(HUD, { peerCount: 0 }))

    // Find the help button by its aria-label
    const helpButton = container.querySelector('[aria-label="Replay onboarding tutorial"]')
    expect(helpButton).not.toBeNull()

    fireEvent.click(helpButton)

    expect(mockStartOnboarding).toHaveBeenCalledTimes(1)
  })

  it('help button is hidden while onboarding is active', () => {
    // Set store state: onboarding active (button should be hidden)
    mockStoreState = {
      setPhase: mockSetPhase,
      privateNotes: [],
      onboarding: { active: true, step: 2, totalSteps: 6 },
      startOnboarding: mockStartOnboarding,
    }
    useAppStore.mockReturnValue(mockStoreState)

    const { container } = render(createElement(HUD, { peerCount: 0 }))

    // The help button should NOT be in the DOM
    const helpButton = container.querySelector('[aria-label="Replay onboarding tutorial"]')
    expect(helpButton).toBeNull()
  })
})
