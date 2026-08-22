import React, { useEffect, useState, useCallback } from 'react'
import { fetchReports, postAction, resolveReports } from '../adminApi'
import { getPlanetById } from '../../data/planets'
import BatchActionBar from '../components/BatchActionBar'
import Toast from '../components/Toast'

// ── Sort logic (exported for property tests) ──────────────────────────────
/**
 * Sort report groups by the given criterion, breaking ties by post ID.
 *
 * @param {Array} groups - Array of report group objects
 * @param {'priority'|'newest'|'oldest'|'reports'} sortBy - Sort criterion
 * @returns {Array} Sorted copy (original array is not mutated)
 */
export function sortReports(groups, sortBy) {
  return [...groups].sort((a, b) => {
    switch (sortBy) {
      case 'priority': return a.priority - b.priority || a.post.id.localeCompare(b.post.id)
      case 'newest': return new Date(b.post.created_at) - new Date(a.post.created_at) || a.post.id.localeCompare(b.post.id)
      case 'oldest': return new Date(a.post.created_at) - new Date(b.post.created_at) || a.post.id.localeCompare(b.post.id)
      case 'reports': return b.reportCount - a.reportCount || a.post.id.localeCompare(b.post.id)
      default: return 0
    }
  })
}

// ── Constants ─────────────────────────────────────────────────────────────

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

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority' },
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'reports', label: 'Report count' },
]

// ── Sub-components ────────────────────────────────────────────────────────

/** Review workflow state badge for each report card. */
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

// ── Main component ────────────────────────────────────────────────────────

/**
 * ReportsPage — Content moderation queue with batch actions and sort controls.
 *
 * Refactored from ReportsTab.jsx with additions:
 * - Checkbox selection per report card
 * - BatchActionBar integration
 * - Sort controls (priority, newest, oldest, report count)
 * - Header row with total count
 * - Toast notifications for batch results
 * - Clear selection on filter change
 * - Partial failure handling (leave failed items selected)
 *
 * @param {{ onAuthError: () => void }} props
 */
