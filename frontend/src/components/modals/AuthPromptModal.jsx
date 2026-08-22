import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import ModalShell from '../ui/ModalShell'
import Input from '../ui/Input'
import Button from '../ui/Button'
import Banner from '../ui/Banner'
import { Z, MAX_WIDTH } from '../../design/tokens'

/**
 * AuthPromptModal — shown when a guest user attempts a write action (post, react, reply).
 * Offers sign-in and registration via email/password using the existing Supabase client.
 * Preserves planet context so the user returns to the same planet after auth.
 *
 * Adopts ModalShell for unified modal rendering (BottomSheet on mobile portrait,
 * centered card on landscape mobile, floating panel on desktop).
 *
 * @param {{ open: boolean, onClose: () => void, planetContext: string|null, actionLabel: string|null }} props
 * @param props.actionLabel — Optional label identifying the blocked action (e.g. "Sign in to react").
 *        When provided, rendered above the form as additional context per Requirement 17.3.
 */
export default function AuthPromptModal({ open, onClose, planetContext, actionLabel }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  /**
   * Dismiss handler — resets all form state and calls the parent onClose.
   * The parent is responsible for clearing selectedPlanet state.
   */
  const handleDismiss = () => {
    setEmail('')
    setPassword('')
    setError(null)
    setLoading(false)
    setMode('signin')
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let result

      if (mode === 'signin') {
        result = await supabase.auth.signInWithPassword({ email, password })
      } else {
        result = await supabase.auth.signUp({ email, password })
      }

      if (result.error) {
        setError(result.error.message)
        setLoading(false)
        return
      }

      // Success — the store's onAuthStateChange listener will pick up the session.
      // Reset form and close.
      setEmail('')
      setPassword('')
      setError(null)
      setLoading(false)
      onClose()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'register' : 'signin')
    setError(null)
  }

  return (
    <ModalShell
      open={open}
      onClose={handleDismiss}
      type="modal"
      zIndex={Z.AUTH_PROMPT}
      desktopWidth={MAX_WIDTH.AUTH_CARD}
      draggable={false}
      ariaLabel={mode === 'signin' ? 'Sign in to continue' : 'Create an account'}
    >
      {/* Modal content */}
      <div className="p-6">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors
                     flex items-center justify-center min-w-[44px] min-h-[44px]
                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
          aria-label="Close"
          type="button"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-6">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">
            Account Required
          </p>
          <h2 className="text-lg font-medium text-white">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </h2>
          <p className="text-sm text-white/60 mt-1">
            {mode === 'signin'
              ? 'Sign in to post, react, and reply.'
              : 'Create an account to join the conversation.'}
          </p>
        </div>

        {/* Action label — identifies which write action was blocked (Req 17.3) */}
        {actionLabel && (
          <p className="text-xs text-violet-300 mb-3">{actionLabel}</p>
        )}

        {/* Planet context banner */}
        {planetContext && (
          <Banner type="info" className="mb-4 !rounded-lg !border-violet-500/20 !bg-violet-500/5 !text-xs">
            You'll return to <span className="font-medium">{planetContext}</span> after signing in.
          </Banner>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs text-white/60 mb-1.5">
              Email
            </label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
              className="!border-white/[0.12] !rounded-lg focus:!border-violet-500 focus:!ring-1 focus:!ring-violet-500/60"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs text-white/60 mb-1.5">
              Password
            </label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              disabled={loading}
              className="!border-white/[0.12] !rounded-lg focus:!border-violet-500 focus:!ring-1 focus:!ring-violet-500/60"
            />
          </div>

          {/* Error message */}
          {error && (
            <Banner type="error" className="!text-xs !py-2 !px-3">
              {error}
            </Banner>
          )}

          {/* Submit button */}
          <Button
            type="submit"
            variant="cta"
            fullWidth
            loading={loading}
            disabled={!email || !password}
            className="min-h-[44px]"
          >
            {loading
              ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </Button>
        </form>

        {/* Mode toggle */}
        <div className="mt-5 text-center">
          <button
            onClick={toggleMode}
            disabled={loading}
            className="text-sm text-violet-300 hover:text-violet-200 underline
                       min-h-[44px] px-2 disabled:opacity-50
                       focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 rounded"
            type="button"
          >
            {mode === 'signin'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
