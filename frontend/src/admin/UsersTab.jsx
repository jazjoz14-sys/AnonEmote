import React, { useEffect, useState, useCallback } from 'react'
import { fetchUsers, suspendUser, unsuspendUser } from './adminApi'

/**
 * UsersTab — admin panel for managing registered accounts.
 *
 * Shows: email (masked), join date, post count, report count, suspension status.
 * Actions: suspend/unsuspend with reason.
 */
export default function UsersTab({ onAuthError }) {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchUsers(page)
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch (err) {
      if (err.status === 401) onAuthError?.()
      console.error('[UsersTab]', err)
    } finally {
      setLoading(false)
    }
  }, [page, onAuthError])

  useEffect(() => { load() }, [load])

  const handleSuspend = async (userId) => {
    const reason = prompt('Suspension reason (visible to admin only):')
    if (!reason) return
    setActionLoading(userId)
    try {
      await suspendUser(userId, reason)
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

  // Mask email for privacy display: show first 3 chars + domain
  const maskEmail = (email) => {
    if (!email || !email.includes('@')) return '***'
    const [local, domain] = email.split('@')
    return `${local.slice(0, 3)}***@${domain}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">
          Registered Users ({total})
        </h2>
        <button
          onClick={load}
          className="text-xs text-slate-400 hover:text-white border border-white/10
                     px-3 py-1.5 rounded transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">Loading users...</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">No registered users yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between gap-3 p-3 rounded border
                         ${user.isSuspended
                           ? 'border-red-500/30 bg-red-900/10'
                           : 'border-white/[0.06] bg-white/[0.02]'}`}
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
                {user.isSuspended && user.suspensionReason && (
                  <p className="text-[10px] text-red-400 mt-1">
                    Reason: {user.suspensionReason}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {user.isSuspended ? (
                  <button
                    onClick={() => handleUnsuspend(user.id)}
                    disabled={actionLoading === user.id}
                    className="text-xs px-3 py-1.5 rounded border border-emerald-500/30
                               text-emerald-400 hover:bg-emerald-900/20 transition-colors
                               disabled:opacity-40"
                  >
                    Unsuspend
                  </button>
                ) : (
                  <button
                    onClick={() => handleSuspend(user.id)}
                    disabled={actionLoading === user.id}
                    className="text-xs px-3 py-1.5 rounded border border-red-500/30
                               text-red-400 hover:bg-red-900/20 transition-colors
                               disabled:opacity-40"
                  >
                    Suspend
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-500">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                className="text-xs text-slate-400 hover:text-white disabled:opacity-30"
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
