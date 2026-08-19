import { useState } from 'react'
import { supabase } from '../../lib/supabase'

/**
 * AuthPromptModal — shown when a guest user attempts a write action (post, react, reply).
 * Offers sign-in and registration via email/password using the existing Supabase client.
 * Preserves planet context so the user returns to the same planet after auth.
 *
 * @param {{ open: boolean, onClose: () => void, planetContext: string|null }} props
 */
export default function AuthPromptModal({ open, onClose, planetContext }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'signin' ? 'Sign in to continue' : 'Create an account'}
    >
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative bg-[#050510] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors
                     flex items-center justify-center min-w-[44px] min-h-[44px]"
          aria-label="Close"
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

        {/* Planet context indicator */}
        {planetContext && (
          <div className="mb-4 px-3 py-2 rounded-lg border border-violet-500/20 bg-violet-500/5">
            <p className="text-xs text-violet-300">
              You'll return to <span className="font-medium">{planetContext}</span> after signing in.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="auth-email" className="block text-xs text-white/60 mb-1.5">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={loading}
              className="w-full bg-transparent border border-white/[0.12] rounded-lg px-4 py-3
                         text-white placeholder-white/30 text-sm
                         focus:border-violet-500 focus:ring-1 focus:ring-violet-500/60
                         focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block text-xs text-white/60 mb-1.5">
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              disabled={loading}
              className="w-full bg-transparent border border-white/[0.12] rounded-lg px-4 py-3
                         text-white placeholder-white/30 text-sm
                         focus:border-violet-500 focus:ring-1 focus:ring-violet-500/60
                         focus:outline-none transition-colors disabled:opacity-50"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-lg
                       px-6 py-3 min-h-[44px] font-medium text-sm
                       disabled:opacity-40 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-2 focus:ring-violet-500/60
                       transition-colors"
          >
            {loading
              ? (mode === 'signin' ? 'Signing in...' : 'Creating account...')
              : (mode === 'signin' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Mode toggle */}
        <div className="mt-5 text-center">
          <button
            onClick={toggleMode}
            disabled={loading}
            className="text-sm text-violet-300 hover:text-violet-200 underline
                       min-h-[44px] px-2 disabled:opacity-50
                       focus:outline-none focus:ring-2 focus:ring-violet-500/60 rounded"
            type="button"
          >
            {mode === 'signin'
              ? "Don't have an account? Register"
              : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
