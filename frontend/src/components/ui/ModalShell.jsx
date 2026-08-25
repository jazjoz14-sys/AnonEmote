import { useEffect, useCallback, useId } from 'react'
import { useIsSmallScreen, useViewportSize } from '../../lib/device'
import { useOrientation, useBodyLock } from '../../lib/viewport'
import { Z, BREAKPOINTS } from '../../design/tokens'
import FocusTrap from './FocusTrap'
import useDraggable from '../../hooks/useDraggable'
import useAppStore from '../../store/useAppStore'

/**
 * ModalShell — unified modal container that renders the appropriate
 * layout based on viewport and orientation.
 *
 * Rendering decision tree:
 * 1. viewport < 768px AND NOT landscape → BottomSheet (mobile portrait), animate-slide-up-full
 * 2. viewport < 768px AND landscape AND height < 500px → centered card (max-w: desktopWidth or 480px, max-h: 90dvh), animate-pop-in
 * 3. viewport >= 768px → draggable floating panel (or static centered), animate-pop-in
 *
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is visible
 * @param {function} props.onClose - Called when the modal should close
 * @param {'modal'|'panel'} [props.type] - Semantic type hint
 * @param {number} [props.zIndex] - From Z constants (default: Z.POST_MODAL)
 * @param {string} [props.maxHeight] - Max-height CSS override for mobile portrait
 * @param {boolean} [props.draggable] - Enable desktop drag (default: true)
 * @param {number} [props.desktopWidth] - Desktop panel width in px (default: 480)
 * @param {boolean} [props.preventBackdropClose] - Prevent backdrop/Escape dismissal
 * @param {string} [props.ariaLabel] - Accessible label for the dialog
 * @param {string} [props.ariaLabelledBy] - ID of the element that labels the dialog (takes precedence over ariaLabel)
 * @param {string} [props.role] - ARIA role override (default: "dialog")
 * @param {React.ReactNode} props.children
 */
