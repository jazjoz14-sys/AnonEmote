import React, { useEffect, useState, useCallback } from 'react'
import { fetchEvaluations, markEvaluationReviewed } from '../adminApi'

// ── Constants ─────────────────────────────────────────────────────────────

/** Labels for feedback area identifiers */
const FEEDBACK_LABELS = {
  navigation: 'Easy to navigate',
  visuals: 'Visuals are appealing',
  safety: 'I feel safe here',
  support: 'Emotionally supportive',
  exploration: 'Fun to explore',
}

/** Rating level labels */
const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent']

/** Moderation status badge config */
const STATUS_STYLE = {
  approved: 'bg-emerald-900/30 text-emerald-300 border-emerald-700/40',
  pending_review: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  rejected: 'bg-red-900/30 text-red-300 border-red-700/40',
}

// ── Sub-components ────────────────────────────────────────────────────────

/**
 * Stats card for a single metric value.
 */
function StatCard({ label, value, sublabel }) {
  return (
    <div className="glass rounded-xl border border-white/5 p-4 flex flex-col gap-1 min-w-[120px]">
      <span className="text-xs text-slate-500 uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-white">{value}</span>
      {sublabel && <span className="text-[11px] text-slate-500">{sublabel}</span>}
    </div>
  )
}

/**
 * Horizontal distribution bar chart for ratings 1–5.
 * Each bar width is proportional to its percentage of total.
 */
