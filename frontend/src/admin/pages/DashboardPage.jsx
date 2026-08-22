import React, { useEffect, useState, useCallback } from 'react'
import { fetchStats, fetchLogs } from '../adminApi'
import usePolling from '../hooks/usePolling'
import KpiCard from '../components/KpiCard'
import AlertBanner from '../components/AlertBanner'
import PlanetBars from '../components/PlanetBars'
import Toast from '../components/Toast'

/**
 * DashboardPage — KPI summary, alerts, activity distribution, recent logs, quick actions.
 *
 * This is the default landing page after admin authentication. It provides an at-a-glance
 * overview of platform health: key metrics, pending alerts, planet activity distribution,
 * recent system events, and quick-action shortcuts to other sections.
 *
 * Stats are auto-refreshed every 30 seconds via usePolling. On fetch failure, stale data
 * is preserved and an error toast is shown. A 401 triggers the auth error flow.
 *
 * @param {{
 *   onAuthError: () => void,
 *   onNavigate: (pageId: import('../data/navItems').PageId) => void
 * }} props
 */
export default function DashboardPage({ onAuthError, onNavigate }) {
  // ── Stats polling (30s interval) ─────────────────────────────────────────
  const {
    data: stats,
    loading: statsLoading,
    error: statsError,
    refresh: refreshStats,
  } = usePolling(
    useCallback(async () => {
      try {
        return await fetchStats()
      } catch (err) {
        if (err.status === 401) onAuthError()
        throw err
      }
    }, [onAuthError]),
    30000
  )

  // ── Recent logs (fetched once on mount) ──────────────────────────────────
  const [recentLogs, setRecentLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function loadLogs() {
      try {
        const data = await fetchLogs({ limit: 5 })
        if (!cancelled) setRecentLogs(data.entries || [])
      } catch (err) {
        if (err.status === 401) onAuthError()
        // Logs fetch failure is non-critical — we just show an empty feed
      } finally {
        if (!cancelled) setLogsLoading(false)
      }
    }
    loadLogs()
    return () => { cancelled = true }
  }, [onAuthError])

  // ── Error toast state ────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)

  // Show error toast when stats fetch fails (but don't clear stale data)
  useEffect(() => {
    if (statsError) {
      setToast({ message: `Stats refresh failed: ${statsError}`, variant: 'error' })
    }
  }, [statsError])

  // ── Loading state ────────────────────────────────────────────────────────
  if (statsLoading && !stats) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-24 rounded-2xl bg-white/[0.06]" />
        <div className="h-40 rounded-2xl bg-white/[0.06]" />
        <div className="h-32 rounded-2xl bg-white/[0.06]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ── Alert banners ─────────────────────────────────────────────────── */}
      <aside aria-label="System alerts" role="complementary" className="flex flex-col gap-3">
        <AlertBanner
          variant="reports"
          count={stats?.reports?.pending || 0}
          onNavigate={() => onNavigate('reports')}
        />
        <AlertBanner
          variant="crisis"
          count={stats?.verdicts?.crisis || 0}
        />
      </aside>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
          Key metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard
            label="Total Posts"
            value={stats?.posts?.total ?? '—'}
          />
          <KpiCard
            label="Posts (24h)"
            value={stats?.posts?.last24h ?? '—'}
          />
          <KpiCard
            label="Pending Reports"
            value={stats?.reports?.pending ?? '—'}
            accent={stats?.reports?.pending > 0 ? 'text-orange-300' : 'text-white'}
          />
          <KpiCard
            label="Reactions"
            value={stats?.reactions ?? '—'}
          />
          <KpiCard
            label="Crisis"
            value={stats?.verdicts?.crisis ?? '—'}
            accent="text-violet-300"
          />
          <KpiCard
            label="Blocked"
            value={stats?.posts?.hidden ?? '—'}
            accent={stats?.posts?.hidden > 0 ? 'text-red-300' : 'text-white'}
          />
        </div>
      </section>

      {/* ── Health indicators ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
          System health
        </h2>
        <div className="flex flex-wrap gap-2">
          <span className={`px-3 py-1 rounded-full text-xs border
            ${stats?.storage === 'database'
              ? 'bg-emerald-900/25 text-emerald-300 border-emerald-700/40'
              : 'bg-orange-900/25 text-orange-300 border-orange-700/40'}`}>
            {stats?.storage === 'database'
              ? '✓ Persistent storage (database)'
              : '⚠ Local file storage'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs border
            ${stats?.moderationEngine === 'perspective+local'
              ? 'bg-emerald-900/25 text-emerald-300 border-emerald-700/40'
              : 'bg-orange-900/25 text-orange-300 border-orange-700/40'}`}>
            {stats?.moderationEngine === 'perspective+local'
              ? '✓ Perspective AI + local lexicons'
              : '⚠ Local lexicons only'}
          </span>
        </div>
      </section>

      {/* ── Planet activity distribution ──────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
          Activity by planet
        </h2>
        <div className="glass rounded-2xl border border-white/5 p-3 sm:p-4">
          <PlanetBars byPlanet={stats?.byPlanet || {}} />
        </div>
      </section>

      {/* ── Recent logs feed ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs uppercase tracking-widest text-slate-500">
            Recent activity
          </h2>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs text-violet-400 hover:text-violet-300 hover:underline focus:outline-none focus:ring-2 focus:ring-violet-500 rounded px-1"
          >
            View all →
          </button>
        </div>
        <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5">
          {logsLoading ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">Loading recent logs…</p>
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-slate-500">No recent events.</p>
            </div>
          ) : (
            recentLogs.map((entry, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-xs font-mono text-slate-600 shrink-0 w-14">
                  {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-xs text-slate-500 shrink-0 w-20 truncate">
                  {entry.type}
                </span>
                <span className="flex-1 text-xs text-slate-300 truncate">
                  {entry.verdict && (
                    <span className="inline-block mr-1 px-1.5 py-0.5 rounded text-[10px] bg-white/5 border border-white/10">
                      {entry.verdict}
                    </span>
                  )}
                  {entry.action || entry.reason || entry.layer || ''}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Quick actions ─────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
          Quick actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onNavigate('reports')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium
              bg-violet-600 hover:bg-violet-500 text-white
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a1a]"
          >
            Review reports
          </button>
          <button
            onClick={() => onNavigate('logs')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium
              bg-white/[0.08] hover:bg-white/[0.12] text-slate-200
              border border-white/10
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a1a]"
          >
            View live logs
          </button>
          <button
            onClick={() => onNavigate('rules')}
            className="px-4 py-2.5 rounded-xl text-sm font-medium
              bg-white/[0.08] hover:bg-white/[0.12] text-slate-200
              border border-white/10
              transition-colors duration-150
              focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-[#0a0a1a]"
          >
            Test filter rules
          </button>
        </div>
      </section>

      {/* ── Error toast ───────────────────────────────────────────────────── */}
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
