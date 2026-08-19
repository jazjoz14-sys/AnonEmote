/**
 * Preservation Property Test: Post Display in PlanetInfoPanel
 *
 * Validates: Requirements 3.6
 *
 * GOAL: Confirm that posts display in PlanetInfoPanel after fetch completes —
 * posts render with reactions and replies after loading state clears.
 *
 * Observation: PlanetInfoPanel renders posts from the Zustand store filtered
 * by selectedPlanet.id. Each post shows content, timestamp, ReactionBar,
 * and ReplyThread. If no posts exist, it shows "No posts yet. Be the first to share."
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fc from 'fast-check'
import React from 'react'

// Mock sub-components that aren't relevant to this test
vi.mock('./ReactionBar', () => ({
  default: ({ post }) => React.createElement('div', { 'data-testid': `reaction-bar-${post.id}` }, 'reactions'),
}))

vi.mock('./ReplyThread', () => ({
  default: ({ post }) => React.createElement('div', { 'data-testid': `reply-thread-${post.id}` }, 'replies'),
}))

// Mock device (include reactive hooks added by mobile-ux-polish spec)
vi.mock('../../lib/device', () => ({
  isSmallScreen: false,
  isMobile: false,
  useIsSmallScreen: () => false,
  useViewportSize: () => ({ width: 1024, height: 768 }),
  getIsSmallScreen: () => false,
  qualityTier: 'high',
  sceneConfig: { starCount: 3500, planetDetail: 4, decorEnabled: true, shadowMapSize: 1024, bloomEnabled: true, dpr: [1, 1.5] },
}))

// Mock api
vi.mock('../../lib/api', () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
}))

// Mock draggable hook
vi.mock('../../hooks/useDraggable', () => ({
  default: () => ({
    position: { x: 100, y: 100 },
    isDragging: false,
    dragProps: { style: {} },
    handleProps: {},
  }),
}))

const mockPosts = [
  {
    id: 'post-1',
    planet_id: 'joy',
    content: 'Had a wonderful day!',
    created_at: '2026-08-14T10:00:00Z',
    drawing: null,
  },
  {
    id: 'post-2',
    planet_id: 'joy',
    content: 'Feeling grateful',
    created_at: '2026-08-14T11:00:00Z',
    drawing: null,
  },
]

let storeState = {}

vi.mock('../../store/useAppStore', () => ({
  default: Object.assign(
    (selector) => selector ? selector(storeState) : storeState,
    { getState: () => storeState }
  ),
}))

import PlanetInfoPanel from './PlanetInfoPanel'

describe('Preservation: Post Display in PlanetInfoPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storeState = {
      selectedPlanet: { id: 'joy', label: 'Joy', emoji: '😊', color: '#f59e0b', description: 'Celebrate wins' },
      setSelectedPlanet: vi.fn(),
      setPostModalOpen: vi.fn(),
      setPhase: vi.fn(),
      posts: mockPosts,
      sessionId: 'session-123',
      mergeReactions: vi.fn(),
      isAuthenticated: true,
      openSheets: [],
      registerSheet: vi.fn(),
      unregisterSheet: vi.fn(),
    }
  })

  it('renders posts with content when posts exist for the selected planet', () => {
    render(<PlanetInfoPanel />)

    expect(screen.getByText('Had a wonderful day!')).toBeInTheDocument()
    expect(screen.getByText('Feeling grateful')).toBeInTheDocument()
  })

  it('renders ReactionBar for each post', () => {
    render(<PlanetInfoPanel />)

    expect(screen.getByTestId('reaction-bar-post-1')).toBeInTheDocument()
    expect(screen.getByTestId('reaction-bar-post-2')).toBeInTheDocument()
  })

  it('renders ReplyThread for each post', () => {
    render(<PlanetInfoPanel />)

    expect(screen.getByTestId('reply-thread-post-1')).toBeInTheDocument()
    expect(screen.getByTestId('reply-thread-post-2')).toBeInTheDocument()
  })

  it('shows "No posts yet" when no posts match the selected planet', () => {
    storeState = {
      ...storeState,
      posts: [], // empty
    }

    render(<PlanetInfoPanel />)

    expect(screen.getByText('No posts yet')).toBeInTheDocument()
    expect(screen.getByText(/Be the first to broadcast/i)).toBeInTheDocument()
  })

  it('property: for all post arrays with content, posts render with text visible', () => {
    // Use well-known text strings that won't have whitespace/encoding issues
    const contentArb = fc.constantFrom(
      'Feeling happy today',
      'Just finished studying',
      'Grateful for friends',
      'Coffee break vibes',
      'Good morning everyone',
    )
    const postArb = fc.record({
      id: fc.uuid(),
      planet_id: fc.constant('joy'),
      content: contentArb,
      created_at: fc.constant('2026-08-14T10:00:00Z'),
      drawing: fc.constant(null),
    })

    fc.assert(
      fc.property(
        fc.array(postArb, { minLength: 1, maxLength: 3 }),
        (posts) => {
          // Deduplicate by content to avoid multiple-match issues
          const uniquePosts = posts.filter((p, i, arr) =>
            arr.findIndex(x => x.content === p.content) === i
          )
          storeState = { ...storeState, posts: uniquePosts }

          const { unmount } = render(<PlanetInfoPanel />)

          // Each post's content should be rendered
          for (const post of uniquePosts) {
            expect(screen.getByText(post.content)).toBeInTheDocument()
          }

          unmount()
        }
      ),
      { numRuns: 10 }
    )
  })

  it('displays planet label in header', () => {
    render(<PlanetInfoPanel />)
    expect(screen.getByText('Joy')).toBeInTheDocument()
  })

  it('renders broadcast button', () => {
    render(<PlanetInfoPanel />)
    expect(screen.getByRole('button', { name: /broadcast to joy/i })).toBeInTheDocument()
  })
})
