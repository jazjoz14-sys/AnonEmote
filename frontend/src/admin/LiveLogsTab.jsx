import React, { useState, useEffect, useRef, useCallback } from 'react'
import { getStreamUrl } from './adminApi'

const MAX_ENTRIES = 500

/** Severity filter options */
const SEVERITY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'error', label: 'Errors' },
  { id: 'warning', label: 'Warnings' },
  { id: 'info', label: 'Info' },
]

/** Type filter options */
const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'report', label: 'Reports' },
  { id: 'admin', label: 'Admin' },
  { id: 'rate_limit', label: 'Rate limits' },
]

/** Tailwind classes for severity badges */
const SEVERITY_STYLES = {
  error: 'bg-red-500/20 text-red-400',
  warning: 'bg-amber-500/20 text-amber-400',
  info: 'bg-slate-500/20 text-slate-400',
}

/** Tailwind classes for connection indicator badges */
const CONNECTION_STYLES = {
  live: 'bg-emerald-500/20 text-emerald-400',
  reconnecting: 'bg-amber-500/20 text-amber-400',
  disconnected: 'bg-red-500/20 text-red-400',
}

/** Connection indicator label text */
const CONNECTION_LABELS = {
  live: 'Live',
  reconnecting: 'Reconnecting',
  disconnected: 'Disconnected',
}

/**
 * Format a timestamp string into a compact local time display.
 * @param {string} ts — ISO 8601 timestamp
 */
function formatTimestamp(ts) {
  try {
    const d = new Date(ts)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return ts || '—'
  }
}

/**
 * Render a compact one-line payload summary string.
 * Returns null if payload is empty or not an object.
 * @param {object|undefined} payload
 */
function summarizePayload(payload) {
  if (!payload || typeof payload !== 'object') return null
  const entries = Object.entries(payload)
  if (entries.length === 0) return null
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ')
}

/**
 * LiveLogsTab — Real-time SSE log stream viewer for the admin console.
 *
 * Connects to the backend SSE endpoint on mount, displays entries with severity
 * badges, and tracks connection state. Filter and pause controls will be added
 * in subsequent tasks (4.3 and 4.4).
 *
 * @param {{ onAuthError: () => void }} props
 */
export default function LiveLogsTab({ onAuthError }) {
  // ── State ──────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([])
  const [connectionState, setConnectionState] = useState('disconnected')

  // Placeholders for task 4.3 (filters) and 4.4 (pause) — structured for easy addition
  const [paused, setPaused] = useState(false)
  const [pauseBuffer, setPauseBuffer] = useState([])
  const [severityFilter, setSeverityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // ── Refs ────────────────────────────────────────────────────────────────
  const esRef = useRef(null)
  const failCountRef = useRef(0)

  // ── Filtered entries (filters only affect visible list, not the buffer) ─
  const filteredEntries = entries.filter((entry) => {
    if (severityFilter !== 'all' && entry.severity !== severityFilter) return false
    if (typeFilter !== 'all' && !(entry.type || '').includes(typeFilter)) return false
    return true
  })

  // ── SSE connection logic ────────────────────────────────────────────────
  const connect = useCallback(() => {
    // Close any existing connection
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const url = getStreamUrl()
    const es = new EventSource(url)
    esRef.current = es
    failCountRef.current = 0
    setConnectionState('reconnecting')

    es.onopen = () => {
      setConnectionState('live')
      failCountRef.current = 0
    }

    es.onmessage = (event) => {
      try {
        const entry = JSON.parse(event.data)
        setConnectionState('live')
        failCountRef.current = 0

        setEntries((prev) => {
          const next = [entry, ...prev]
          return next.length > MAX_ENTRIES ? next.slice(0, MAX_ENTRIES) : next
        })
      } catch (err) {
        console.warn('[LiveLogs] Failed to parse SSE message:', err)
      }
    }

    es.onerror = (evt) => {
      failCountRef.current++

      // EventSource readyState 2 = CLOSED — browser gave up or server sent 401
      if (es.readyState === 2) {
        // If server responded with 401, treat as auth error
        if (onAuthError) onAuthError()
        setConnectionState('disconnected')
        es.close()
        return
      }

      if (failCountRef.current >= 3) {
        setConnectionState('disconnected')
        es.close()
      } else {
        setConnectionState('reconnecting')
      }
    }
  }, [onAuthError])

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect()
    return () => {
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
    }
  }, [connect])

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header row: title + connection indicator ─────────────────────── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Live Logs</h2>

        <div className="flex items-center gap-3">
          {/* Connection badge */}
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${CONNECTION_STYLES[connectionState]}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionState === 'live' ? 'bg-emerald-400 animate-pulse' :
              connectionState === 'reconnecting' ? 'bg-amber-400 animate-pulse' :
              'bg-red-400'
            }`} />
            {CONNECTION_LABELS[connectionState]}
          </span>

          {/* Reconnect button — only shown when disconnected */}
          {connectionState === 'disconnected' && (
            <button
              onClick={connect}
              className="glass px-3 py-1.5 rounded-xl text-xs text-slate-400
                         hover:text-white transition-colors"
            >
              Reconnect
            </button>
          )}
        </div>
      </div>

      {/* ── Filter controls ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4">
        {/* Severity filter */}
        <div className="flex gap-1">
          {SEVERITY_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSeverityFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                severityFilter === f.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'glass text-slate-400 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <div className="flex gap-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                typeFilter === f.id
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
                  : 'glass text-slate-400 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Log entries list ─────────────────────────────────────────────── */}
      <div className="glass-dark rounded-xl border border-white/5 overflow-hidden">
        {filteredEntries.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500 text-sm">
            {connectionState === 'live'
              ? entries.length === 0
                ? 'Waiting for events…'
                : 'No entries match the current filters.'
              : connectionState === 'reconnecting'
              ? 'Connecting to log stream…'
              : 'Not connected. Click Reconnect to start.'}
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {filteredEntries.map((entry, idx) => {
              const severity = entry.severity || 'info'
              const payloadSummary = summarizePayload(entry.payload)

              return (
                <div key={entry.ts + '-' + idx} className="px-4 py-2.5 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                  {/* Timestamp */}
                  <span className="text-xs text-slate-500 font-mono whitespace-nowrap pt-0.5">
                    {formatTimestamp(entry.ts)}
                  </span>

                  {/* Severity badge */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${SEVERITY_STYLES[severity]}`}>
                    {severity}
                  </span>

                  {/* Type */}
                  <span className="text-xs text-slate-300 font-medium whitespace-nowrap pt-0.5">
                    {entry.type || 'unknown'}
                  </span>

                  {/* Payload summary */}
                  {payloadSummary && (
                    <span className="text-xs text-slate-500 truncate pt-0.5">
                      {payloadSummary}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Entry count footer */}
      <div className="text-xs text-slate-600 text-right">
        {filteredEntries.length} of {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
      </div>
    </div>
  )
}
