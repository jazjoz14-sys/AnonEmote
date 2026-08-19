import React, { useEffect, useState, useCallback } from 'react'
import { fetchReports, postAction, resolveReports } from './adminApi'
import { getPlanetById } from '../data/planets'

const REASON_LABEL = {
  harassment: 'Harassment',
  hate_speech: 'Hate speech',
  self_harm: 'Safety concern',
  spam: 'Spam',
  other: 'Other',
}

const REASON_STYLE = {
  harassment: 'bg-red-900/30 text-red-300 border-red-700/40',
  hate_speech: 'bg-red-900/40 text-red-200 border-red-600/50',
  self_harm: 'bg-violet-900/30 text-violet-300 border-violet-700/40',
  spam: 'bg-slate-800/50 text-slate-400 border-slate-700/40',
  other: 'bg-slate-800/50 text-slate-400 border-slate-700/40',
}

/** Review workflow state, shown per post. */
function StatusBadge({ status, hidden }) {
  const config = {
    pending:     { label: 'awaiting review', cls: 'bg-amber-900/30 text-amber-300 border-amber-700/40' },
    quarantined: { label: 'quarantined',     cls: 'bg-red-900/40 text-red-200 border-red-600/50' },
    cleared:     { label: 'approved',        cls: 'bg-sky-900/30 text-sky-300 border-sky-700/40' },
    ok:          { label: 'visible',         cls: 'bg-white/5 text-slate-500 border-white/10' },
  }[status] || { label: status || 'unknown', cls: 'bg-white/5 text-slate-500 border-white/10' }

  return (
    <span className="flex items-center gap-1.5">
      <span className={`px-2 py-0.5 rounded-full text-xs border ${config.cls}`}>
        {config.label}
      </span>
      {hidden && (
        <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800/60
                         text-slate-400 border border-slate-700/50">
          hidden
        </span>
      )}
    </span>
  )
}

/**
 * ReportsTab — Flow 2 of the admin sequence:
 * manage reported content → remove/flag → confirm action.
 */
