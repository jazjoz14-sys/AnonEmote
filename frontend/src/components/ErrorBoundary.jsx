import React from 'react'

/**
 * Global error boundary — catches unhandled renders and shows a recovery UI
 * instead of a blank white screen. Particularly important because the 3D
 * canvas can throw on context loss, shader compilation failure, or memory
 * exhaustion with no graceful path.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[AnonEmote crash]', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#0a0a1a' }}
      >
        <div className="glass-dark rounded-3xl p-8 max-w-md text-center flex flex-col gap-5">
          <div className="text-5xl">🌌</div>
          <h1 className="text-xl font-bold text-white">Something broke</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            The star system encountered an error it could not recover from.
            Reloading usually fixes it — your posts and session are unaffected.
          </p>
          {this.state.error && (
            <pre className="text-xs text-slate-600 text-left bg-black/30 rounded-xl p-3
                            max-h-24 overflow-auto whitespace-pre-wrap break-words">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl font-semibold text-white
                       bg-gradient-to-r from-violet-600 to-indigo-600
                       hover:from-violet-500 hover:to-indigo-500 transition-all"
          >
            Reload
          </button>
          <a
            href="/"
            className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
          >
            Or go back to the start
          </a>
        </div>
      </div>
    )
  }
}
