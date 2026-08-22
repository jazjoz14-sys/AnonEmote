import React, { useState, useRef } from 'react'
import useMediaQuery from './hooks/useMediaQuery.js'
import Sidebar from './components/Sidebar.jsx'
import MobileDrawer from './components/MobileDrawer.jsx'
import PageShell from './components/PageShell.jsx'
import { NAV_ITEMS } from './data/navItems.js'
import DashboardPage from './pages/DashboardPage.jsx'
import ReportsPage from './pages/ReportsPage.jsx'
import RulesPage from './pages/RulesPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import MonitorPage from './pages/MonitorPage.jsx'
import LogsPage from './pages/LogsPage.jsx'

/**
 * @typedef {'dashboard'|'reports'|'rules'|'users'|'monitor'|'logs'} PageId
 */

/**
 * Page title lookup from NAV_ITEMS.
 * @type {Record<PageId, string>}
 */
const PAGE_TITLES = NAV_ITEMS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, /** @type {Record<string, string>} */ ({}))

/**
 * AdminLayout — Authenticated layout shell with sidebar navigation.
 *
 * Renders a persistent Sidebar on desktop (≥1024px) or a hamburger-triggered
 * MobileDrawer on mobile (<1024px). Routes `activePage` state to the
 * corresponding section page component via PageShell.
 *
 * @param {{
 *   onLogout: () => void,
 *   onAuthError: () => void
 * }} props
 */
export default function AdminLayout({ onLogout, onAuthError }) {
  /** @type {[PageId, React.Dispatch<React.SetStateAction<PageId>>]} */
  const [activePage, setActivePage] = useState(/** @type {PageId} */ ('dashboard'))
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Responsive breakpoint: true when viewport is below 1024px
  const isMobile = useMediaQuery('(max-width: 1023px)')

  // Ref to hamburger button for focus return after drawer close
  /** @type {React.RefObject<HTMLButtonElement>} */
  const hamburgerRef = useRef(null)

  /**
   * Navigate to a section page.
   * @param {PageId} pageId
   */
  const handleNavigate = (pageId) => {
    setActivePage(pageId)
  }

  /**
   * Open the mobile drawer.
   */
  const openDrawer = () => setDrawerOpen(true)

  /**
   * Close the mobile drawer.
   */
  const closeDrawer = () => setDrawerOpen(false)

  /**
   * Render the section page component corresponding to activePage.
   * Each page receives onAuthError; DashboardPage also gets onNavigate for quick actions.
   */
  const renderPageContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <DashboardPage onAuthError={onAuthError} onNavigate={handleNavigate} />
      case 'reports':
        return <ReportsPage onAuthError={onAuthError} />
      case 'rules':
        return <RulesPage onAuthError={onAuthError} />
      case 'users':
        return <UsersPage onAuthError={onAuthError} />
      case 'monitor':
        return <MonitorPage onAuthError={onAuthError} />
      case 'logs':
        return <LogsPage onAuthError={onAuthError} />
      default:
        return <DashboardPage onAuthError={onAuthError} onNavigate={handleNavigate} />
    }
  }

  return (
    <div
      className="min-h-screen text-slate-200"
      style={{ background: 'radial-gradient(ellipse at top, #16162e 0%, #0a0a1a 60%)' }}
    >
      {/* ── Desktop: Sidebar (fixed left, 240px) ─────────────────────── */}
      {!isMobile && (
        <Sidebar
          activePage={activePage}
          onNavigate={handleNavigate}
          onLogout={onLogout}
        />
      )}

      {/* ── Mobile: Top bar with hamburger + MobileDrawer ────────────── */}
      {isMobile && (
        <>
          {/* Top navigation bar */}
          <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a1a]/95 backdrop-blur-sm">
            <div className="flex items-center justify-between px-4 py-3">
              {/* Hamburger button — 44×44px minimum touch target */}
              <button
                ref={hamburgerRef}
                onClick={openDrawer}
                aria-expanded={drawerOpen}
                aria-controls="mobile-nav-drawer"
                aria-label="Open navigation menu"
                className="flex items-center justify-center w-[44px] h-[44px] rounded-lg text-slate-300 hover:text-white hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                {/* Hamburger icon (3-line) */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>

              {/* Current page title */}
              <h1 className="text-sm font-semibold text-slate-200 truncate px-2">
                {PAGE_TITLES[activePage]}
              </h1>

              {/* Connection status indicator (placeholder dot) */}
              <div className="flex items-center gap-2" aria-label="Connection status">
                <span
                  className="w-2 h-2 rounded-full bg-emerald-400"
                  title="Connected"
                  aria-hidden="true"
                />
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Connected
                </span>
              </div>
            </div>
          </header>

          {/* Mobile drawer overlay */}
          <MobileDrawer
            open={drawerOpen}
            onClose={closeDrawer}
            activePage={activePage}
            onNavigate={handleNavigate}
            onLogout={onLogout}
            triggerRef={hamburgerRef}
          />
        </>
      )}

      {/* ── Main content area ─────────────────────────────────────────── */}
      <main
        aria-label="Section content"
        className={`flex flex-col min-h-[calc(100vh-56px)] ${
          !isMobile ? 'ml-[240px]' : ''
        }`}
        style={!isMobile ? { minHeight: '100vh' } : undefined}
      >
        <PageShell title={PAGE_TITLES[activePage]}>
          {renderPageContent()}
        </PageShell>
      </main>
    </div>
  )
}