export default function ReportsTab({ onAuthError }) {
  const [groups, setGroups] = useState([])
  const [status, setStatus] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { groups } = await fetchReports(status)
      setGroups(groups)
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status, onAuthError])

  useEffect(() => { load() }, [load])

  const flash = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  /** Apply a moderation action, then mark the group's reports reviewed. */
  const act = async (group, action) => {
    const postId = group.post.id
    setBusyId(postId)
    try {
      await postAction(postId, action)
      await resolveReports(group.reportIds)
      flash({
        delete:  'Post permanently deleted.',
        hide:    'Post quarantined and hidden from users.',
        restore: 'Post restored — still in the review queue.',
        clear:   'Post approved and protected from further auto-flagging.',
      }[action] || 'Action completed.')
      await load()
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  /** Dismiss reports without touching the post. */
  const dismiss = async (group) => {
    setBusyId(group.post.id)
    try {
      await resolveReports(group.reportIds)
      flash('Reports dismissed — post left as is.')
      await load()
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Filter */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5">
          {['pending', 'reviewed', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-all
                ${status === s ? 'bg-violet-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          className="glass px-3 py-1 rounded-full text-xs text-slate-400 hover:text-white transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {toast && (
        <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-xl px-4 py-2.5
                        text-sm text-emerald-300">
          ✓ {toast}
        </div>
      )}
      {error && (
        <div className="bg-orange-900/30 border border-orange-700/40 rounded-xl px-4 py-3
                        text-sm text-orange-300">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-slate-500 text-sm">Loading reports…</p>
      ) : groups.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center flex flex-col items-center gap-2">
          <span className="text-3xl">✨</span>
          <p className="text-slate-400 text-sm">
            {status === 'pending' ? 'No pending reports. Nothing needs review.' : 'Nothing here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const planet = getPlanetById(g.post.planet_id)
            const isBusy = busyId === g.post.id

            return (
              <article
                key={g.post.id}
                className="glass rounded-2xl p-4 flex flex-col gap-3"
                style={{ borderLeft: `3px solid ${planet?.color || '#64748b'}` }}
              >
                {/* Meta row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-400">
                      {planet?.emoji} {planet?.label || g.post.planet_id}
                    </span>
                    <span className="text-xs text-slate-600">
                      {new Date(g.post.created_at).toLocaleString()}
                    </span>
                    <StatusBadge status={g.post.review_status} hidden={g.post.is_hidden} />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Distinct networks is the trustworthy signal; raw count
                        can be inflated by one person cycling sessions. */}
                    <span
                      title="Independent networks that reported this"
                      className={`px-2 py-0.5 rounded-full text-xs border
                        ${g.distinctNetworks >= 3
                          ? 'bg-red-900/40 text-red-200 border-red-600/50'
                          : g.distinctNetworks >= 2
                            ? 'bg-orange-900/30 text-orange-300 border-orange-700/40'
                            : 'bg-white/5 text-slate-400 border-white/10'}`}
                    >
                      {g.distinctNetworks} network{g.distinctNetworks === 1 ? '' : 's'}
                    </span>
                    <span
                      title="Total reports (may include repeats from one person)"
                      className="px-2 py-0.5 rounded-full text-xs bg-white/5
                                 text-slate-500 border border-white/10"
                    >
                      {g.reportCount} report{g.reportCount === 1 ? '' : 's'}
                    </span>
                    <span
                      title="Severity-weighted priority"
                      className="px-2 py-0.5 rounded-full text-xs bg-violet-900/30
                                 text-violet-300 border border-violet-700/40"
                    >
                      P{g.priority}
                    </span>
                  </div>
                </div>

                {/* Single-network warning — the brigading signal */}
                {g.distinctNetworks === 1 && g.reportCount > 1 && (
                  <p className="text-xs text-orange-300/90 bg-orange-900/20 border
                                border-orange-700/30 rounded-lg px-3 py-2">
                    ⚠ All {g.reportCount} reports came from a single network — this
                    may be one person reporting repeatedly rather than genuine
                    community concern.
                  </p>
                )}

                {/* Author accountability info (admin-only, never shown in social layer) */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 uppercase tracking-wide">Author:</span>
                  {g.post.author_id ? (
                    <code className="px-2 py-0.5 rounded bg-white/5 border border-white/10
                                     text-slate-300 font-mono text-[11px] select-all">
                      {g.post.author_id}
                    </code>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700/50
                                     text-slate-500 italic">
                      Pre-linking era post
                    </span>
                  )}
                </div>

                {/* Reported content */}
                <p className="text-sm text-slate-200 bg-black/30 rounded-xl px-3 py-2.5
                              break-words leading-relaxed">
                  {g.post.content}
                </p>

                {/* Reasons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {g.reasons.map((r) => (
                    <span key={r}
                          className={`px-2 py-0.5 rounded-full text-xs border ${REASON_STYLE[r]}`}>
                      {REASON_LABEL[r] || r}
                    </span>
                  ))}
                </div>

                {/* Reporter notes */}
                {g.notes.length > 0 && (
                  <div className="flex flex-col gap-1">
                    {g.notes.map((n, i) => (
                      <p key={i} className="text-xs text-slate-500 italic pl-2
                                            border-l border-white/10">
                        “{n}”
                      </p>
                    ))}
                  </div>
                )}

                {/* Safety notice */}
                {g.reasons.includes('self_harm') && (
                  <div className="bg-violet-900/25 border border-violet-700/40 rounded-xl
                                  px-3 py-2 text-xs text-violet-200">
                    💙 Flagged as a safety concern. Consider whether outreach or
                    escalation to campus counselling is warranted before removing.
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 flex-wrap pt-1">
                  {g.post.is_hidden ? (
                    <button
                      onClick={() => act(g, 'restore')}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-emerald-200
                                 bg-emerald-900/40 hover:bg-emerald-900/60 border
                                 border-emerald-700/40 disabled:opacity-40 transition-all"
                    >
                      ↺ Restore post
                    </button>
                  ) : (
                    <button
                      onClick={() => act(g, 'hide')}
                      disabled={isBusy}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-orange-200
                                 bg-orange-900/40 hover:bg-orange-900/60 border
                                 border-orange-700/40 disabled:opacity-40 transition-all"
                    >
                      ⚑ Flag &amp; hide
                    </button>
                  )}

                  <button
                    onClick={() => {
                      if (window.confirm('Permanently delete this post? This cannot be undone.')) {
                        act(g, 'delete')
                      }
                    }}
                    disabled={isBusy}
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-red-200
                               bg-red-900/40 hover:bg-red-900/60 border border-red-700/40
                               disabled:opacity-40 transition-all"
                  >
                    🗑 Delete permanently
                  </button>

                  {/* Clear marks the post as reviewed-and-acceptable, which
                      makes it immune to further automatic flagging. This is the
                      remedy for a brigaded post. */}
                  <button
                    onClick={() => act(g, 'clear')}
                    disabled={isBusy}
                    title="Approve this post and protect it from further auto-flagging"
                    className="px-3 py-2 rounded-xl text-xs font-semibold text-sky-200
                               bg-sky-900/40 hover:bg-sky-900/60 border border-sky-700/40
                               disabled:opacity-40 transition-all"
                  >
                    ✓ Approve &amp; protect
                  </button>

                  <button
                    onClick={() => dismiss(g)}
                    disabled={isBusy}
                    className="px-3 py-2 rounded-xl text-xs text-slate-400 glass
                               hover:text-white disabled:opacity-40 transition-all"
                  >
                    Dismiss reports
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
