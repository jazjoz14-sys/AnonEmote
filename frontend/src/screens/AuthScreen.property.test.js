/**
 * Property-based tests for AuthScreen loading states
 *
 * @vitest-environment jsdom
 */

// Feature: onboarding-terms-qol, Property 7: Auth submission disables all form inputs
// Feature: onboarding-terms-qol, Property 8: Auth failure re-enables all form inputs
// Validates: Requirements 5.5, 5.6

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { render, cleanup, fireEvent, screen, waitFor, act } from '@testing-library/react'
import { createElement } from 'react'

// Mock supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      updateUser: vi.fn(),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

// Mock useAppStore
vi.mock('../store/useAppStore', () => {
  const store = vi.fn(() => ({
    setPhase: vi.fn(),
  }))
  store.getState = vi.fn(() => ({
    pendingPlanetId: null,
    clearPendingPlanetId: vi.fn(),
  }))
  return { default: store }
})

import AuthScreen from './AuthScreen.jsx'
import { supabase } from '../lib/supabase'

// Generator for valid email strings (contains @ with non-empty local and domain parts)
const arbEmail = fc.tuple(
  fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-z0-9]+$/.test(s)),
  fc.string({ minLength: 1, maxLength: 8 }).filter((s) => /^[a-z]+$/.test(s)),
  fc.constantFrom('com', 'org', 'net', 'io', 'ph')
).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)

// Generator for valid passwords (at least 6 characters)
const arbPassword = fc.string({ minLength: 6, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9!@#$%]+$/.test(s))

describe('AuthScreen — Property 7: Auth submission disables all form inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('for any valid email/password in login mode, submission disables all inputs while loading', () => {
    fc.assert(
      fc.property(
        arbEmail,
        arbPassword,
        (email, password) => {
          cleanup()

          // Mock signInWithPassword to never resolve (keeps loading state active)
          supabase.auth.signInWithPassword.mockReturnValue(new Promise(() => {}))

          const { container } = render(createElement(AuthScreen))

          // Fill in the form (login mode is default)
          const emailInput = container.querySelector('input[type="email"]')
          const passwordInput = container.querySelector('input[type="password"]')
          const submitButton = container.querySelector('button[type="submit"]')

          fireEvent.change(emailInput, { target: { value: email } })
          fireEvent.change(passwordInput, { target: { value: password } })

          // Submit the form
          fireEvent.click(submitButton)

          // All inputs should be disabled while loading
          expect(emailInput).toBeDisabled()
          expect(passwordInput).toBeDisabled()
          expect(submitButton).toBeDisabled()

          // Button text should indicate processing
          expect(submitButton.textContent).toBe('Please wait...')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('for any valid email/password in register mode, submission disables all inputs including confirm password', () => {
    fc.assert(
      fc.property(
        arbEmail,
        arbPassword,
        (email, password) => {
          cleanup()

          // Mock signUp to never resolve
          supabase.auth.signUp.mockReturnValue(new Promise(() => {}))

          const { container } = render(createElement(AuthScreen))

          // Switch to register mode
          const toggleButton = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent.includes("Don't have an account")
          )
          fireEvent.click(toggleButton)

          // Fill in the form
          const emailInput = container.querySelector('input[type="email"]')
          const passwordInputs = container.querySelectorAll('input[type="password"]')
          const passwordInput = passwordInputs[0]
          const confirmInput = passwordInputs[1]

          fireEvent.change(emailInput, { target: { value: email } })
          fireEvent.change(passwordInput, { target: { value: password } })
          fireEvent.change(confirmInput, { target: { value: password } })

          // Check the terms checkbox
          const checkbox = container.querySelector('input[type="checkbox"]')
          fireEvent.click(checkbox)

          // Submit the form
          const submitButton = container.querySelector('button[type="submit"]')
          fireEvent.click(submitButton)

          // All inputs should be disabled while loading
          expect(emailInput).toBeDisabled()
          expect(passwordInput).toBeDisabled()
          expect(confirmInput).toBeDisabled()
          expect(submitButton).toBeDisabled()

          // Button text should indicate processing
          expect(submitButton.textContent).toBe('Please wait...')
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('AuthScreen — Property 8: Auth failure re-enables all form inputs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('for any valid email/password in login mode, auth failure re-enables all inputs and shows error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbEmail,
        arbPassword,
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /^[a-z ]+$/.test(s)),
        async (email, password, errorMsg) => {
          cleanup()

          // Mock signInWithPassword to reject with an error
          supabase.auth.signInWithPassword.mockResolvedValue({
            error: { message: errorMsg },
          })

          const { container } = render(createElement(AuthScreen))

          // Fill in the form (login mode is default)
          const emailInput = container.querySelector('input[type="email"]')
          const passwordInput = container.querySelector('input[type="password"]')
          const submitButton = container.querySelector('button[type="submit"]')

          fireEvent.change(emailInput, { target: { value: email } })
          fireEvent.change(passwordInput, { target: { value: password } })

          // Submit the form
          await act(async () => {
            fireEvent.click(submitButton)
          })

          // All inputs should be re-enabled after failure
          expect(emailInput).not.toBeDisabled()
          expect(passwordInput).not.toBeDisabled()
          expect(submitButton).not.toBeDisabled()

          // Error message should be displayed and non-empty
          const errorElement = container.querySelector('.text-red-400')
          expect(errorElement).not.toBeNull()
          expect(errorElement.textContent.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('for any valid email/password in register mode, auth failure re-enables all inputs and shows error', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbEmail,
        arbPassword,
        fc.string({ minLength: 1, maxLength: 30 }).filter((s) => /^[a-z ]+$/.test(s)),
        async (email, password, errorMsg) => {
          cleanup()

          // Mock signUp to reject with an error
          supabase.auth.signUp.mockResolvedValue({
            error: { message: errorMsg },
          })

          const { container } = render(createElement(AuthScreen))

          // Switch to register mode
          const toggleButton = Array.from(container.querySelectorAll('button')).find(
            (btn) => btn.textContent.includes("Don't have an account")
          )
          fireEvent.click(toggleButton)

          // Fill in the form
          const emailInput = container.querySelector('input[type="email"]')
          const passwordInputs = container.querySelectorAll('input[type="password"]')
          const passwordInput = passwordInputs[0]
          const confirmInput = passwordInputs[1]

          fireEvent.change(emailInput, { target: { value: email } })
          fireEvent.change(passwordInput, { target: { value: password } })
          fireEvent.change(confirmInput, { target: { value: password } })

          // Check the terms checkbox
          const checkbox = container.querySelector('input[type="checkbox"]')
          fireEvent.click(checkbox)

          // Submit the form
          const submitButton = container.querySelector('button[type="submit"]')
          await act(async () => {
            fireEvent.click(submitButton)
          })

          // All inputs should be re-enabled after failure
          expect(emailInput).not.toBeDisabled()
          expect(passwordInput).not.toBeDisabled()
          expect(confirmInput).not.toBeDisabled()
          expect(submitButton).not.toBeDisabled()

          // Error message should be displayed and non-empty
          const errorElement = container.querySelector('.text-red-400')
          expect(errorElement).not.toBeNull()
          expect(errorElement.textContent.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})
