import React, { useEffect, useState, useCallback } from 'react'
import { fetchStats, fetchLogs } from './adminApi'
import { PLANETS } from '../data/planets'

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

function StatCard({ label, value, hint, accent = 'text-white' }) {
  return (
    <div className="glass rounded-2xl px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-2xl font-bold ${accent}`}>{value}</span>
      {hint && <span className="text-xs text-slate-600">{hint}</span>}
    </div>
  )
}

/**
 * MonitorTab — Flow 1 of the admin sequence:
 * request activity → fetch system logs → display.
 */
export default function MonitorTab({ onAuthError }) {
  const [stats, setStats] = useState(null)
  const [logs, setLogs] = useState([])
  const [logType, setLogType] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const [s, l] = await Promise.all([
        fetchStats(),
        fetchLogs({ limit: 200, type: logType || undefined }),
      ])
      setStats(s)
      setLogs(l.entries)
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [logType, onAuthError])

  useEffect(() => { load() }, [load])

  // Live refresh every 15s
  useEffect(() => {
    const id = setInterval(load, 15000)
    return () => clearInterval(id)
  }, [load])

  if (loading) {
    return <p className="text-slate-500 text-sm">Loading system activity…</p>
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div className="bg-orange-900/30 border border-orange-700/40 rounded-xl px-4 py-3
                        text-sm text-orange-300">
          {error}
        </div>
      )}

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          System overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Posts" value={stats.posts.total} hint={`${stats.posts.last24h} in 24h`} />
          <StatCard label="Hidden" value={stats.posts.hidden}
                    accent={stats.posts.hidden > 0 ? 'text-orange-300' : 'text-white'} />
          <StatCard label="Reactions" value={stats.reactions} />
          <StatCard label="Reports" value={stats.reports.total}
                    hint={`${stats.reports.pending} pending`}
                    accent={stats.reports.pending > 0 ? 'text-red-300' : 'text-white'} />
          <StatCard label="Blocked" value={stats.verdicts.toxic || 0} accent="text-red-300" />
          <StatCard label="Crisis" value={stats.verdicts.crisis || 0} accent="text-violet-300" />
        </div>

        {/* Deployment health — confirms persistence and AI layer are active */}
        <div className="flex flex-wrap gap-2 mt-3">
          <span className={`px-3 py-1 rounded-full text-xs border
            ${stats.storage === 'database'
              ? 'bg-emerald-900/25 text-emerald-300 border-emerald-700/40'
              : 'bg-orange-900/25 text-orange-300 border-orange-700/40'}`}>
            {stats.storage === 'database'
              ? '✓ Persistent storage (database)'
              : '⚠ Local file storage — resets on redeploy'}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs border
            ${stats.moderationEngine === 'perspective+local'
              ? 'bg-emerald-900/25 text-emerald-300 border-emerald-700/40'
              : 'bg-orange-900/25 text-orange-300 border-orange-700/40'}`}>
            {stats.moderationEngine === 'perspective+local'
              ? '✓ Perspective AI + local lexicons'
              : '⚠ Local lexicons only — no API key set'}
          </span>
        </div>
      </section>

      {/* ── Distribution by planet ───────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Activity by emotion planet
        </h2>
        <div className="glass rounded-2xl p-4 flex flex-col gap-2">
          {PLANETS.map((p) => {
            const count = stats.byPlanet[p.id] || 0
            const max = Math.max(1, ...Object.values(stats.byPlanet))
            return (
              <div key={p.id} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-slate-300">
                  {p.emoji} {p.label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(count / max) * 100}%`, background: p.color }}
                  />
                </div>
                <span className="w-10 text-right text-slate-500 font-mono text-xs">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── System logs ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500">
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

        <div className="glass rounded-2xl divide-y divide-white/5 max-h-96 overflow-y-auto">
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
