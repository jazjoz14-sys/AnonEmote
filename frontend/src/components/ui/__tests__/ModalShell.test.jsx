/**
 * ModalShell unit tests.
 * Verifies the viewport-aware rendering decision tree and accessibility attributes.
 *
 * Validates: Requirements 15.6, 15.7, 19.7
 */

import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Default mocks — these are overridden per-test using vi.mocked
const mockUseIsSmallScreen = vi.fn(() => false)
const mockUseViewportSize = vi.fn(() => ({ width: 1280, height: 800 }))

vi.mock('../../../lib/device', () => ({
  useIsSmallScreen: (...args) => mockUseIsSmallScreen(...args),
  useViewportSize: (...args) => mockUseViewportSize(...args),
}))

const mockUseOrientation = vi.fn(() => ({ isLandscape: false, isPortrait: true }))
const mockUseBodyLock = vi.fn()

vi.mock('../../../lib/viewport', () => ({
  useOrientation: (...args) => mockUseOrientation(...args),
  useBodyLock: (...args) => mockUseBodyLock(...args),
}))

vi.mock('../../../hooks/useDraggable', () => ({
  default: () => ({
    position: { x: 100, y: 100 },
    isDragging: false,
    handleProps: { onPointerDown: () => {}, onKeyDown: () => {}, tabIndex: 0, style: {} },
  }),
}))

vi.mock('../../../store/useAppStore', () => ({
  default: (selector) => {
    const state = { pushModal: () => {}, popModal: () => {} }
    return selector ? selector(state) : state
  },
}))

import ModalShell from '../ModalShell'

// ─── Test Suites ────────────────────────────────────────────────────────────

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ModalShell', () => {
  describe('rendering', () => {
    it('does not render when open=false', () => {
      const { container } = render(
        <ModalShell open={false} onClose={() => {}}>
          <p>Modal content</p>
        </ModalShell>
      )
      expect(container.innerHTML).toBe('')
    })

    it('renders children when open=true', () => {
      mockUseIsSmallScreen.mockReturnValue(false)
      render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Modal content</p>
        </ModalShell>
      )
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })
  })

  describe('layout modes', () => {
    it('renders bottom sheet on mobile portrait (small screen, not landscape)', () => {
      mockUseIsSmallScreen.mockReturnValue(true)
      mockUseOrientation.mockReturnValue({ isLandscape: false, isPortrait: true })
      mockUseViewportSize.mockReturnValue({ width: 375, height: 700 })

      const { container } = render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Sheet content</p>
        </ModalShell>
      )

      // Bottom sheet has rounded-t-2xl class (top corners only)
      const sheet = container.querySelector('.rounded-t-2xl')
      expect(sheet).not.toBeNull()
      // Should have the slide-up animation
      expect(sheet.className).toContain('animate-slide-up-full')
    })

    it('renders centered card on landscape mobile (small screen, landscape, height < 500)', () => {
      mockUseIsSmallScreen.mockReturnValue(true)
      mockUseOrientation.mockReturnValue({ isLandscape: true, isPortrait: false })
      mockUseViewportSize.mockReturnValue({ width: 667, height: 400 })

      const { container } = render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Card content</p>
        </ModalShell>
      )

      // Landscape mobile card has max-height 90dvh and pop-in animation
      const card = container.querySelector('.animate-pop-in')
      expect(card).not.toBeNull()
      expect(card.style.maxHeight).toBe('90dvh')
      // Should NOT have rounded-t-2xl (that's bottom sheet only)
      expect(container.querySelector('.rounded-t-2xl')).toBeNull()
    })

    it('renders desktop floating panel (not small screen)', () => {
      mockUseIsSmallScreen.mockReturnValue(false)
      mockUseOrientation.mockReturnValue({ isLandscape: false, isPortrait: true })
      mockUseViewportSize.mockReturnValue({ width: 1280, height: 800 })

      const { container } = render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Panel content</p>
        </ModalShell>
      )

      // Desktop panel uses pop-in animation and fixed positioning with specific px coords
      const panel = container.querySelector('.animate-pop-in')
      expect(panel).not.toBeNull()
      // Should NOT be a bottom sheet
      expect(container.querySelector('.rounded-t-2xl')).toBeNull()
      // Desktop panel has explicit left/top positioning from useDraggable
      expect(panel.style.left).toBe('100px')
      expect(panel.style.top).toBe('100px')
    })
  })

  describe('backdrop', () => {
    it('renders backdrop with bg-black/60', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      const { container } = render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Content</p>
        </ModalShell>
      )

      const backdrop = container.querySelector('.bg-black\\/60')
      expect(backdrop).not.toBeNull()
    })

    it('calls onClose when backdrop is clicked (preventBackdropClose=false)', () => {
      mockUseIsSmallScreen.mockReturnValue(false)
      const onClose = vi.fn()

      const { container } = render(
        <ModalShell open={true} onClose={onClose}>
          <p>Content</p>
        </ModalShell>
      )

      const backdrop = container.querySelector('.bg-black\\/60')
      fireEvent.click(backdrop)
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does NOT call onClose when backdrop is clicked and preventBackdropClose=true', () => {
      mockUseIsSmallScreen.mockReturnValue(false)
      const onClose = vi.fn()

      const { container } = render(
        <ModalShell open={true} onClose={onClose} preventBackdropClose={true}>
          <p>Content</p>
        </ModalShell>
      )

      const backdrop = container.querySelector('.bg-black\\/60')
      fireEvent.click(backdrop)
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has role="dialog" by default', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Content</p>
        </ModalShell>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Content</p>
        </ModalShell>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
    })

    it('supports ariaLabel prop', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      render(
        <ModalShell open={true} onClose={() => {}} ariaLabel="Post composer">
          <p>Content</p>
        </ModalShell>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-label', 'Post composer')
    })

    it('supports custom role prop', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      render(
        <ModalShell open={true} onClose={() => {}} role="alertdialog">
          <p>Content</p>
        </ModalShell>
      )

      const alertDialog = screen.getByRole('alertdialog')
      expect(alertDialog).toBeInTheDocument()
      expect(alertDialog).toHaveAttribute('aria-modal', 'true')
    })
  })

  describe('body scroll lock', () => {
    it('calls useBodyLock with open state', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      render(
        <ModalShell open={true} onClose={() => {}}>
          <p>Content</p>
        </ModalShell>
      )

      expect(mockUseBodyLock).toHaveBeenCalledWith(true)
    })

    it('calls useBodyLock(false) when open=false', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      render(
        <ModalShell open={false} onClose={() => {}}>
          <p>Content</p>
        </ModalShell>
      )

      expect(mockUseBodyLock).toHaveBeenCalledWith(false)
    })
  })

  describe('desktop width', () => {
    it('applies desktopWidth prop to panel', () => {
      mockUseIsSmallScreen.mockReturnValue(false)

      const { container } = render(
        <ModalShell open={true} onClose={() => {}} desktopWidth={600}>
          <p>Content</p>
        </ModalShell>
      )

      const panel = container.querySelector('.animate-pop-in')
      expect(panel.style.width).toBe('600px')
    })
  })
})
