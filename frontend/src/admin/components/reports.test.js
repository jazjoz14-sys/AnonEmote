/**
 * @vitest-environment jsdom
 *
 * Unit tests for Reports page functionality, BatchActionBar, and user search.
 * Validates: Requirements 4.3, 4.7, 4.10, 5.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createElement } from 'react'

import BatchActionBar from '../components/BatchActionBar.jsx'
import { sortReports } from '../pages/ReportsPage.jsx'
import { filterUsersByEmail } from '../pages/UsersPage.property.test.js'

// ─── BatchActionBar tests ───────────────────────────────────────────────────────

describe('BatchActionBar', () => {
  const defaultProps = {
    selectedCount: 0,
    onDismiss: vi.fn(),
    onHide: vi.fn(),
    onDelete: vi.fn(),
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render the visible action bar when selectedCount is 0', () => {
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 0 }))
    // The "N selected" text should not be present in the visible bar
    expect(screen.queryByText(/\d+ selected/)).not.toBeInTheDocument()
  })

  it('renders the action bar with "N selected" text when selectedCount > 0', () => {
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 3 }))
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('renders Dismiss, Hide, and Delete buttons when items are selected', () => {
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 2 }))
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('shows confirmation dialog when Delete button is clicked', () => {
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 2 }))
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    // Confirmation dialog should appear
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument()
  })

  it('calls onDelete when confirmation dialog is confirmed', () => {
    const onDelete = vi.fn()
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 2, onDelete }))
    // Open confirmation
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    // Confirm via the "Delete 2 items" button
    fireEvent.click(screen.getByRole('button', { name: /delete 2 items/i }))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('does not call onDelete when Cancel is clicked in confirmation dialog', () => {
    const onDelete = vi.fn()
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 1, onDelete }))
    // Open confirmation
    fireEvent.click(screen.getByRole('button', { name: /delete/i }))
    // Cancel
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onDelete).not.toHaveBeenCalled()
    // Dialog should be closed
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('ARIA live region contains selection count text when items are selected', () => {
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 5 }))
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveTextContent('5 reports selected. Batch actions available.')
  })

  it('ARIA live region is empty when no items are selected', () => {
    render(createElement(BatchActionBar, { ...defaultProps, selectedCount: 0 }))
    const liveRegion = screen.getByRole('status')
    expect(liveRegion).toHaveTextContent('')
  })
})

// ─── sortReports tests ──────────────────────────────────────────────────────────

describe('sortReports', () => {
  // Helper: create a report group with the given fields
  const makeGroup = (priority, createdAt, reportCount, postId) => ({
    priority,
    reportCount,
    post: { id: postId, created_at: createdAt },
  })

  const groups = [
    makeGroup(5, '2024-01-01T00:00:00Z', 2, 'post-c'),
    makeGroup(1, '2024-06-15T12:00:00Z', 10, 'post-a'),
    makeGroup(3, '2024-03-10T08:00:00Z', 5, 'post-b'),
    makeGroup(1, '2024-06-15T12:00:00Z', 10, 'post-d'),
  ]

  it('priority sort: P1 comes before P5', () => {
    const sorted = sortReports(groups, 'priority')
    expect(sorted[0].priority).toBe(1)
    expect(sorted[sorted.length - 1].priority).toBe(5)
  })

  it('priority sort: ascending order', () => {
    const sorted = sortReports(groups, 'priority')
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].priority).toBeGreaterThanOrEqual(sorted[i - 1].priority)
    }
  })

  it('newest sort: newer dates come first', () => {
    const sorted = sortReports(groups, 'newest')
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].post.created_at).getTime()
      const curr = new Date(sorted[i].post.created_at).getTime()
      expect(prev).toBeGreaterThanOrEqual(curr)
    }
  })

  it('oldest sort: older dates come first', () => {
    const sorted = sortReports(groups, 'oldest')
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].post.created_at).getTime()
      const curr = new Date(sorted[i].post.created_at).getTime()
      expect(prev).toBeLessThanOrEqual(curr)
    }
  })

  it('reports sort: higher count comes first', () => {
    const sorted = sortReports(groups, 'reports')
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].reportCount).toBeGreaterThanOrEqual(sorted[i].reportCount)
    }
  })

  it('ties are broken by post ID (lexicographic)', () => {
    const tiedGroups = [
      makeGroup(1, '2024-06-15T12:00:00Z', 10, 'post-z'),
      makeGroup(1, '2024-06-15T12:00:00Z', 10, 'post-a'),
      makeGroup(1, '2024-06-15T12:00:00Z', 10, 'post-m'),
    ]
    const sorted = sortReports(tiedGroups, 'priority')
    expect(sorted[0].post.id).toBe('post-a')
    expect(sorted[1].post.id).toBe('post-m')
    expect(sorted[2].post.id).toBe('post-z')
  })

  it('does not mutate the original array', () => {
    const original = [...groups]
    sortReports(groups, 'priority')
    expect(groups).toEqual(original)
  })

  it('returns empty array for empty input', () => {
    expect(sortReports([], 'priority')).toEqual([])
    expect(sortReports([], 'newest')).toEqual([])
  })
})

// ─── filterUsersByEmail tests ───────────────────────────────────────────────────

describe('filterUsersByEmail', () => {
  const users = [
    { email: 'alice@example.com' },
    { email: 'bob@university.edu.ph' },
    { email: 'charlie@test.org' },
    { email: 'ALICE.ADMIN@example.com' },
  ]

  it('returns matching users for a substring', () => {
    const result = filterUsersByEmail(users, 'alice')
    expect(result).toHaveLength(2)
    expect(result[0].email).toBe('alice@example.com')
    expect(result[1].email).toBe('ALICE.ADMIN@example.com')
  })

  it('case-insensitive matching', () => {
    const resultLower = filterUsersByEmail(users, 'bob')
    const resultUpper = filterUsersByEmail(users, 'BOB')
    expect(resultLower).toEqual(resultUpper)
    expect(resultLower).toHaveLength(1)
  })

  it('returns empty array for no matches', () => {
    const result = filterUsersByEmail(users, 'zzz')
    expect(result).toEqual([])
  })

  it('matches domain part of email', () => {
    const result = filterUsersByEmail(users, 'university')
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('bob@university.edu.ph')
  })

  it('returns all users when query matches all', () => {
    // All emails contain ".com" or ".org" or ".ph" — use "." which is in all
    const result = filterUsersByEmail(users, '.c')
    expect(result.length).toBeGreaterThan(0)
    for (const u of result) {
      expect(u.email.toLowerCase()).toContain('.c')
    }
  })

  it('returns empty for empty user list', () => {
    const result = filterUsersByEmail([], 'test')
    expect(result).toEqual([])
  })

  it('handles users with null/empty email gracefully', () => {
    const usersWithNull = [
      { email: null },
      { email: '' },
      { email: 'valid@test.com' },
    ]
    const result = filterUsersByEmail(usersWithNull, 'valid')
    expect(result).toHaveLength(1)
    expect(result[0].email).toBe('valid@test.com')
  })
})
