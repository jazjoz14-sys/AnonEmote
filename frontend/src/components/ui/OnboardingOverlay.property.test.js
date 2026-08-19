/**
 * Property-based tests for OnboardingOverlay
 *
 * @vitest-environment jsdom
 */

// Feature: onboarding-terms-qol, Property 2: Progress indicator reflects current step
// Feature: onboarding-terms-qol, Property 3: Skip dismisses from any step
// Validates: Requirements 3.4, 3.6

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, cleanup, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

// Mock supabase module
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(() => Promise.resolve({ error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

// We need to mock the store so we can control onboarding state per-test
const mockCompleteOnboarding = vi.fn()
const mockNextOnboardingStep = vi.fn()
const mockPrevOnboardingStep = vi.fn()

let mockOnboardingState = { active: true, step: 0, totalSteps: 6 }

vi.mock('../../store/useAppStore', () => {
  const store = vi.fn(() => ({
    onboarding: mockOnboardingState,
    nextOnboardingStep: mockNextOnboardingStep,
    prevOnboardingStep: mockPrevOnboardingStep,
    completeOnboarding: mockCompleteOnboarding,
  }))
  store.getState = vi.fn(() => ({
    pendingMetadataWrites: [],
  }))
  store.setState = vi.fn()
  return { default: store }
})

import OnboardingOverlay from './OnboardingOverlay.jsx'
import { supabase } from '../../lib/supabase'
import useAppStore from '../../store/useAppStore'

describe('OnboardingOverlay — Property 2: Progress indicator reflects current step', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('for any step index [0,5]: progress shows "Step {step+1} of 6" and Back visible iff step > 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        (stepIndex) => {
          cleanup()

          // Set the mock store state for this iteration
          mockOnboardingState = { active: true, step: stepIndex, totalSteps: 6 }
          useAppStore.mockReturnValue({
            onboarding: mockOnboardingState,
            nextOnboardingStep: mockNextOnboardingStep,
            prevOnboardingStep: mockPrevOnboardingStep,
            completeOnboarding: mockCompleteOnboarding,
          })

          const { container } = render(createElement(OnboardingOverlay))

          // Assert progress indicator shows correct "Step X of 6"
          const progressText = container.querySelector('.text-xs.text-slate-400')
          expect(progressText).not.toBeNull()
          expect(progressText.textContent).toBe(`Step ${stepIndex + 1} of 6`)

          // Assert "Back" button exists iff step > 0
          const buttons = Array.from(container.querySelectorAll('button'))
          const backButton = buttons.find((btn) => btn.textContent === 'Back')

          if (stepIndex > 0) {
            expect(backButton).toBeDefined()
          } else {
            expect(backButton).toBeUndefined()
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('OnboardingOverlay — Property 3: Skip dismisses from any step', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('for any step index [0,5]: clicking Skip calls completeOnboarding and triggers metadata write', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        (stepIndex) => {
          cleanup()
          vi.clearAllMocks()

          // Set the mock store state for this iteration
          mockOnboardingState = { active: true, step: stepIndex, totalSteps: 6 }
          useAppStore.mockReturnValue({
            onboarding: mockOnboardingState,
            nextOnboardingStep: mockNextOnboardingStep,
            prevOnboardingStep: mockPrevOnboardingStep,
            completeOnboarding: mockCompleteOnboarding,
          })

          const { container } = render(createElement(OnboardingOverlay))

          // Find and click the "Skip" button
          const buttons = Array.from(container.querySelectorAll('button'))
          const skipButton = buttons.find((btn) => btn.textContent === 'Skip')
          expect(skipButton).toBeDefined()

          fireEvent.click(skipButton)

          // Assert completeOnboarding was called (sets onboarding.active to false)
          expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1)

          // Assert supabase.auth.updateUser was called with onboarding_completed_at
          expect(supabase.auth.updateUser).toHaveBeenCalledTimes(1)
          const callArgs = supabase.auth.updateUser.mock.calls[0][0]
          expect(callArgs).toHaveProperty('data')
          expect(callArgs.data).toHaveProperty('onboarding_completed_at')
          // Verify it's an ISO string
          expect(typeof callArgs.data.onboarding_completed_at).toBe('string')
          expect(callArgs.data.onboarding_completed_at.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
