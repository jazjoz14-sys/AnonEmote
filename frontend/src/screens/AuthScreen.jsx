import React, { useState } from 'react'
import useAppStore from '../store/useAppStore'
import useAuth from '../hooks/useAuth'

/**
 * AuthScreen — login/register gate.
 *
 * Users can either sign up / sign in to get full posting access,
 * or continue as a guest (view-only mode in the star system).
 */
export default function AuthScreen() {
  const { setPhase } = useAppStore()
  const { signUp, signIn } = useAuth()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.')
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (mode === 'register' && password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        await signUp(email, password)
        setSuccess('Account created! Check your email to confirm, or sign in directly.')
        setMode('login')
      } else {
        await signIn(email, password)
        // Auth state change will be picked up by the App
        setPhase('avatar')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center px-6"
         style={{ background: '#050510' }}>
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <img src="/icons/logo.png" alt="AnonEmote" className="w-16 h-16 opacity-90" draggable={false} />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-slate-500 text-xs text-center leading-relaxed">
            {mode === 'login'
              ? 'Sign in to broadcast, react, and reply.'
              : 'Your email is private — other users only see your avatar.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 rounded-sm text-sm text-white
                       bg-white/[0.03] border border-white/[0.1]
                       placeholder-slate-600 focus:outline-none focus:border-white/25
                       transition-colors"
            autoComplete="email"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full px-4 py-3 rounded-sm text-sm text-white
                       bg-white/[0.03] border border-white/[0.1]
                       placeholder-slate-600 focus:outline-none focus:border-white/25
                       transition-colors"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          {mode === 'register' && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full px-4 py-3 rounded-sm text-sm text-white
                         bg-white/[0.03] border border-white/[0.1]
                         placeholder-slate-600 focus:outline-none focus:border-white/25
                         transition-colors"
              autoComplete="new-password"
            />
          )}

          {error && (
            <p className="text-xs text-red-400 leading-relaxed">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 leading-relaxed">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-sm text-xs tracking-[0.15em] uppercase font-medium
                       text-white border border-white/30
                       hover:bg-white hover:text-[#050510]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 mt-2"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess('') }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
          </button>

          {/* Guest access */}
          <button
            onClick={() => setPhase('avatar')}
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Continue as guest (view-only)
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-[10px] text-slate-700 text-center leading-relaxed">
          Your email is only used for login. Other users never see it.
          Posts remain anonymous — only admins can link content to accounts when investigating reports.
        </p>
      </div>
    </div>
  )
}
