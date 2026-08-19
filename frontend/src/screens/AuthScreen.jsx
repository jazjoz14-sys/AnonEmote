import React, { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import TermsModal from '../components/modals/TermsModal'

/**
 * AuthScreen — login/register gate with password reset.
 *
 * Users can either sign up / sign in to get full posting access,
 * or continue as a guest (view-only mode in the star system).
 */
export default function AuthScreen() {
  const { setPhase } = useAppStore()

  const [mode, setMode] = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsModalType, setTermsModalType] = useState(null) // null | 'terms' | 'privacy'
  const [termsError, setTermsError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email.trim()) {
      setError('Email is required.')
      return
    }

    if (mode !== 'reset' && !password.trim()) {
      setError('Password is required.')
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

    if (mode === 'register' && !termsAccepted) {
      setTermsError('You must agree to the Terms & Conditions and Privacy Policy to create an account.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email)
        if (error) throw error
        setSuccess('Password reset link sent! Check your email.')
        setMode('login')
      } else if (mode === 'register') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error
        // Store terms acceptance timestamp in user metadata
        await supabase.auth.updateUser({
          data: { terms_accepted_at: new Date().toISOString() }
        })
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // Check if user was navigating from a planet selection
        const { pendingPlanetId, clearPendingPlanetId } = useAppStore.getState()
        if (pendingPlanetId) {
          clearPendingPlanetId()
          setPhase('space')
        } else {
          setPhase('avatar')
        }
      }
    } catch (err) {
      const msg = err.message || 'Something went wrong.'
      if (/email.*not.*confirmed/i.test(msg)) {
        setError('Please check your email to confirm your account before signing in.')
      } else {
        setError(msg)
      }
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
            {mode === 'login' ? 'Welcome back' : mode === 'register' ? 'Create account' : 'Reset password'}
          </h1>
          <p className="text-slate-500 text-xs text-center leading-relaxed">
            {mode === 'login'
              ? 'Sign in to broadcast, react, and reply.'
              : mode === 'register'
                ? 'Your email is private — other users only see your avatar.'
                : 'Enter your email and we\'ll send a reset link.'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            disabled={loading}
            className="w-full px-4 py-3 rounded-sm text-sm text-white
                       bg-white/[0.03] border border-white/[0.1]
                       placeholder-slate-600 focus:outline-none focus:border-white/25
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-colors"
            autoComplete="email"
          />
          {mode !== 'reset' && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={loading}
              className="w-full px-4 py-3 rounded-sm text-sm text-white
                         bg-white/[0.03] border border-white/[0.1]
                         placeholder-slate-600 focus:outline-none focus:border-white/25
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          )}
          {mode === 'register' && (
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              disabled={loading}
              className="w-full px-4 py-3 rounded-sm text-sm text-white
                         bg-white/[0.03] border border-white/[0.1]
                         placeholder-slate-600 focus:outline-none focus:border-white/25
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
              autoComplete="new-password"
            />
          )}

          {/* Terms & Conditions checkbox — register mode only */}
          {mode === 'register' && (
            <label className="flex items-start gap-3 py-1 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked)
                  if (e.target.checked) setTermsError('')
                }}
                className="mt-0.5 w-4 h-4 shrink-0 accent-violet-500 rounded
                           bg-white/[0.03] border border-white/[0.2]"
              />
              <span className="text-xs text-slate-400 leading-relaxed">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setTermsModalType('terms') }}
                  className="text-violet-400 hover:text-violet-300 underline transition-colors"
                >
                  Terms &amp; Conditions
                </button>
                {' '}and{' '}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setTermsModalType('privacy') }}
                  className="text-violet-400 hover:text-violet-300 underline transition-colors"
                >
                  Privacy Policy
                </button>
              </span>
            </label>
          )}

          {termsError && (
            <p className="text-xs text-red-400 leading-relaxed">{termsError}</p>
          )}

          {error && (
            <p className="text-xs text-red-400 leading-relaxed">{error}</p>
          )}
          {success && (
            <p className="text-xs text-emerald-400 leading-relaxed">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading || (mode === 'register' && !termsAccepted)}
            className="w-full py-3 rounded-sm text-xs tracking-[0.15em] uppercase font-medium
                       text-white border border-white/30
                       hover:bg-white hover:text-[#050510]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       transition-all duration-200 mt-2"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
          </button>
        </form>

        {/* Toggle mode */}
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); setSuccess(''); setTermsAccepted(false); setTermsError('') }}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Register" : mode === 'register' ? 'Already have an account? Sign in' : 'Back to sign in'}
          </button>

          {mode === 'login' && (
            <button
              onClick={() => { setMode('reset'); setError(''); setSuccess(''); setTermsAccepted(false); setTermsError('') }}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Forgot password?
            </button>
          )}

          {/* Guest access — make it clear and visible */}
          <button
            onClick={() => setPhase('avatar')}
            className="w-full py-3 rounded-sm text-xs tracking-[0.15em] uppercase font-medium
                       text-slate-300 border border-white/[0.12]
                       hover:text-white hover:border-white/25
                       transition-all duration-200"
          >
            Continue as Guest (View Only)
          </button>
        </div>

        {/* Privacy note */}
        <p className="text-[10px] text-slate-600 text-center leading-relaxed">
          Guests can explore the 3D star system and read posts but cannot broadcast, react, or reply.
        </p>
      </div>

      {/* Terms & Conditions / Privacy Policy modal */}
      {termsModalType && (
        <TermsModal type={termsModalType} onClose={() => setTermsModalType(null)} />
      )}
    </div>
  )
}
