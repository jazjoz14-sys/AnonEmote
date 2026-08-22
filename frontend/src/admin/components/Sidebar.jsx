import React, { useRef, useCallback } from 'react'
import { NAV_ITEMS } from '../data/navItems.js'

/**
 * Sidebar — Fixed-position vertical navigation for the admin console (desktop).
 *
 * Renders navigation items grouped by their `group` field with section labels.
 * Implements roving tabindex for keyboard navigation (ArrowUp/Down, Home/End, Enter/Space).
 *
 * @param {{
 *   activePage: import('../data/navItems.js').PageId,
 *   onNavigate: (pageId: import('../data/navItems.js').PageId) => void,
 *   onLogout: () => void
 * }} props
 */
export default function Sidebar({ activePage, onNavigate, onLogout }) {
  /** @type {React.MutableRefObject<HTMLButtonElement[]>} */
  const itemRefs = useRef([])

  /**
   * Groups NAV_ITEMS by their `group` field, preserving insertion order.
   * @returns {Array<{ group: string, items: typeof NAV_ITEMS }>}
   */
  const grouped = (() => {
    const map = new Map()
    for (const item of NAV_ITEMS) {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group).push(item)
    }
    return Array.from(map.entries()).map(([group, items]) => ({ group, items }))
  })()

  /** Flat list of all item IDs for roving tabindex index tracking */
  const flatIds = NAV_ITEMS.map((item) => item.id)

  /**
   * Roving tabindex keyboard handler.
   * ArrowDown/ArrowUp — move focus sequentially.
   * Home — jump to first item. End — jump to last item.
   * Enter/Space — activate the focused item.
   */
  const handleKeyDown = useCallback(
    (e, currentIndex) => {
      let nextIndex = null

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          nextIndex = (currentIndex + 1) % flatIds.length
          break
        case 'ArrowUp':
          e.preventDefault()
          nextIndex = (currentIndex - 1 + flatIds.length) % flatIds.length
          break
        case 'Home':
          e.preventDefault()
          nextIndex = 0
          break
        case 'End':
          e.preventDefault()
          nextIndex = flatIds.length - 1
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          onNavigate(flatIds[currentIndex])
          return
        default:
          return
      }

      if (nextIndex !== null) {
        itemRefs.current[nextIndex]?.focus()
      }
    },
    [flatIds, onNavigate]
  )

  return (
    <nav
      role="navigation"
      aria-label="Admin navigation"
      className="fixed left-0 top-0 h-screen w-[240px] flex flex-col z-30
                 border-r border-white/5"
      style={{ background: 'linear-gradient(180deg, #0a0a1a 0%, #16162e 100%)' }}
    >
      {/* ── Logo / Title ─────────────────────────────────────────────── */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-xl" aria-hidden="true">🛡️</span>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight">
              AnonEmote Admin
            </h1>
            <p className="text-[11px] text-slate-500">Administration</p>
          </div>
        </div>
      </div>

      {/* ── Grouped navigation items ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        {grouped.map(({ group, items }) => (
          <div key={group} className="mb-5">
            {/* Section label */}
            <span className="block px-2 mb-2 text-[11px] uppercase tracking-widest text-slate-500 select-none">
              {group}
            </span>

            {/* Nav items */}
            {items.map((item) => {
              const isActive = activePage === item.id
              const idx = flatIds.indexOf(item.id)

              return (
                <button
                  key={item.id}
                  ref={(el) => { itemRefs.current[idx] = el }}
                  onClick={() => onNavigate(item.id)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  tabIndex={isActive ? 0 : -1}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm
                    transition-all duration-150 cursor-pointer
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500
                    ${isActive
                      ? 'border-l-[3px] border-violet-500 bg-white/[0.08] text-white pl-[9px]'
                      : 'border-l-[3px] border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
                    }
                  `}
                >
                  <span className="text-base" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* ── Footer: View app + Sign out ──────────────────────────────── */}
      <div className="px-4 py-4 border-t border-white/5 space-y-2">
        <a
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400
                     hover:text-white hover:bg-white/[0.04] transition-colors
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <span aria-hidden="true">✦</span>
          <span>View app</span>
        </a>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400
                     hover:text-white hover:bg-white/[0.04] transition-colors cursor-pointer
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <span aria-hidden="true">↪</span>
          <span>Sign out</span>
        </button>
      </div>
    </nav>
  )
}
