/**
 * Preservation Property Test: Confirmed Email Login
 *
 * Validates: Requirements 3.3
 *
 * GOAL: Confirm that successful sign-in with a confirmed email navigates
 * to the avatar screen on the UNFIXED code.
 *
 * Observation: In AuthScreen.jsx handleSubmit, after successful
 * signInWithPassword, the code calls setPhase('avatar').
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import * as fc from 'fast-check'
import React from 'react'

// Mock the supabase module
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  },
}))

// Mock the store
const { mockSetPhase, mockClearPendingPlanetId } = vi.hoisted(() => ({
  mockSetPhase: vi.fn(),
  mockClearPendingPlanetId: vi.fn(),
}))

vi.mock('../store/useAppStore', () => {
  const store = () => ({
    setPhase: mockSetPhase,
  })
  store.getState = () => ({
    pendingPlanetId: null,
    clearPendingPlanetId: mockClearPendingPlanetId,
  })
  return { default: store }
})

import AuthScreen from './AuthScreen'
import { supabase } from '../lib/supabase'

describe('Preservation: Confirmed Email Login Navigates to Avatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('property: for all successful auth responses, phase becomes "avatar"', async () => {
    // Use a set of varied emails/passwords to test the property
    const testCases = [
      { email: 'user@test.com', password: 'pass123' },
      { email: 'student@psu.edu', password: 'abcdef' },
      { email: 'hello@world.org', password: 'secret99' },
      { email: 'a@b.co', password: '123456' },
      { email: 'test@example.ph', password: 'pwd!pwd' },
    ]

    for (const { email, password } of testCases) {
      mockSetPhase.mockClear()

      // Mock successful sign-in (confirmed email)
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'user-123', email } },
        error: null,
      })

      const { unmount } = render(<AuthScreen />)

      const emailInput = screen.getByPlaceholderText('Email')
      const passwordInput = screen.getByPlaceholderText('Password')
      const submitBtn = screen.getByRole('button', { name: /sign in/i })

      fireEvent.change(emailInput, { target: { value: email } })
      fireEvent.change(passwordInput, { target: { value: password } })
      fireEvent.click(submitBtn)

      await waitFor(() => {
        expect(mockSetPhase).toHaveBeenCalledWith('avatar')
      })

      unmount()
    }
  })

  it('successful sign-in calls setPhase with "avatar" (unit test)', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
      error: null,
    })

    render(<AuthScreen />)

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'test@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'password123' },
    })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockSetPhase).toHaveBeenCalledWith('avatar')
    })
  })

  it('property: phase is always "avatar" regardless of email format (valid emails)', async () => {
    const emails = ['x@y.co', 'long-email-address@domain.com', 'user+tag@host.net']
    
    for (const email of emails) {
      mockSetPhase.mockClear()
      supabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: 'u2', email } },
        error: null,
      })

      const { unmount } = render(<AuthScreen />)

      fireEvent.change(screen.getByPlaceholderText('Email'), {
        target: { value: email },
      })
      fireEvent.change(screen.getByPlaceholderText('Password'), {
        target: { value: 'validpw' },
      })
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(mockSetPhase).toHaveBeenCalledWith('avatar')
      })

      unmount()
    }
  })
})