export default function ModalShell({
  open,
  onClose,
  type = 'modal',
  zIndex = Z.POST_MODAL,
  maxHeight,
  draggable = true,
  desktopWidth = 480,
  preventBackdropClose = false,
  ariaLabel,
  ariaLabelledBy,
  role = 'dialog',
  children,
}) {
  const modalId = useId()
  const isSmall = useIsSmallScreen()
  const { isLandscape } = useOrientation()
  const { height: viewportHeight } = useViewportSize()
  const pushModal = useAppStore((s) => s.pushModal)
  const popModal = useAppStore((s) => s.popModal)

  // Determine the layout mode
  const isLandscapeMobile = isSmall && isLandscape && viewportHeight < BREAKPOINTS.LANDSCAPE_HEIGHT
  const isMobilePortrait = isSmall && !isLandscapeMobile
  const isDesktop = !isSmall

  // Body scroll lock — skip for desktop panels (scene stays interactive)
  const shouldLockBody = open && !(isDesktop && type === 'panel')
  useBodyLock(shouldLockBody)

  // Desktop draggable support
  const {
    position,
    isDragging,
    handleProps,
  } = useDraggable({ width: desktopWidth, height: 440 })

  // Push/pop modal stack for focus restoration
  useEffect(() => {
    if (open) {
      pushModal(modalId)
    }
    return () => {
      if (open) popModal()
    }
  }, [open, modalId, pushModal, popModal])

  // Escape key handler
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' && !preventBackdropClose) {
        e.stopPropagation()
        onClose?.()
      }
    },
    [preventBackdropClose, onClose]
  )

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  // Don't render when closed
  if (!open) return null

  // Backdrop click handler
  const handleBackdropClick = () => {
    if (!preventBackdropClose) {
      onClose?.()
    }
  }

  // Shared aria props
  const dialogProps = {
    role,
    'aria-modal': 'true',
    ...(ariaLabelledBy
      ? { 'aria-labelledby': ariaLabelledBy }
      : ariaLabel
        ? { 'aria-label': ariaLabel }
        : {}),
  }

  // ─── Mobile Portrait: bottom-anchored sheet ────────────────────────────────
  if (isMobilePortrait) {
    const resolvedMaxHeight = maxHeight || 'var(--content-height)'

    return (
      <FocusTrap active={open}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 animate-fade-in"
          style={{ zIndex: zIndex - 1 }}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Bottom sheet container */}
        <div
          {...dialogProps}
          className="fixed bottom-0 left-0 right-0 flex flex-col bg-[#0d0d2b] rounded-t-2xl shadow-xl animate-slide-up-full"
          style={{
            zIndex,
            maxHeight: resolvedMaxHeight,
            paddingBottom: 'env(safe-area-inset-bottom, 8px)',
          }}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Drag indicator */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>

          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ overscrollBehaviorY: 'contain' }}
          >
            {children}
          </div>
        </div>
      </FocusTrap>
    )
  }

  // ─── Landscape Mobile: panel type → right-aligned side panel; modal type → centered card ──
  if (isLandscapeMobile) {
    // Panel type renders as a right-aligned side panel (max-w-45vw)
    if (type === 'panel') {
      return (
        <FocusTrap active={open}>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 animate-fade-in"
            style={{ zIndex: zIndex - 1 }}
            onClick={handleBackdropClick}
            aria-hidden="true"
          />

          {/* Right-aligned side panel */}
          <div
            {...dialogProps}
            className="fixed top-0 right-0 h-full flex flex-col bg-[#0d0d2b] border-l border-white/[0.08] shadow-xl animate-slide-in-right overflow-hidden"
            style={{
              zIndex,
              maxWidth: '45vw',
              width: '45vw',
            }}
          >
            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ overscrollBehaviorY: 'contain' }}
            >
              {children}
            </div>
          </div>
        </FocusTrap>
      )
    }

    // Modal type renders as centered card
    return (
      <FocusTrap active={open}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 animate-fade-in"
          style={{ zIndex: zIndex - 1 }}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Centered card */}
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ zIndex, pointerEvents: 'none' }}
        >
          <div
            {...dialogProps}
            className="relative flex flex-col bg-[#0d0d2b] border border-white/[0.08] rounded-2xl shadow-xl animate-pop-in overflow-hidden"
            style={{
              maxWidth: `${desktopWidth}px`,
              maxHeight: '90dvh',
              width: '90%',
              pointerEvents: 'auto',
            }}
          >
            {/* Scrollable content */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ overscrollBehaviorY: 'contain' }}
            >
              {children}
            </div>
          </div>
        </div>
      </FocusTrap>
    )
  }

  // ─── Desktop: type="panel" → right-side, no backdrop ──────────────────────
  if (isDesktop && type === 'panel') {
    // If maxHeight is provided, render as content-sized card (PostModal, DoodleModal)
    // Otherwise render as full-height side panel (PlanetInfoPanel)
    const isFullHeight = !maxHeight

    return (
      <FocusTrap active={open}>
        {/* No backdrop — scene stays fully interactive */}
        <div
          {...dialogProps}
          className={
            isFullHeight
              ? 'fixed top-0 right-0 h-full flex flex-col bg-[#0d0d2b] border-l border-white/[0.08] shadow-xl animate-slide-in-right overflow-hidden'
              : 'fixed top-4 right-4 flex flex-col bg-[#0d0d2b] border border-white/[0.08] rounded-2xl shadow-xl animate-slide-in-right overflow-hidden'
          }
          style={{
            zIndex,
            width: `${desktopWidth}px`,
            maxWidth: '35vw',
            ...(!isFullHeight && { maxHeight }),
          }}
        >
          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ overscrollBehaviorY: 'contain' }}
          >
            {children}
          </div>
        </div>
      </FocusTrap>
    )
  }

  // ─── Desktop: draggable floating panel (or static centered) ────────────────
  if (draggable) {
    return (
      <FocusTrap active={open}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 animate-fade-in"
          style={{ zIndex: zIndex - 1 }}
          onClick={handleBackdropClick}
          aria-hidden="true"
        />

        {/* Draggable panel */}
        <div
          {...dialogProps}
          className="fixed flex flex-col bg-[#0d0d2b] border border-white/[0.08] rounded-2xl shadow-xl animate-pop-in overflow-hidden"
          style={{
            zIndex,
            width: `${desktopWidth}px`,
            left: `${position.x}px`,
            top: `${position.y}px`,
            maxHeight: '85vh',
          }}
        >
          {/* Drag handle area */}
          <div
            {...handleProps}
            className="flex items-center justify-center h-8 shrink-0 select-none"
          >
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ overscrollBehaviorY: 'contain' }}
          >
            {children}
          </div>
        </div>
      </FocusTrap>
    )
  }

  // ─── Desktop: static centered (non-draggable) ─────────────────────────────
  return (
    <FocusTrap active={open}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 animate-fade-in"
        style={{ zIndex: zIndex - 1 }}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Centered panel */}
      <div
        className="fixed inset-0 flex items-center justify-center"
        style={{ zIndex, pointerEvents: 'none' }}
      >
        <div
          {...dialogProps}
          className="relative flex flex-col bg-[#0d0d2b] border border-white/[0.08] rounded-2xl shadow-xl animate-pop-in overflow-hidden"
          style={{
            maxWidth: `${desktopWidth}px`,
            maxHeight: '85vh',
            width: '100%',
            pointerEvents: 'auto',
          }}
        >
          {/* Scrollable content */}
          <div
            className="flex-1 overflow-y-auto"
            style={{ overscrollBehaviorY: 'contain' }}
          >
            {children}
          </div>
        </div>
      </div>
    </FocusTrap>
  )
}
