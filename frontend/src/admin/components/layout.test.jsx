/**
 * Unit tests for admin layout components:
 * Sidebar, MobileDrawer, PageShell, AdminLayout
 *
 * Validates: Requirements 1.1, 2.1, 8.5, 8.6
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

// ─── Sidebar Tests ──────────────────────────────────────────────────────────

describe('Sidebar', () => {
  let Sidebar

  beforeEach(async () => {
    const mod = await import('./Sidebar.jsx')
    Sidebar = mod.default
  })

  afterEach(() => {
    cleanup()
  })

  it('renders 6 navigation items with correct labels', () => {
    render(<Sidebar activePage="dashboard" onNavigate={() => {}} onLogout={() => {}} />)

    const expectedLabels = ['Dashboard', 'Reports', 'Rules', 'Users', 'Monitor', 'Logs']
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('groups items into 3 sections: Overview, Content, System', () => {
    render(<Sidebar activePage="dashboard" onNavigate={() => {}} onLogout={() => {}} />)

    expect(screen.getByText('Overview')).toBeInTheDocument()
    expect(screen.getByText('Content')).toBeInTheDocument()
    expect(screen.getByText('System')).toBeInTheDocument()
  })

  it('applies violet border class and aria-current="page" to active item', () => {
    render(<Sidebar activePage="reports" onNavigate={() => {}} onLogout={() => {}} />)

    const reportsButton = screen.getByRole('button', { name: /Reports/ })
    expect(reportsButton).toHaveAttribute('aria-current', 'page')
    expect(reportsButton.className).toContain('border-violet-500')
  })

  it('non-active items have tabIndex={-1}', () => {
    render(<Sidebar activePage="dashboard" onNavigate={() => {}} onLogout={() => {}} />)

    const reportsButton = screen.getByRole('button', { name: /Reports/ })
    expect(reportsButton).toHaveAttribute('tabindex', '-1')

    // Active item should have tabIndex 0
    const dashboardButton = screen.getByRole('button', { name: /Dashboard/ })
    expect(dashboardButton).toHaveAttribute('tabindex', '0')
  })
})

// ─── MobileDrawer Tests ─────────────────────────────────────────────────────

describe('MobileDrawer', () => {
  let MobileDrawer

  beforeEach(async () => {
    const mod = await import('./MobileDrawer.jsx')
    MobileDrawer = mod.default
  })

  afterEach(() => {
    cleanup()
  })

  it('when open=true, drawer panel has translate-x-0 (visible)', () => {
    const triggerRef = { current: document.createElement('button') }
    render(
      <MobileDrawer
        open={true}
        onClose={() => {}}
        activePage="dashboard"
        onNavigate={() => {}}
        onLogout={() => {}}
        triggerRef={triggerRef}
      />
    )

    const drawer = screen.getByRole('dialog')
    expect(drawer.className).toContain('translate-x-0')
    expect(drawer.className).not.toContain('-translate-x-full')
  })

  it('when open=false, drawer panel has -translate-x-full (hidden)', () => {
    const triggerRef = { current: document.createElement('button') }
    render(
      <MobileDrawer
        open={false}
        onClose={() => {}}
        activePage="dashboard"
        onNavigate={() => {}}
        onLogout={() => {}}
        triggerRef={triggerRef}
      />
    )

    const drawer = screen.getByRole('dialog')
    expect(drawer.className).toContain('-translate-x-full')
  })

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn()
    const triggerRef = { current: document.createElement('button') }
    render(
      <MobileDrawer
        open={true}
        onClose={onClose}
        activePage="dashboard"
        onNavigate={() => {}}
        onLogout={() => {}}
        triggerRef={triggerRef}
      />
    )

    // The backdrop is the fixed inset div with aria-hidden="true" and click handler
    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('contains same 6 nav items as Sidebar', () => {
    const triggerRef = { current: document.createElement('button') }
    render(
      <MobileDrawer
        open={true}
        onClose={() => {}}
        activePage="dashboard"
        onNavigate={() => {}}
        onLogout={() => {}}
        triggerRef={triggerRef}
      />
    )

    const expectedLabels = ['Dashboard', 'Reports', 'Rules', 'Users', 'Monitor', 'Logs']
    for (const label of expectedLabels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})

// ─── PageShell Tests ────────────────────────────────────────────────────────

describe('PageShell', () => {
  let PageShell

  beforeEach(async () => {
    const mod = await import('./PageShell.jsx')
    PageShell = mod.default
  })

  afterEach(() => {
    cleanup()
  })

  it('when loading=true, renders skeleton blocks (animate-pulse divs)', () => {
    render(
      <PageShell title="Test Page" loading={true}>
        <p>Content</p>
      </PageShell>
    )

    // Should not show children
    expect(screen.queryByText('Content')).not.toBeInTheDocument()

    // Should show pulsing skeleton blocks
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(3)
  })

  it('when loading=false, renders children', () => {
    render(
      <PageShell title="Test Page" loading={false}>
        <p>Visible Content</p>
      </PageShell>
    )

    expect(screen.getByText('Visible Content')).toBeInTheDocument()
  })

  it('displays the title text', () => {
    render(
      <PageShell title="Dashboard">
        <p>Content</p>
      </PageShell>
    )

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('when toolbar prop is provided, renders toolbar content', () => {
    render(
      <PageShell title="Reports" toolbar={<button>Batch Actions</button>}>
        <p>Content</p>
      </PageShell>
    )

    expect(screen.getByText('Batch Actions')).toBeInTheDocument()
  })

  it('when toolbar is not provided, toolbar area is absent', () => {
    const { container } = render(
      <PageShell title="Reports">
        <p>Content</p>
      </PageShell>
    )

    // With no toolbar, the extra toolbar div (which has its own border-b) should not be in DOM
    // Only the header border-b should exist
    const borderElements = container.querySelectorAll('.border-b.border-white\\/5')
    expect(borderElements.length).toBe(1)
  })
})

// ─── AdminLayout Tests ──────────────────────────────────────────────────────

// Mock useMediaQuery to control responsive behavior
vi.mock('../hooks/useMediaQuery.js', () => ({
  default: vi.fn(),
}))

// Mock page components to avoid importing their complex dependencies
vi.mock('../pages/DashboardPage.jsx', () => ({
  default: () => <div data-testid="dashboard-page">Dashboard</div>,
}))
vi.mock('../pages/ReportsPage.jsx', () => ({
  default: () => <div data-testid="reports-page">Reports</div>,
}))
vi.mock('../pages/RulesPage.jsx', () => ({
  default: () => <div data-testid="rules-page">Rules</div>,
}))
vi.mock('../pages/UsersPage.jsx', () => ({
  default: () => <div data-testid="users-page">Users</div>,
}))
vi.mock('../pages/MonitorPage.jsx', () => ({
  default: () => <div data-testid="monitor-page">Monitor</div>,
}))
vi.mock('../pages/LogsPage.jsx', () => ({
  default: () => <div data-testid="logs-page">Logs</div>,
}))

describe('AdminLayout', () => {
  let AdminLayout
  let useMediaQuery

  beforeEach(async () => {
    const layoutMod = await import('../AdminLayout.jsx')
    AdminLayout = layoutMod.default
    const hookMod = await import('../hooks/useMediaQuery.js')
    useMediaQuery = hookMod.default
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('when viewport >= 1024px (desktop), renders Sidebar', () => {
    // useMediaQuery('(max-width: 1023px)') returns false → desktop
    useMediaQuery.mockReturnValue(false)

    render(<AdminLayout onLogout={() => {}} onAuthError={() => {}} />)

    // Sidebar has role="navigation" with aria-label="Admin navigation"
    const nav = screen.getByRole('navigation', { name: 'Admin navigation' })
    expect(nav).toBeInTheDocument()

    // Should NOT have a hamburger button on desktop
    expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument()
  })

  it('when viewport < 1024px (mobile), renders hamburger button instead of sidebar', () => {
    // useMediaQuery('(max-width: 1023px)') returns true → mobile
    useMediaQuery.mockReturnValue(true)

    const { container } = render(<AdminLayout onLogout={() => {}} onAuthError={() => {}} />)

    // Should have a hamburger button
    const hamburger = screen.getByLabelText('Open navigation menu')
    expect(hamburger).toBeInTheDocument()

    // The fixed 240px desktop sidebar should NOT be in the main layout container.
    // (MobileDrawer portals to body, so we check the rendered container specifically)
    const fixedSidebar = container.querySelector('nav.fixed')
    expect(fixedSidebar).toBeNull()
  })
})
