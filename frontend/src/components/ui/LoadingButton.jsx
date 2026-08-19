/**
 * LoadingButton — A reusable button with built-in spinner and disabled state.
 * Used in AuthScreen, PostModal, and anywhere an async action needs
 * visual feedback to prevent double-taps.
 *
 * Props:
 * - loading (boolean) — shows spinner and disables button when true
 * - children (ReactNode) — button content when not loading
 * - disabled (boolean) — additional external disabled control
 * - ...rest — all standard button props (className, onClick, type, etc.)
 */
export default function LoadingButton({ loading = false, children, disabled = false, className = '', ...rest }) {
  const isDisabled = loading || disabled

  return (
    <button
      className={[
        'relative flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-medium',
        'transition-all duration-200 ease-in-out',
        isDisabled
          ? 'opacity-50 cursor-not-allowed'
          : 'hover:brightness-110 active:scale-[0.97]',
        className,
      ].join(' ')}
      disabled={isDisabled}
      {...rest}
    >
      {loading ? (
        <>
          {/* CSS spinner — a spinning border circle */}
          <span
            className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
            aria-hidden="true"
          />
          <span>Processing…</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
