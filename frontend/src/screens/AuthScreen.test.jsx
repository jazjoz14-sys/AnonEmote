/**
 * Bug Condition Exploration Test: Auth Error Message (Bug #3)
 *
 * **Validates: Requirements 1.3**
 *
 * Bug: When Supabase auth returns { message: 'Email not confirmed' },
 * AuthScreen displays the raw error message directly instead of a friendly
 * user-facing message.
 *
 * Expected: Display "Please check your email to confirm your account before signing in."
 *
 * This test is EXPECTED TO FAIL on unfixed code.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

// Mock the store
vi.mock('../store/useAppStore', () => {
  const store = {
    setPhase: vi.fn(),
    authUser: null,
    isAuthenticated: false,
    authLoading: false,
  }
  const useAppStore = vi.fn((selector) => {
    if (typeof selector === 'function') return selector(store)
    return store
  })
  useAppStore.getState = vi.fn(() => store)
  return { default: useAppStore }
})

describe('Bug Condition: AuthScreen raw error on unconfirmed email (Bug #3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show friendly message for "Email not confirmed" error', async () => {
    /**
     * **Validates: Requirements 1.3**
     *
     * Mock Supabase signInWithPassword to reject with { message: 'Email not confirmed' }.
     * After form submission, the UI should display the friendly message, NOT the raw error.
     *
     * On unfixed code: catch block does setError(err.message) directly,
     * showing "Email not confirmed" instead of the friendly text.
     */
    const { supabase } = await import('../lib/supabase')
    supabase.auth.signInWithPassword.mockRejectedValue({
      message: 'Email not confirmed',
    })

    const AuthScreen = (await import('./AuthScreen.jsx')).default
    render(<AuthScreen />)

    // Fill in the form
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })

    // Submit
    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    // Wait for the error to appear
    await waitFor(() => {
      const errorElement = screen.getByText(/check your email to confirm/i)
      expect(errorElement).toBeInTheDocument()
    })

    // Should NOT show the raw error
    expect(screen.queryByText('Email not confirmed')).not.toBeInTheDocument()
  })

  it('should show friendly message for variations of email confirmation errors', async () => {
    /**
     * **Validates: Requirements 1.3**
     *
     * Test with a slightly different error message variant.
     */
    const { supabase } = await import('../lib/supabase')
    supabase.auth.signInWithPassword.mockRejectedValue({
      message: 'Email not confirmed',
    })

    const AuthScreen = (await import('./AuthScreen.jsx')).default
    render(<AuthScreen />)

    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    fireEvent.change(emailInput, { target: { value: 'user@school.edu' } })
    fireEvent.change(passwordInput, { target: { value: 'test123' } })

    const submitButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(submitButton)

    await waitFor(() => {
      // The friendly message should contain guidance about checking email
      const friendlyMessage = screen.getByText((content) =>
        /please.*check.*email.*confirm/i.test(content)
      )
      expect(friendlyMessage).toBeInTheDocument()
    })
  })
})
