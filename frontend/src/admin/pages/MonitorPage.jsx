import React, { useEffect, useState, useCallback } from 'react'
import { fetchStats, fetchLogs } from '../adminApi'

/**
 * Log type filter options for the system log feed.
 * Matches the original MonitorTab filter set.
 */
const LOG_TYPES = [
  { id: '', label: 'All events' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'report', label: 'Reports' },
  { id: 'admin_action', label: 'Admin actions' },
  { id: 'admin_login', label: 'Sign-ins' },
]

/** Colour coding so problem events stand out in the log stream. */
const verdictStyle = (v) => ({
  crisis: 'text-violet-300 bg-violet-900/30 border-violet-700/40',
  toxic: 'text-red-300 bg-red-900/30 border-red-700/40',
  safe: 'text-emerald-300 bg-emerald-900/20 border-emerald-800/30',
}[v] || 'text-slate-400 bg-white/5 border-white/10')

/**
 * MonitorPage — Refactored from MonitorTab.
 *
 * Displays:
 * - Verdict breakdown row (safe / toxic / crisis counts)
 * - System log feed with type filters
 *
 * Removed (moved to DashboardPage):
 * - KPI summary cards
 * - Deployment health badges
 * - Planet activity distribution
 *
 * Designed to be wrapped by PageShell — no own header or outer container.
 *
 * @param {{ onAuthError: () => void }} props
 */
export default function MonitorPage({ onAuthError }) {
  const [verdicts, setVerdicts] = useState(null)
  const [logs, setLogs] = useState([])
  const [logType, setLogType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /**
   * Fetch verdict stats and logs. On 401, delegates to onAuthError.
   * On other failures, sets inline error but does NOT stop auto-refresh.
   */
  const load = useCallback(async () => {
    setError('')
    try {
      const [statsData, logsData] = await Promise.all([
        fetchStats(),
        fetchLogs({ limit: 200, type: logType || undefined }),
      ])
      setVerdicts(statsData.verdicts)
      setLogs(logsData.entries)
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [logType, onAuthError])

  // Initial fetch + re-fetch on filter change
  useEffect(() => { load() }, [load])

  // Auto-refresh every 15 seconds
  useEffect(() => {
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading monitor data…</p>
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* ── Inline error banner ──────────────────────────────────────────── */}
      {error && (
        <div className="bg-orange-900/30 border border-orange-700/40 rounded-xl px-4 py-3
                        text-sm text-orange-300">
          {error}
        </div>
      )}

      {/* ── Verdict breakdown row ────────────────────────────────────────── */}
      {verdicts && (
        <section>
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">
            Verdict breakdown
          </h2>
          <div className="glass rounded-2xl border border-white/5 px-3 sm:px-4 py-3 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm text-slate-300">Safe</span>
              <span className="text-lg font-bold text-emerald-300">
                {verdicts.safe || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="text-sm text-slate-300">Toxic</span>
              <span className="text-lg font-bold text-red-300">
                {verdicts.toxic || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400" />
              <span className="text-sm text-slate-300">Crisis</span>
              <span className="text-lg font-bold text-violet-300">
                {verdicts.crisis || 0}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* ── System logs with type filters ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-xs uppercase tracking-widest text-slate-500">
            System logs
          </h2>
          <div className="flex gap-1.5 flex-wrap">
            {LOG_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setLogType(t.id)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all
                  ${logType === t.id
                    ? 'bg-violet-600 text-white'
                    : 'glass text-slate-400 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass rounded-2xl border border-white/5 divide-y divide-white/5 max-h-96 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No events recorded yet.</p>
          ) : (
            logs.map((e, i) => (
              <div key={i} className="px-4 py-2.5 flex items-start gap-3 text-sm">
                <span className="text-xs font-mono text-slate-600 shrink-0 w-16">
                  {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <span className="text-xs text-slate-500 shrink-0 w-24 truncate">
                  {e.type}
                </span>

                <div className="flex-1 flex items-center gap-2 flex-wrap min-w-0">
                  {e.verdict && (
                    <span className={`px-2 py-0.5 rounded-full text-xs border ${verdictStyle(e.verdict)}`}>
                      {e.verdict}
                    </span>
                  )}
                  {e.layer && (
                    <span className="text-xs text-slate-500 font-mono truncate">{e.layer}</span>
                  )}
                  {e.action && <span className="text-xs text-slate-300">{e.action}</span>}
                  {e.reason && <span className="text-xs text-slate-400">{e.reason}</span>}
                  {typeof e.topScore === 'number' && (
                    <span className="text-xs text-slate-600 font-mono">score {e.topScore}</span>
                  )}
                  {e.planet_id && (
                    <span className="text-xs text-slate-600">/{e.planet_id}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <p className="text-xs text-slate-600 mt-2">
          Logs record verdicts and metadata only — never post content, preserving
          anonymity even from administrators.
        </p>
      </section>
    </div>
  )
}