function DistributionChart({ distribution, total }) {
  return (
    <div className="glass rounded-xl border border-white/5 p-4 flex flex-col gap-2">
      <span className="text-xs text-slate-500 uppercase tracking-wide">Rating Distribution</span>
      <div className="flex flex-col gap-1.5">
        {[5, 4, 3, 2, 1].map((level) => {
          const count = distribution[level] || 0
          const pct = total > 0 ? (count / total) * 100 : 0
          return (
            <div key={level} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-4 text-right">{level}</span>
              <div className="flex-1 h-4 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-500/70 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Moderation status badge.
 */
function ModerationBadge({ status }) {
  const style = STATUS_STYLE[status] || STATUS_STYLE.approved
  const label = status === 'pending_review' ? 'pending' : status
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] border capitalize ${style}`}>
      {label}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────

/**
 * EvaluationsPage — Admin page showing aggregated evaluation data,
 * rating distribution, feedback area statistics, and paginated planet suggestions.
 *
 * @param {{ onAuthError: () => void }} props
 */
export default function EvaluationsPage({ onAuthError }) {
  // ── Data state ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState(null)
  const [suggestions, setSuggestions] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, hasMore: false })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  // ── Per-item busy state for "Mark as reviewed" ──────────────────────────
  const [reviewingId, setReviewingId] = useState(null)

  // ── Data fetching ───────────────────────────────────────────────────────

  const load = useCallback(async (page = 1, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError('')

    try {
      const data = await fetchEvaluations(page, 50)
      setStats(data.stats)

      if (append) {
        setSuggestions((prev) => [...prev, ...(data.suggestions || [])])
      } else {
        setSuggestions(data.suggestions || [])
      }

      setPagination(data.pagination || { page, limit: 50, total: 0, hasMore: false })
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message || 'Failed to load evaluation data.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [onAuthError])

  useEffect(() => { load() }, [load])

  // ── Load more handler ───────────────────────────────────────────────────

  const handleLoadMore = () => {
    const nextPage = pagination.page + 1
    load(nextPage, true)
  }

  // ── Mark as reviewed handler ────────────────────────────────────────────

  const handleMarkReviewed = async (evaluationId) => {
    setReviewingId(evaluationId)
    try {
      await markEvaluationReviewed(evaluationId)
      // Update local state to reflect reviewed status
      setSuggestions((prev) =>
        prev.map((s) => s.id === evaluationId ? { ...s, reviewed: true } : s)
      )
    } catch (err) {
      if (err.status === 401) return onAuthError()
      // Show error inline (keep simple — just alert for now consistent with UsersPage)
      console.error('[EvaluationsPage] Mark reviewed failed:', err)
    } finally {
      setReviewingId(null)
    }
  }

  // ── Render: Error state ─────────────────────────────────────────────────

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <span className="text-3xl">⚠️</span>
        <p className="text-sm text-red-300">{error}</p>
        <button
          onClick={() => load()}
          className="px-4 py-2 rounded-lg text-sm text-violet-300 border border-violet-500/40
                     hover:bg-violet-900/30 transition-colors focus:outline-none
                     focus:ring-2 focus:ring-violet-500/50"
        >
          Retry
        </button>
      </div>
    )
  }

  // ── Render: Loading state ───────────────────────────────────────────────

  if (loading) {
    return <p className="text-sm text-slate-500 py-8 text-center">Loading evaluations...</p>
  }

  // ── Render: Main content ────────────────────────────────────────────────

  const total = stats?.total || 0
  const average = stats?.average ?? 0
  const distribution = stats?.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const feedbackAreas = stats?.feedbackAreas || []

  // Empty state
  if (total === 0) {
    return (
      <div className="flex flex-col gap-6">
        {/* Zeroed stats */}
        <div className="flex flex-wrap gap-3">
          <StatCard label="Total Evaluations" value="0" />
          <StatCard label="Average Rating" value="0.0" sublabel="out of 5" />
        </div>
        <DistributionChart distribution={distribution} total={0} />

        {/* Empty state message */}
        <div className="glass rounded-2xl py-12 text-center flex flex-col items-center gap-2">
          <span className="text-3xl">⭐</span>
          <p className="text-slate-400 text-sm">
            No evaluations have been submitted yet.
          </p>
          <p className="text-slate-500 text-xs">
            User feedback will appear here once authenticated users complete the evaluation flow.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Stats cards ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3">
        <StatCard label="Total Evaluations" value={total} />
        <StatCard label="Average Rating" value={average.toFixed(1)} sublabel="out of 5" />
      </div>

      {/* ── Distribution bar chart ───────────────────────────────────── */}
      <DistributionChart distribution={distribution} total={total} />

      {/* ── Feedback area statistics ─────────────────────────────────── */}
      {feedbackAreas.length > 0 && (
        <div className="glass rounded-xl border border-white/5 p-4 flex flex-col gap-3">
          <span className="text-xs text-slate-500 uppercase tracking-wide">
            Feedback Areas (by selection count)
          </span>
          <div className="flex flex-col gap-2">
            {feedbackAreas.map((area) => (
              <div key={area.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-300">
                  {area.label || FEEDBACK_LABELS[area.id] || area.id}
                </span>
                <span className="text-xs text-violet-300 font-mono bg-violet-900/20
                                 border border-violet-700/30 rounded-full px-2 py-0.5">
                  {area.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Planet suggestions list ──────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 uppercase tracking-wide">
            Planet Suggestions
          </span>
          <span className="text-[11px] text-slate-600">
            {pagination.total} total
          </span>
        </div>

        {suggestions.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">
            No planet suggestions submitted yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {suggestions.map((s) => (
              <article
                key={s.id}
                className="glass rounded-xl border border-white/5 p-3 sm:p-4 flex flex-col gap-2"
              >
                {/* Top row: suggestion text */}
                <p className="text-sm text-slate-200 break-words">
                  {s.suggestion}
                </p>

                {/* Meta row */}
                <div className="flex items-center gap-2 flex-wrap text-[11px]">
                  {/* Rating */}
                  <span className="text-slate-400">
                    {RATING_LABELS[s.rating - 1] || s.rating} ({s.rating}/5)
                  </span>

                  {/* Timestamp */}
                  <span className="text-slate-600">
                    {new Date(s.created_at).toLocaleString()}
                  </span>

                  {/* Moderation status badge */}
                  <ModerationBadge status={s.moderation_status} />

                  {/* Reviewed badge */}
                  {s.reviewed && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] border
                                     bg-sky-900/30 text-sky-300 border-sky-700/40">
                      Reviewed
                    </span>
                  )}
                </div>

                {/* Mark as reviewed action */}
                {!s.reviewed && (
                  <div className="pt-1">
                    <button
                      onClick={() => handleMarkReviewed(s.id)}
                      disabled={reviewingId === s.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-violet-500/30
                                 text-violet-300 hover:bg-violet-900/20 transition-colors
                                 disabled:opacity-40 disabled:cursor-not-allowed
                                 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                    >
                      {reviewingId === s.id ? 'Marking...' : 'Mark as reviewed'}
                    </button>
                  </div>
                )}
              </article>
            ))}

            {/* Load more control */}
            {pagination.hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg text-xs text-slate-300 glass
                             hover:text-white transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed
                             focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Inline error (shown if a refetch partially fails) ────────── */}
      {error && (
        <div className="bg-orange-900/30 border border-orange-700/40 rounded-xl px-4 py-3
                        text-sm text-orange-300 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => load()}
            className="text-xs text-orange-200 hover:text-white underline
                       underline-offset-2 transition-colors shrink-0"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  )
}
