import { useEffect, useRef, useId } from 'react'
import { useBodyLock, useOrientation } from '../../lib/viewport'
import useAppStore from '../../store/useAppStore'

/**
 * Shared mobile bottom sheet with bounded height and scroll isolation.
 *
 * On mobile portrait: bottom-anchored sheet with configurable maxHeight
 * (defaults to var(--content-height) from viewport provider).
 *
 * On landscape: right-aligned side panel (45% width max).
 *
 * Uses useBodyLock when open and registers/unregisters with the Zustand
 * store so the app knows how many sheets are active (for global scroll lock).
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the sheet is visible
 * @param {function} props.onClose - Called when sheet should close (backdrop tap)
 * @param {number} props.zIndex - Stacking layer (30 for panels, 50 for modals)
 * @param {string} [props.maxHeight] - CSS maxHeight override (default: var(--content-height))
 * @param {boolean} [props.landscape] - Force landscape side-panel mode
 * @param {React.ReactNode} props.children - Sheet content
 */
export default function BottomSheet({ open, onClose, zIndex = 30, maxHeight, landscape, children }) {
  // Generate a stable unique ID for sheet tracking in the store
  const sheetId = useId()
  const scrollRef = useRef(null)
  const { isLandscape: orientationLandscape } = useOrientation()

  // Use forced landscape prop or detected orientation
  const isLandscapeMode = landscape ?? orientationLandscape

  // Lock body scroll when sheet is open
  useBodyLock(open)

  // Register/unregister with the store for global sheet tracking
  const registerSheet = useAppStore((s) => s.registerSheet)
  const unregisterSheet = useAppStore((s) => s.unregisterSheet)

  useEffect(() => {
    if (open) {
      registerSheet(sheetId)
    } else {
      unregisterSheet(sheetId)
    }
    return () => unregisterSheet(sheetId)
  }, [open, sheetId, registerSheet, unregisterSheet])

  // Don't render anything when closed (after animation completes)
  if (!open) return null

  // Default maxHeight uses the viewport budget CSS variable
  const resolvedMaxHeight = maxHeight || 'var(--content-height)'

  return (
    <>
      {/* Backdrop overlay — click to close */}
      <div
        className="fixed inset-0 bg-black/40"
        style={{ zIndex: zIndex - 1 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet container */}
      <div
        role="dialog"
        aria-modal="true"
        className={
          isLandscapeMode
            ? // Landscape: right-aligned side panel
              'fixed top-0 right-0 h-full flex flex-col bg-[#0d0d2b] border-l border-white/10 shadow-xl animate-slide-in-right'
            : // Portrait: bottom-anchored sheet with slide-up animation
              'fixed bottom-0 left-0 right-0 flex flex-col bg-[#0d0d2b] rounded-t-2xl shadow-xl animate-slide-up safe-bottom'
        }
        style={{
          zIndex,
          ...(isLandscapeMode
            ? { width: '45%', maxWidth: '45%' }
            : { maxHeight: resolvedMaxHeight, paddingBottom: 'env(safe-area-inset-bottom, 8px)' }),
        }}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {/* Drag indicator (portrait only) */}
        {!isLandscapeMode && (
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
        )}

        {/* Scrollable content area with scroll isolation */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehaviorY: 'contain' }}
        >
          {children}
        </div>
      </div>
    </>
  )
}
