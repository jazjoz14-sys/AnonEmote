import React, { useEffect, useState } from 'react'
import { fetchLexicon, saveLexicon, testLexicon } from './adminApi'

const LISTS = [
  {
    id: 'crisis',
    label: 'Crisis terms',
    icon: '💙',
    accent: 'violet',
    help: 'Triggers the emergency referral modal instead of a plain block. Use for expressions of suicidal ideation or self-harm.',
  },
  {
    id: 'toxic',
    label: 'Blocked terms',
    icon: '🚫',
    accent: 'red',
    help: 'Posts containing these are rejected. Useful for slurs or local slang the AI model does not cover.',
  },
  {
    id: 'allow',
    label: 'Allow-list',
    icon: '✅',
    accent: 'emerald',
    help: 'Overrides the blocked lists to clear false positives. Cannot override crisis detection — safety always wins.',
  },
]

const ACCENT = {
  violet: 'border-violet-700/40 bg-violet-900/20 text-violet-200',
  red: 'border-red-700/40 bg-red-900/20 text-red-200',
  emerald: 'border-emerald-700/40 bg-emerald-900/20 text-emerald-200',
}

/** Editable chip list for one rule category. */
function TermList({ config, terms, onChange }) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const value = draft.toLowerCase().trim()
    if (!value) return
    if (terms.includes(value)) { setDraft(''); return }
    onChange([...terms, value])
    setDraft('')
  }

  return (
    <section className="glass rounded-2xl p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>{config.icon}</span> {config.label}
          <span className="text-xs font-normal text-slate-500">({terms.length})</span>
        </h3>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{config.help}</p>
      </div>

      {/* Add control */}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
          placeholder="Add a word or phrase…"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2
                     text-slate-200 placeholder-slate-600 text-sm
                     focus:outline-none focus:border-violet-500/60
                     focus:ring-1 focus:ring-violet-500/30 transition-colors"
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="px-4 rounded-xl text-sm font-semibold text-white bg-violet-600
                     hover:bg-violet-500 disabled:opacity-40 transition-all"
        >
          Add
        </button>
      </div>

      {/* Chips */}
      {terms.length === 0 ? (
        <p className="text-xs text-slate-600 py-2">No custom terms yet.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {terms.map((t) => (
            <span
              key={t}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                          text-xs border ${ACCENT[config.accent]}`}
            >
              {t}
              <button
                onClick={() => onChange(terms.filter((x) => x !== t))}
                className="opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remove ${t}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

/**
 * RulesTab — Flow 3 of the admin sequence:
 * update filtering rules → apply to local lexicon → confirm applied.
 */
export default function RulesTab({ onAuthError }) {
  const [lexicon, setLexicon] = useState({ crisis: [], toxic: [], allow: [] })
  const [original, setOriginal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  // Dry-run tester
  const [testText, setTestText] = useState('')
  const [testResult, setTestResult] = useState(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLexicon()
        const next = {
          crisis: data.crisis || [],
          toxic: data.toxic || [],
          allow: data.allow || [],
        }
        setLexicon(next)
        setOriginal(JSON.stringify(next))
      } catch (err) {
        if (err.status === 401) return onAuthError()
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [onAuthError])

  const dirty = original !== null && JSON.stringify(lexicon) !== original

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const { lexicon: saved } = await saveLexicon(lexicon)
      const next = { crisis: saved.crisis, toxic: saved.toxic, allow: saved.allow }
      setLexicon(next)
      setOriginal(JSON.stringify(next))
      setToast('Filtering rules applied to the live lexicon.')
      setTimeout(() => setToast(''), 3000)
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (!testText.trim()) return
    setTesting(true)
    setTestResult(null)
    try {
      const result = await testLexicon(testText)
      setTestResult(result)
    } catch (err) {
      if (err.status === 401) return onAuthError()
      setError(err.message)
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading filtering rules…</p>

  return (
    <div className="flex flex-col gap-5">
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

      <div className="glass rounded-2xl px-4 py-3 text-xs text-slate-400 leading-relaxed">
        These rules layer <strong className="text-slate-200">on top of</strong> the built-in
        English, Tagalog and Bicolano lists and the Perspective AI model. They apply
        immediately to every new post — no restart needed.
      </div>

      {/* Rule lists */}
      {LISTS.map((config) => (
        <TermList
          key={config.id}
          config={config}
          terms={lexicon[config.id]}
          onChange={(next) => setLexicon((l) => ({ ...l, [config.id]: next }))}
        />
      ))}

      {/* Save bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="px-5 py-3 rounded-xl font-semibold text-white text-sm
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-500 hover:to-indigo-500
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Applying…' : 'Apply rules'}
        </button>
        {dirty && (
          <span className="text-xs text-orange-300">Unsaved changes</span>
        )}
      </div>

      {/* ── Dry-run tester ───────────────────────────────────────────────── */}
      <section className="glass rounded-2xl p-4 flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">🧪 Test the filter</h3>
          <p className="text-xs text-slate-500 mt-1">
            Run sample text through the full engine without posting it. Verify new
            rules behave as intended before students encounter them.
          </p>
        </div>

        <div className="flex gap-2">
          <input
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleTest() } }}
            placeholder="Type a message to evaluate…"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2
                       text-slate-200 placeholder-slate-600 text-sm
                       focus:outline-none focus:border-violet-500/60
                       focus:ring-1 focus:ring-violet-500/30 transition-colors"
          />
          <button
            onClick={handleTest}
            disabled={!testText.trim() || testing}
            className="px-4 rounded-xl text-sm font-semibold text-white glass
                       hover:bg-white/10 disabled:opacity-40 transition-all"
          >
            {testing ? '…' : 'Test'}
          </button>
        </div>

        {testResult && (
          <div className={`rounded-xl px-4 py-3 text-sm border flex flex-col gap-1
            ${testResult.verdict === 'crisis'
              ? 'bg-violet-900/30 border-violet-700/40 text-violet-200'
              : testResult.verdict === 'toxic'
                ? 'bg-red-900/30 border-red-700/40 text-red-200'
                : 'bg-emerald-900/25 border-emerald-700/40 text-emerald-200'}`}>
            <div className="flex items-center gap-2">
              <strong className="uppercase text-xs tracking-widest">
                {testResult.verdict}
              </strong>
              <span className="text-xs opacity-70 font-mono">{testResult.layer}</span>
            </div>
            {testResult.reason && (
              <p className="text-xs opacity-80">{testResult.reason}</p>
            )}
            {testResult.scores && (
              <div className="flex flex-wrap gap-2 mt-1">
                {Object.entries(testResult.scores).map(([k, v]) => (
                  <span key={k} className="text-xs font-mono opacity-70">
                    {k.toLowerCase()}: {v.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
