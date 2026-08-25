/**
 * Unit tests for EvaluationModal form states.
 *
 * Tests required rating validation, optional fields, keyboard navigation,
 * crisis flow, toxic suggestion handling, rate limiting, and pending review.
 *
 * @vitest-environment jsdom
 *
 * Requirements: 3.2, 3.4, 3.5, 4.2, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, fireEvent, waitFor, screen } from '@testing-library/react'
import { createElement } from 'react'

// ── Mock useAppStore ────────────────────────────────────────────────────────────
const mockStoreActions = {
  openCrisis: vi.fn(),
  showToast: vi.fn(),
  closeEvaluationModal: vi.fn(),
  pushModal: vi.fn(),
  popModal: vi.fn(),
}

vi.mock('../../store/useAppStore', () => {
  const store = vi.fn((selector) => {
    if (typeof selector === 'function') return selector(mockStoreActions)
    return mockStoreActions
  })
  store.getState = vi.fn(() => mockStoreActions)
  store.setState = vi.fn()
  store.subscribe = vi.fn(() => vi.fn())
  return { default: store }
})

// ── Mock apiFetch ───────────────────────────────────────────────────────────────
const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))

vi.mock('../../lib/api', () => ({
  apiFetch,
}))

// ── Mock device/viewport hooks used by ModalShell ───────────────────────────────
vi.mock('../../lib/device', () => ({
  useIsSmallScreen: () => false,
  useViewportSize: () => ({ width: 1024, height: 768 }),
}))

vi.mock('../../lib/viewport', () => ({
  useOrientation: () => ({ isLandscape: false }),
  useBodyLock: vi.fn(),
}))

// ── Mock useDraggable hook used by ModalShell ───────────────────────────────────
vi.mock('../../hooks/useDraggable', () => ({
  default: () => ({
    position: { x: 100, y: 100 },
    isDragging: false,
    handleProps: {},
  }),
}))

import EvaluationModal from './EvaluationModal.jsx'

// ── Test Suite ──────────────────────────────────────────────────────────────────

describe('EvaluationModal — Unit Tests (form states)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  // ─── Test 1: Required rating validation prevents submission ─────────────────
  // Requirements: 3.2, 3.5
  it('prevents submission and shows error when no rating is selected', async () => {
    vi.useRealTimers()

    const onClose = vi.fn()
    render(createElement(EvaluationModal, { open: true, onClose }))

    // Click the submit button without selecting a rating
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    fireEvent.click(submitButton)

    // Error message should appear
    expect(screen.getByText(/please select a rating before submitting/i)).toBeInTheDocument()

    // apiFetch should NOT have been called
    expect(apiFetch).not.toHaveBeenCalled()

    // Modal should still be open (onClose not called)
    expect(onClose).not.toHaveBeenCalled()
  })

  // ─── Test 2: Optional fields allow submission when empty ────────────────────
  // Requirements: 3.2, 4.2
  it('allows submission with only rating selected (no suggestion, no feedback_areas)', async () => {
    vi.useRealTimers()

    // Mock successful response
    apiFetch.mockResolvedValue({
      status: 201,
      ok: true,
      json: () => Promise.resolve({ id: 'test-id', created_at: '2026-08-20T10:00:00Z' }),
    })

    render(createElement(EvaluationModal, { open: true, onClose: vi.fn() }))

    // Select rating 4
    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')
    fireEvent.click(radios[3]) // 4th option (Very Good)

    // Submit without filling optional fields
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    fireEvent.click(submitButton)

    // Should call apiFetch with only rating
    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith('/api/evaluations', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ rating: 4 }),
      }))
    })
  })

  // ─── Test 3: Keyboard navigation — Arrow Right moves focus ──────────────────
  // Requirements: 3.4
  it('moves focus to the next radio option on ArrowRight key', () => {
    vi.useRealTimers()

    render(createElement(EvaluationModal, { open: true, onClose: vi.fn() }))

    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')

    // Focus the first radio
    radios[0].focus()
    expect(document.activeElement).toBe(radios[0])

    // Press ArrowRight
    fireEvent.keyDown(radioGroup, { key: 'ArrowRight' })

    // Focus should move to the second radio
    expect(document.activeElement).toBe(radios[1])
  })

  // ─── Test 4: Keyboard navigation — Enter selects rating ────────────────────
  // Requirements: 3.4
  it('selects the focused rating on Enter key', () => {
    vi.useRealTimers()

    render(createElement(EvaluationModal, { open: true, onClose: vi.fn() }))

    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')

    // Focus the first radio (index 0)
    radios[0].focus()

    // Press Enter — should select value 1 (Poor)
    fireEvent.keyDown(radioGroup, { key: 'Enter' })

    // The first radio should now be aria-checked="true"
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
  })

  // ─── Test 5: Keyboard navigation — Space selects rating ────────────────────
  // Requirements: 3.4
  it('selects the focused rating on Space key', () => {
    vi.useRealTimers()

    render(createElement(EvaluationModal, { open: true, onClose: vi.fn() }))

    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')

    // Focus the first radio (index 0)
    radios[0].focus()

    // Press Space — should select value 1 (Poor)
    fireEvent.keyDown(radioGroup, { key: ' ' })

    // The first radio should now be aria-checked="true"
    expect(radios[0].getAttribute('aria-checked')).toBe('true')
  })

  // ─── Test 6: Crisis flow triggers CrisisModal ──────────────────────────────
  // Requirements: 4.5
  it('closes modal and triggers openCrisis when API returns 403 crisis verdict', async () => {
    vi.useRealTimers()

    const onClose = vi.fn()
    const referralData = { hotline: '988', url: 'https://crisis.example' }

    apiFetch.mockResolvedValue({
      status: 403,
      ok: false,
      json: () => Promise.resolve({ verdict: 'crisis', referral: referralData }),
    })

    render(createElement(EvaluationModal, { open: true, onClose }))

    // Select a rating first (required for submission)
    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')
    fireEvent.click(radios[2]) // rating 3

    // Type a suggestion (the crisis-triggering text)
    const textarea = screen.getByPlaceholderText(/suggest a new emotion planet topic/i)
    fireEvent.change(textarea, { target: { value: 'some crisis text here' } })

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    fireEvent.click(submitButton)

    // Should call openCrisis with the draft and referral
    await waitFor(() => {
      expect(mockStoreActions.openCrisis).toHaveBeenCalledWith({
        draft: 'some crisis text here',
        referral: referralData,
      })
    })

    // Modal should be closed
    expect(mockStoreActions.closeEvaluationModal).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  // ─── Test 7: Toxic suggestion shows error, preserves form data ─────────────
  // Requirements: 4.4 (related to 3.5 — form data preserved)
  it('shows suggestion error and preserves form data on 406 toxic response', async () => {
    vi.useRealTimers()

    apiFetch.mockResolvedValue({
      status: 406,
      ok: false,
      json: () => Promise.resolve({ error: 'Suggestion contains inappropriate language', field: 'suggestion' }),
    })

    const onClose = vi.fn()
    render(createElement(EvaluationModal, { open: true, onClose }))

    // Select a rating
    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')
    fireEvent.click(radios[4]) // rating 5

    // Type a toxic suggestion
    const textarea = screen.getByPlaceholderText(/suggest a new emotion planet topic/i)
    fireEvent.change(textarea, { target: { value: 'toxic suggestion text' } })

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    fireEvent.click(submitButton)

    // Error message should appear below suggestion field
    await waitFor(() => {
      expect(screen.getByText(/suggestion contains inappropriate language/i)).toBeInTheDocument()
    })

    // Modal should still be open (onClose not called)
    expect(onClose).not.toHaveBeenCalled()
    expect(mockStoreActions.closeEvaluationModal).not.toHaveBeenCalled()

    // Suggestion text should be preserved
    expect(textarea.value).toBe('toxic suggestion text')

    // Rating should still be selected
    expect(radios[4].getAttribute('aria-checked')).toBe('true')
  })

  // ─── Test 8: Rate limited (429) shows toast and closes modal ───────────────
  // Requirements: 9.2 (related)
  it('shows toast and closes modal on 429 rate limit response', async () => {
    vi.useRealTimers()

    const onClose = vi.fn()

    apiFetch.mockResolvedValue({
      status: 429,
      ok: false,
      json: () => Promise.resolve({ error: 'Rate limit exceeded. Please try again later.' }),
    })

    render(createElement(EvaluationModal, { open: true, onClose }))

    // Select a rating
    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')
    fireEvent.click(radios[1]) // rating 2

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    fireEvent.click(submitButton)

    // Should show toast
    await waitFor(() => {
      expect(mockStoreActions.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You've already shared feedback recently",
        })
      )
    })

    // Modal should be closed
    expect(mockStoreActions.closeEvaluationModal).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  // ─── Test 9: Pending review — moderation timeout stores as pending_review ──
  // Requirements: 4.6
  it('shows pending review confirmation when API returns moderation_status pending_review', async () => {
    vi.useRealTimers()

    apiFetch.mockResolvedValue({
      status: 201,
      ok: true,
      json: () => Promise.resolve({
        id: 'eval-123',
        created_at: '2026-08-20T10:00:00Z',
        moderation_status: 'pending_review',
      }),
    })

    render(createElement(EvaluationModal, { open: true, onClose: vi.fn() }))

    // Select a rating
    const radioGroup = screen.getByRole('radiogroup')
    const radios = radioGroup.querySelectorAll('[role="radio"]')
    fireEvent.click(radios[3]) // rating 4

    // Add a suggestion
    const textarea = screen.getByPlaceholderText(/suggest a new emotion planet topic/i)
    fireEvent.change(textarea, { target: { value: 'Nostalgia planet' } })

    // Submit
    const submitButton = screen.getByRole('button', { name: /submit feedback/i })
    fireEvent.click(submitButton)

    // Should show pending review banner
    await waitFor(() => {
      expect(screen.getByText(/suggestion was recorded and is awaiting review/i)).toBeInTheDocument()
    })

    // Should also show success toast
    expect(mockStoreActions.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Thanks for sharing your feedback!',
        type: 'success',
      })
    )

    // sessionStorage should be set
    expect(sessionStorage.getItem('anonemote_evaluated')).toBe('true')
  })
})