export default function ReportsPage({ onAuthError }) {
  // ── Data state ──────────────────────────────────────────────────────────
  const [groups, setGroups] = useState([])
  const [status, setStatus] = useState('pending')
  const [sortBy, setSortBy] = useState('priority')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // ── Selection state ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [processing, setProcessing] = useState(false)

  // ── Per-card busy state ─────────────────────────────────────────────────
  const [busyId, setBusyId] = useState(null)

  // ── Toast state ─────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null) // { message, variant }

  // ── Data fetching ───────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { groups: fetchedGroups } = await fetchReports(status)
      setGroups(fetchedGroups)
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [status, onAuthError])

  useEffect(() => { load() }, [load])

  // ── Derived state ───────────────────────────────────────────────────────

  const sortedGroups = sortReports(groups, sortBy)

  // ── Filter change handler ───────────────────────────────────────────────

  const handleFilterChange = (newStatus) => {
    setStatus(newStatus)
    setSelectedIds(new Set()) // Requirement 4.10: clear selection on filter change
  }

  // ── Selection handlers ──────────────────────────────────────────────────

  const toggleSelection = (postId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(postId)) {
        next.delete(postId)
      } else {
        next.add(postId)
      }
      return next
    })
  }

  // ── Batch action handlers ───────────────────────────────────────────────

  /**
   * Process a batch action across all selected report groups.
   * @param {'dismiss'|'hide'|'delete'} action
   */
  const handleBatchAction = async (action) => {
    setProcessing(true)
    let successCount = 0
    let failCount = 0
    const failedIds = new Set()

    // Build the list of selected groups
    const selectedGroups = groups.filter((g) => selectedIds.has(g.post.id))

    for (const group of selectedGroups) {
      try {
        if (action === 'dismiss') {
          await resolveReports(group.reportIds)
        } else if (action === 'hide') {
          await postAction(group.post.id, 'hide')
          await resolveReports(group.reportIds)
        } else if (action === 'delete') {
          await postAction(group.post.id, 'delete')
          await resolveReports(group.reportIds)
        }
        successCount++
      } catch (err) {
        if (err.status === 401) {
          setProcessing(false)
          return onAuthError()
        }
        failCount++
        failedIds.add(group.post.id)
      }
    }

    // Update selection: keep only failed items selected for retry
    if (failCount > 0) {
      setSelectedIds(failedIds)
      setToast({
        message: `${failCount} item${failCount !== 1 ? 's' : ''} failed to process. They remain selected for retry.`,
        variant: 'error',
      })
    } else {
      setSelectedIds(new Set())
      setToast({
        message: `${successCount} report${successCount !== 1 ? 's' : ''} processed successfully.`,
        variant: 'success',
      })
    }

    setProcessing(false)
    await load()
  }

  // ── Per-card action handlers (preserved from ReportsTab) ────────────────

  /** Apply a moderation action, then mark the group's reports reviewed. */
  const act = async (group, action) => {
    const postId = group.post.id
    setBusyId(postId)
    try {
      await postAction(postId, action)
      await resolveReports(group.reportIds)
      const messages = {
        delete:  'Post permanently deleted.',
        hide:    'Post quarantined and hidden from users.',
        restore: 'Post restored — still in the review queue.',
        clear:   'Post approved and protected from further auto-flagging.',
      }
      setToast({ message: messages[action] || 'Action completed.', variant: 'success' })
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
      setToast({ message: 'Reports dismissed — post left as is.', variant: 'success' })
      await load()
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setBusyId(null)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Filter pills + sort controls + refresh */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Filter pills (preserved) */}
        <div className="flex gap-1.5">
          {['pending', 'reviewed', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => handleFilterChange(s)}
              className={`px-3 py-1 rounded-full text-xs capitalize transition-all
                ${status === s ? 'bg-violet-600 text-white' : 'glass text-slate-400 hover:text-white'}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <label htmlFor="reports-sort" className="text-xs text-slate-500 whitespace-nowrap">
            Sort:
          </label>
          <select
            id="reports-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white/[0.06] border border-white/10 rounded-lg text-xs text-slate-300
                       px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <button
            onClick={load}
            className="glass px-3 py-1 rounded-full text-xs text-slate-400 hover:text-white transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Header row — total count */}
      {!loading && !error && (
        <div className="text-sm text-slate-400">
          {sortedGroups.length} report{sortedGroups.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="bg-orange-900/30 border border-orange-700/40 rounded-xl px-4 py-3
                        text-sm text-orange-300">
          {error}
        </div>
      )}

      {/* Content states */}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading reports…</p>
      ) : sortedGroups.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center flex flex-col items-center gap-2">
          <span className="text-3xl">✨</span>
          <p className="text-slate-400 text-sm">
            {status === 'pending'
              ? 'No pending reports. Nothing needs review.'
              : status === 'reviewed'
                ? 'No reviewed reports found.'
                : 'No reports match the current filter.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sortedGroups.map((g) => {
            const planet = getPlanetById(g.post.planet_id)
            const isBusy = busyId === g.post.id
            const isSelected = selectedIds.has(g.post.id)

            return (
              <article
                key={g.post.id}
                className={[
                  'glass rounded-2xl border border-white/5 p-3 sm:p-4 flex gap-3 transition-all',
                  isSelected ? 'ring-2 ring-violet-500/60' : '',
                ].join(' ')}
                style={{ borderLeft: `3px solid ${planet?.color || '#64748b'}` }}
              >
                {/* Checkbox for batch selection */}
                <div className="flex items-start pt-1 shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelection(g.post.id)}
                    disabled={processing}
                    aria-label={`Select report for post: ${(g.post.content || '').slice(0, 40)}`}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.06] text-violet-500
                               focus:ring-2 focus:ring-violet-500 focus:ring-offset-0
                               cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Card content */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
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
                      {/* Distinct networks — trustworthy signal */}
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

                  {/* Single-network warning */}
                  {g.distinctNetworks === 1 && g.reportCount > 1 && (
                    <p className="text-xs text-orange-300/90 bg-orange-900/20 border
                                  border-orange-700/30 rounded-lg px-3 py-2">
                      ⚠ All {g.reportCount} reports came from a single network — this
                      may be one person reporting repeatedly rather than genuine
                      community concern.
                    </p>
                  )}

                  {/* Author accountability info */}
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
                            className={`px-2 py-0.5 rounded-full text-xs border ${REASON_STYLE[r] || REASON_STYLE.other}`}>
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
                          &ldquo;{n}&rdquo;
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

                  {/* Per-card action buttons (preserved) */}
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
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Batch action bar — fixed to bottom when items selected */}
      <BatchActionBar
        selectedCount={selectedIds.size}
        onDismiss={() => handleBatchAction('dismiss')}
        onHide={() => handleBatchAction('hide')}
        onDelete={() => handleBatchAction('delete')}
        disabled={processing}
      />

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
