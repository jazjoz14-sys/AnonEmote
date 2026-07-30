import React, { useState } from 'react'
import { adminLogin, setToken } from './adminApi'

/**
 * AdminLogin — password gate for the admin console.
 */
export default function AdminLogin({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState('idle') // idle | signing | error
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password || status === 'signing') return

    setStatus('signing')
    setError('')

    try {
      const { token } = await adminLogin(password)
      setToken(token)
      onSuccess()
    } catch (err) {
      setStatus('error')
      setError(err.message)
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6"
         style={{ background: 'radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1a 100%)' }}>
      <form
        onSubmit={handleSubmit}
        className="glass-dark rounded-3xl p-8 w-full max-w-sm flex flex-col gap-5"
      >
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-4xl">🛡️</div>
          <h1 className="text-xl font-bold text-white">Admin Console</h1>
          <p className="text-xs text-slate-500">
            AnonEmote system administration
          </p>
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="block text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2"
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); if (status === 'error') setStatus('idle') }}
            autoFocus
            autoComplete="current-password"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3
                       text-slate-200 text-sm
                       focus:outline-none focus:border-violet-500/60
                       focus:ring-1 focus:ring-violet-500/30 transition-colors"
          />
        </div>

        {status === 'error' && (
          <div className="flex items-start gap-2 bg-red-900/30 border border-red-700/40
                          rounded-xl px-4 py-3 text-sm text-red-300">
            <span>🚫</span>
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!password || status === 'signing'}
          className="w-full py-3 rounded-xl font-semibold text-white text-sm
                     bg-gradient-to-r from-violet-600 to-indigo-600
                     hover:from-violet-500 hover:to-indigo-500
                     disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {status === 'signing' ? 'Signing in…' : 'Sign in'}
        </button>

        <a
          href="/"
          className="text-center text-xs text-slate-600 hover:text-slate-400 transition-colors"
        >
          ← Back to AnonEmote
        </a>
      </form>
    </div>
  )
}
