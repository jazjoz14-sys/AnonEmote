import React, { useEffect, useState, useCallback, useRef } from 'react'
import { fetchUsers, suspendUser, unsuspendUser } from '../adminApi'

/**
 * UsersPage — Admin panel for managing registered accounts.
 *
 * Features:
 * - Debounced search input (300ms, min 2 chars) with client-side email filtering
 * - Expandable inline detail panel per user card
 * - Suspend/unsuspend actions with reason prompt
 * - Pagination (20/page) when no search is active
 * - Total user count displayed in section header
 *
 * @param {{ onAuthError: () => void, onNavigate?: (pageId: string) => void }} props
 */
export default function UsersPage({ onAuthError, onNavigate }) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const debounceTimer = useRef(null)

  // Expand state — which user card is expanded
  const [expandedUserId, setExpandedUserId] = useState(null)

  // ── Debounce logic (300ms, min 2 chars) ─────────────────────────────────
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(() => {
      // Only trigger filter if query is >= 2 chars or empty (clears filter)
      if (searchQuery.length >= 2 || searchQuery.length === 0) {
        setDebouncedQuery(searchQuery)
      }
    }, 300)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [searchQuery])

  // ── Determine if search is active ───────────────────────────────────────
  const isSearchActive = debouncedQuery.length >= 2

  // ── Data fetching ───────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isSearchActive) {
        // When search active: fetch up to 50, filter client-side
        const data = await fetchUsers(1, 50)
        const allUsers = data.users || []
        const filtered = allUsers.filter((user) =>
          (user.email || '').toLowerCase().includes(debouncedQuery.toLowerCase())
        )
        setUsers(filtered)
        setTotal(data.total || 0)
      } else {
        // Standard pagination (20/page)
        const data = await fetchUsers(page)
        setUsers(data.users || [])
        setTotal(data.total || 0)
      }
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      console.error('[UsersPage]', err)
    } finally {
      setLoading(false)
    }
  }, [page, isSearchActive, debouncedQuery, onAuthError])

  useEffect(() => { load() }, [load])

  // Reset page to 1 when search changes
  useEffect(() => {
    if (isSearchActive) setPage(1)
  }, [isSearchActive])

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleSuspend = async (userId) => {
    const reason = prompt('Suspension reason (visible to admin only):')
    if (!reason || reason.trim().length === 0) return
    setActionLoading(userId)
    try {
      await suspendUser(userId, reason.trim())
      load()
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUnsuspend = async (userId) => {
    setActionLoading(userId)
    try {
      await unsuspendUser(userId)
      load()
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      alert(err.message)
    } finally {
      setActionLoading(null)
    }
  }

  // ── Card expand/collapse toggle ─────────────────────────────────────────
  const toggleExpand = (userId) => {
    setExpandedUserId((prev) => (prev === userId ? null : userId))
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  /** Mask email for privacy display: show first 3 chars + domain */
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***'
    const [local, domain] = email.split('@')
    return `${local.slice(0, 3)}***@${domain}`
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Total count + search bar */}
      <div className="flex flex-col gap-3">
        <p className="text-xs text-slate-500">
          {total} registered user{total !== 1 ? 's' : ''} total
        </p>

        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email (min 2 chars)..."
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg
                       px-4 py-2.5 text-sm text-white placeholder:text-slate-500
                       focus:outline-none focus:ring-2 focus:ring-violet-500/50
                       focus:border-violet-500/50 transition-colors"
            aria-label="Search users by email"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                         hover:text-white text-sm transition-colors"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Search active indicator */}
        {isSearchActive && (
          <p className="text-[11px] text-violet-400">
            Showing {users.length} result{users.length !== 1 ? 's' : ''} matching "{debouncedQuery}"
          </p>
        )}
      </div>

      {/* User list */}
      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          {isSearchActive ? `No users matching "${debouncedQuery}".` : 'No registered users yet.'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => {
            const isExpanded = expandedUserId === user.id
            return (
              <div key={user.id} className="flex flex-col">
                {/* Main card row */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => toggleExpand(user.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleExpand(user.id)
                    }
                  }}
                  aria-expanded={isExpanded}
                  className={`flex items-center justify-between gap-3 p-3 rounded-t-lg
                             cursor-pointer select-none transition-colors
                             ${isExpanded ? 'rounded-b-none' : 'rounded-b-lg'}
                             ${user.isSuspended
                               ? 'border border-red-500/30 bg-red-900/10'
                               : 'border border-white/[0.06] bg-white/[0.02]'}
                             hover:bg-white/[0.05]`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-mono truncate">
                        {maskEmail(user.email)}
                      </span>
                      {user.isSuspended && (
                        <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5
                                         bg-red-900/40 text-red-300 rounded">
                          Suspended
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3 mt-1 text-[11px] text-slate-500">
                      <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                      <span>{user.postCount} posts</span>
                      <span className={user.reportCount > 0 ? 'text-orange-400' : ''}>
                        {user.reportCount} reports
                      </span>
                    </div>
                  </div>

                  {/* Suspend / Unsuspend button */}
                  <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                    {user.isSuspended ? (
                      <button
                        onClick={() => handleUnsuspend(user.id)}
                        disabled={actionLoading === user.id}
                        className="text-xs px-3 py-1.5 rounded border border-emerald-500/30
                                   text-emerald-400 hover:bg-emerald-900/20 transition-colors
                                   disabled:opacity-40 focus:outline-none focus:ring-2
                                   focus:ring-emerald-500/50"
                      >
                        Unsuspend
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSuspend(user.id)}
                        disabled={actionLoading === user.id}
                        className="text-xs px-3 py-1.5 rounded border border-red-500/30
                                   text-red-400 hover:bg-red-900/20 transition-colors
                                   disabled:opacity-40 focus:outline-none focus:ring-2
                                   focus:ring-red-500/50"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable detail panel */}
                {isExpanded && (
                  <div className={`px-4 py-3 border-x border-b rounded-b-lg text-xs
                                  ${user.isSuspended
                                    ? 'border-red-500/30 bg-red-900/5'
                                    : 'border-white/[0.06] bg-white/[0.01]'}`}
                  >
                    <div className="flex flex-col gap-2">
                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Status:</span>
                        <span className={user.isSuspended ? 'text-red-400' : 'text-emerald-400'}>
                          {user.isSuspended ? 'Suspended' : 'Active'}
                        </span>
                      </div>

                      {/* Suspension reason (if applicable) */}
                      {user.isSuspended && user.suspensionReason && (
                        <div className="flex items-start gap-2">
                          <span className="text-slate-500 shrink-0">Reason:</span>
                          <span className="text-red-300">{user.suspensionReason}</span>
                        </div>
                      )}

                      {/* User ID (for admin reference) */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">User ID:</span>
                        <span className="text-slate-400 font-mono text-[10px]">{user.id}</span>
                      </div>

                      {/* View reports link */}
                      <button
                        onClick={() => onNavigate?.('reports')}
                        className="mt-1 text-violet-400 hover:text-violet-300 text-left
                                   underline underline-offset-2 transition-colors
                                   focus:outline-none focus:ring-2 focus:ring-violet-500/50
                                   rounded px-1 -mx-1"
                      >
                        View reports for this user →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Pagination — only when no search is active */}
          {!isSearchActive && total > 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs text-slate-400 hover:text-white disabled:opacity-30
                           focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded
                           px-2 py-1 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-500">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 20 >= total}
                className="text-xs text-slate-400 hover:text-white disabled:opacity-30
                           focus:outline-none focus:ring-2 focus:ring-violet-500/50 rounded
                           px-2 py-1 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
