import { useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NAV_ITEMS } from '../data/navItems.js'
import { useFocusTrap } from '../hooks/useFocusTrap.js'

/**
 * MobileDrawer — Animated slide-in navigation overlay for mobile viewports.
 *
 * Renders as a portal to document.body with a semi-transparent backdrop.
 * Slides in from the left edge with a 300ms CSS transition.
 * Focus is trapped within the drawer while open, and returned to the
 * trigger element (hamburger button) on close.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   activePage: string,
 *   onNavigate: (pageId: string) => void,
 *   onLogout: () => void,
 *   triggerRef: React.RefObject<HTMLElement>
 * }} props
 */
export default function MobileDrawer({ open, onClose, activePage, onNavigate, onLogout, triggerRef }) {
  const drawerRef = useRef(null)

  // Focus trap: cycles Tab/Shift+Tab within drawer, Escape closes
  useFocusTrap(drawerRef, triggerRef, { active: open, onClose })

  // Prevent body scroll while drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  /**
   * Handle nav item click — navigate then close drawer.
   * @param {string} pageId
   */
  const handleNavClick = (pageId) => {
    onNavigate(pageId)
    onClose()
  }

  /**
   * Handle sign-out click — logout then close drawer.
   */
  const handleLogout = () => {
    onLogout()
    onClose()
  }

  // Group nav items by their group field
  const groups = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const groupOrder = ['Overview', 'Content', 'System']

  return createPortal(
    <>
      {/* Backdrop — 50% black overlay */}
      <div
        className={`fixed inset-0 z-[9998] bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        id="mobile-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={`fixed inset-y-0 left-0 z-[9999] flex flex-col bg-gradient-to-b from-[#0f0f2a] to-[#1a1a3e] border-r border-white/10 shadow-2xl transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: 'min(280px, 80vw)' }}
      >
        {/* Logo / Title */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-white/5">
          <span className="text-xl" role="img" aria-label="Shield">🛡️</span>
          <span className="text-sm font-semibold text-slate-200">AnonEmote Admin</span>
        </div>

        {/* Navigation items grouped */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Admin navigation">
          {groupOrder.map((group) => (
            <div key={group} className="mb-3">
              {/* Group label */}
              <p className="px-3 mb-1 text-[11px] uppercase tracking-widest text-slate-500 select-none">
                {group}
              </p>
              {groups[group]?.map((item) => {
                const isActive = item.id === activePage
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                      isActive
                        ? 'border-l-[3px] border-violet-500 bg-white/[0.08] text-white font-medium'
                        : 'border-l-[3px] border-transparent text-slate-300 hover:bg-white/[0.04] hover:text-white'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="text-base" aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom section: View app + Sign out */}
        <div className="border-t border-white/5 px-3 py-3 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/[0.04] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <span aria-hidden="true">🌐</span>
            <span>View app</span>
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <span aria-hidden="true">🚪</span>
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  )
}
