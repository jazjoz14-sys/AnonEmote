import React, { useState } from 'react'
import useAppStore from '../store/useAppStore'
import { supabase } from '../lib/supabase'
import { useIsSmallScreen } from '../lib/device'
import TermsModal from '../components/modals/TermsModal'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

/**
 * AuthScreen â€” login/register gate with password reset.
 *
 * Users can either sign up / sign in to get full posting access,
 * or continue as a guest (view-only mode in the star system).
 *
 * Uses the design system primitives (Input, Button) for consistency
 * with the cosmic monochrome + violet accent language.
 */
export default function AuthScreen() {
  const { setPhase } = useAppStore()
  const isSmall = useIsSmallScreen()

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
      } else if (/rate.*limit.*exceeded/i.test(msg) || /too many requests/i.test(msg) || /email.*limit/i.test(msg)) {
        setError('Too many sign-up attempts. Please wait a few minutes and try again.')
      } else if (/user.*already.*registered/i.test(msg) || /already.*been.*registered/i.test(msg)) {
        setError('This email is already registered. Try signing in instead.')
      } else if (/invalid.*login/i.test(msg)) {
        setError('Invalid email or password. Please try again.')
      } else if (/password.*too.*short/i.test(msg) || /at least/i.test(msg)) {
        setError('Password must be at least 6 characters.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-full flex items-center justify-center px-6 overflow-x-hidden"
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
                ? 'Your email is private other users only see your avatar.'
                : 'Enter your email and we\'ll send a reset link.'}
          </p>
        </div>

        {/*
         * Form container with min-height transition to prevent height jumps
         * when toggling between login/register/reset modes.
         * Register mode is tallest (3 inputs + checkbox), so min-height accommodates that.
         */}
        <div
          className="transition-[min-height] duration-200 ease-out"
          style={{ minHeight: mode === 'register' ? '340px' : mode === 'reset' ? '140px' : '220px' }}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <Input
              id="auth-screen-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              disabled={loading}
              autoComplete="email"
              aria-label="Email address"
            />

            {mode !== 'reset' && (
              <Input
                id="auth-screen-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                disabled={loading}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                aria-label="Password"
              />
            )}

            {mode === 'register' && (
              <Input
                id="auth-screen-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                disabled={loading}
                autoComplete="new-password"
                aria-label="Confirm password"
              />
            )}

            {/* Terms & Conditions checkbox â€” register mode only */}
            {mode === 'register' && (
              <label
                className={[
                  'flex items-start gap-3 py-1 cursor-pointer select-none',
                  isSmall ? 'min-h-[44px]' : '',
                ].filter(Boolean).join(' ')}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => {
                    setTermsAccepted(e.target.checked)
                    if (e.target.checked) setTermsError('')
                  }}
                  className={[
                    'mt-0.5 w-4 h-4 shrink-0 accent-violet-500 rounded',
                    'bg-white/[0.03] border border-white/[0.2]',
                    isSmall ? 'min-w-[44px] min-h-[44px] p-3 -m-3' : '',
                  ].filter(Boolean).join(' ')}
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

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={loading}
              disabled={mode === 'register' && !termsAccepted}
              className="mt-2"
            >
              {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>
        </div>

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

          {/* Guest access â€” secondary button variant */}
          <Button
            variant="secondary"
            fullWidth
            onClick={() => setPhase('avatar')}
          >
            Continue as Guest (View Only)
          </Button>
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