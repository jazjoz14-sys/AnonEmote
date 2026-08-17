import React, { useState, useCallback, useEffect } from 'react'
import { getToken, clearToken, adminLogout } from './adminApi'
import AdminLogin from './AdminLogin'
import MonitorTab from './MonitorTab'
import ReportsTab from './ReportsTab'
import RulesTab from './RulesTab'
import UsersTab from './UsersTab'

const TABS = [
  { id: 'monitor', label: 'Monitor Activity', icon: '📊' },
  { id: 'reports', label: 'Reported Content', icon: '⚑' },
  { id: 'rules', label: 'Filtering Rules', icon: '🛠' },
  { id: 'users', label: 'User Management', icon: '👥' },
]

/**
 * AdminApp — the administration console.
 *
 * Implements the three flows from the admin sequence diagram:
 *   1. Monitor user activity  → fetch and display system logs
 *   2. Manage reported content → remove or flag toxic posts
 *   3. Update filtering rules  → apply new rules to the local lexicon
 */
export default function AdminApp() {
  const [authed, setAuthed] = useState(!!getToken())
  const [tab, setTab] = useState('monitor')

  // The main app locks body scroll for the 3D canvas; the console needs it back.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    const prevHeight = document.body.style.height
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.height = prevHeight
    }
  }, [])

  /** Called by any tab that receives a 401 — forces re-authentication. */
  const handleAuthError = useCallback(() => {
    clearToken()
    setAuthed(false)
  }, [])

  const handleLogout = async () => {
    try { await adminLogout() } catch { /* token may already be invalid */ }
    clearToken()
    setAuthed(false)
  }

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />

  return (
    <div className="min-h-screen text-slate-200"
         style={{ background: 'radial-gradient(ellipse at top, #16162e 0%, #0a0a1a 60%)' }}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 glass-dark border-b border-white/5">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl">🛡️</span>
            <div className="min-w-0">
              <h1 className="font-bold text-white text-sm leading-tight">
                AnonEmote Admin
              </h1>
              <p className="text-xs text-slate-500">System administration console</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/"
              className="glass px-3 py-1.5 rounded-xl text-xs text-slate-400
                         hover:text-white transition-colors"
            >
              ✦ View app
            </a>
            <button
              onClick={handleLogout}
              className="glass px-3 py-1.5 rounded-xl text-xs text-slate-400
                         hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <nav className="max-w-6xl mx-auto px-5 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm whitespace-nowrap border-b-2 transition-all
                ${tab === t.id
                  ? 'border-violet-500 text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <span className="mr-1.5">{t.icon}</span>{t.label}
            </button>
          ))}
        </nav>
      </header>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === 'monitor' && <MonitorTab onAuthError={handleAuthError} />}
        {tab === 'reports' && <ReportsTab onAuthError={handleAuthError} />}
        {tab === 'rules' && <RulesTab onAuthError={handleAuthError} />}
        {tab === 'users' && <UsersTab onAuthError={handleAuthError} />}
      </main>

      <footer className="max-w-6xl mx-auto px-5 pb-8 pt-2">
        <p className="text-xs text-slate-700">
          Administrators can moderate content but cannot identify authors — posts
          carry only anonymous session UUIDs, and logs never store post text.
        </p>
      </footer>
    </div>
  )
}
