/**
 * Banner — Status banner for inline feedback.
 *
 * Renders a styled container for contextual messages such as errors,
 * warnings, success confirmations, or informational notices.
 *
 * Each type maps to a distinct color combination following the cosmic
 * dark theme. Error and warning types include role="alert" for
 * accessibility (screen readers announce them immediately).
 *
 * @param {Object} props
 * @param {'error'|'warning'|'success'|'info'} [props.type='info'] - Banner visual type
 * @param {string} [props.className] - Additional Tailwind classes
 * @param {React.ReactNode} props.children - Banner content
 */
export default function Banner({ type = 'info', className = '', children, ...rest }) {
  /** Class mappings per banner type. */
  const typeClasses = {
    error: 'bg-red-900/30 border border-red-700/40 text-red-300',
    warning: 'bg-orange-900/30 border border-orange-700/40 text-orange-300',
    success: 'bg-emerald-900/30 border border-emerald-700/40 text-emerald-300',
    info: 'bg-violet-500/10 border border-violet-500/20 text-violet-300',
  }

  const baseClasses = 'rounded-xl px-4 py-3 text-sm'
  const variantClasses = typeClasses[type] || typeClasses.info

  // Error and warning banners use role="alert" so assistive tech
  // announces them without requiring focus.
  const role = type === 'error' || type === 'warning' ? 'alert' : undefined

  return (
    <div
      role={role}
      className={`${baseClasses} ${variantClasses} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  )
}
