import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock useIsSmallScreen to control mobile/desktop behavior (desktop by default)
vi.mock('../../../lib/device', () => ({
  useIsSmallScreen: () => false,
}))

import Button from '../Button'
import Input from '../Input'
import Textarea from '../Textarea'
import Card from '../Card'
import Banner from '../Banner'

// ─── Button ───────────────────────────────────────────────────────────────────

describe('Button', () => {
  describe('variants', () => {
    it('renders primary variant with correct classes', () => {
      render(<Button variant="primary">Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('border-white/30')
      expect(btn.className).toContain('uppercase')
      expect(btn.className).toContain('tracking-[0.15em]')
      expect(btn.className).toContain('text-xs')
    })

    it('renders secondary variant with correct classes', () => {
      render(<Button variant="secondary">Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('border-white/[0.12]')
      expect(btn.className).toContain('text-slate-300')
      expect(btn.className).toContain('uppercase')
    })

    it('renders ghost variant with correct classes', () => {
      render(<Button variant="ghost">Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('text-slate-400')
      expect(btn.className).toContain('hover:text-white')
    })

    it('renders destructive variant with correct classes', () => {
      render(<Button variant="destructive">Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('from-red-700')
      expect(btn.className).toContain('to-rose-700')
      expect(btn.className).toContain('rounded-xl')
    })

    it('renders cta variant with correct classes', () => {
      render(<Button variant="cta">Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('bg-violet-600')
      expect(btn.className).toContain('hover:bg-violet-500')
      expect(btn.className).toContain('rounded-lg')
    })
  })

  describe('states', () => {
    it('applies disabled classes when disabled', () => {
      render(<Button disabled>Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('opacity-40')
      expect(btn.className).toContain('pointer-events-none')
      expect(btn.className).toContain('cursor-not-allowed')
      expect(btn).toBeDisabled()
    })

    it('applies loading classes and shows spinner when loading', () => {
      render(<Button loading>Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('opacity-70')
      expect(btn.className).toContain('pointer-events-none')
      expect(btn).toBeDisabled()
      expect(btn.getAttribute('aria-busy')).toBe('true')
      // Spinner SVG should be present
      expect(btn.querySelector('svg')).not.toBeNull()
    })

    it('has focus-visible ring classes', () => {
      render(<Button>Click</Button>)
      const btn = screen.getByRole('button', { name: 'Click' })
      expect(btn.className).toContain('focus-visible:outline')
      expect(btn.className).toContain('focus-visible:outline-2')
      expect(btn.className).toContain('focus-visible:outline-offset-2')
      expect(btn.className).toContain('focus-visible:outline-white/70')
    })
  })
})

// ─── Input ────────────────────────────────────────────────────────────────────

describe('Input', () => {
  it('renders with base design-system classes', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input.className).toContain('bg-white/[0.03]')
    expect(input.className).toContain('border-white/[0.1]')
    expect(input.className).toContain('rounded-sm')
    expect(input.className).toContain('text-sm')
    expect(input.className).toContain('text-white')
  })

  it('renders error message when error prop is provided', () => {
    render(<Input error="This field is required" />)
    expect(screen.getByText('This field is required')).toBeInTheDocument()
    const errorEl = screen.getByText('This field is required')
    expect(errorEl.className).toContain('text-red-400')
    expect(errorEl.className).toContain('text-xs')
  })

  it('does not render error message when error prop is absent', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    // No sibling error paragraph
    expect(input.parentElement.querySelector('p')).toBeNull()
  })

  it('applies disabled classes when disabled', () => {
    render(<Input disabled data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input.className).toContain('opacity-50')
    expect(input.className).toContain('cursor-not-allowed')
    expect(input).toBeDisabled()
  })

  it('has focus transition classes when not disabled', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input.className).toContain('focus:border-white/25')
    expect(input.className).toContain('focus:outline-none')
    expect(input.className).toContain('transition-colors')
    expect(input.className).toContain('duration-200')
  })
})

// ─── Textarea ─────────────────────────────────────────────────────────────────

describe('Textarea', () => {
  it('renders with base design-system classes including resize-none', () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea.className).toContain('bg-white/[0.03]')
    expect(textarea.className).toContain('border-white/[0.1]')
    expect(textarea.className).toContain('rounded-sm')
    expect(textarea.className).toContain('resize-none')
  })

  it('renders with default 3 rows', () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea.getAttribute('rows')).toBe('3')
  })

  it('respects custom rows prop', () => {
    render(<Textarea rows={5} data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea.getAttribute('rows')).toBe('5')
  })

  it('renders error message when error prop is provided', () => {
    render(<Textarea error="Too long" />)
    expect(screen.getByText('Too long')).toBeInTheDocument()
    const errorEl = screen.getByText('Too long')
    expect(errorEl.className).toContain('text-red-400')
    expect(errorEl.className).toContain('text-xs')
  })

  it('applies disabled classes when disabled', () => {
    render(<Textarea disabled data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea.className).toContain('opacity-50')
    expect(textarea.className).toContain('cursor-not-allowed')
    expect(textarea).toBeDisabled()
  })
})

// ─── Card ─────────────────────────────────────────────────────────────────────

describe('Card', () => {
  describe('variants', () => {
    it('renders default variant with correct classes', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('bg-transparent')
      expect(card.className).toContain('border-white/[0.08]')
      expect(card.className).toContain('rounded-xl')
    })

    it('renders interactive variant with hover and cursor classes', () => {
      render(<Card variant="interactive" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('hover:border-white/20')
      expect(card.className).toContain('cursor-pointer')
      expect(card.className).toContain('transition-all')
      expect(card.className).toContain('duration-200')
    })

    it('renders elevated variant with solid bg and shadow', () => {
      render(<Card variant="elevated" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('bg-[#0d0d2b]')
      expect(card.className).toContain('shadow-xl')
      expect(card.className).toContain('rounded-xl')
    })

    it('renders selected variant with violet accent classes', () => {
      render(<Card variant="selected" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('border-violet-500/50')
      expect(card.className).toContain('bg-violet-500/10')
    })
  })

  describe('selected prop', () => {
    it('applies selected classes when selected prop is true', () => {
      render(<Card variant="interactive" selected data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('border-violet-500/50')
      expect(card.className).toContain('bg-violet-500/10')
    })
  })

  describe('focus-visible', () => {
    it('applies focus-visible ring on interactive variant', () => {
      render(<Card variant="interactive" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).toContain('focus-visible:outline')
      expect(card.className).toContain('focus-visible:outline-2')
      expect(card.className).toContain('focus-visible:outline-offset-2')
    })

    it('does not apply focus-visible ring on default variant', () => {
      render(<Card variant="default" data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card.className).not.toContain('focus-visible:outline')
    })
  })
})

// ─── Banner ───────────────────────────────────────────────────────────────────

describe('Banner', () => {
  it('renders error type with correct classes', () => {
    render(<Banner type="error" data-testid="banner">Error msg</Banner>)
    const banner = screen.getByTestId('banner')
    expect(banner.className).toContain('bg-red-900/30')
    expect(banner.className).toContain('border-red-700/40')
    expect(banner.className).toContain('text-red-300')
    expect(banner).toHaveAttribute('role', 'alert')
  })

  it('renders warning type with correct classes', () => {
    render(<Banner type="warning" data-testid="banner">Warning msg</Banner>)
    const banner = screen.getByTestId('banner')
    expect(banner.className).toContain('bg-orange-900/30')
    expect(banner.className).toContain('border-orange-700/40')
    expect(banner.className).toContain('text-orange-300')
    expect(banner).toHaveAttribute('role', 'alert')
  })

  it('renders success type with correct classes', () => {
    render(<Banner type="success" data-testid="banner">Success msg</Banner>)
    const banner = screen.getByTestId('banner')
    expect(banner.className).toContain('bg-emerald-900/30')
    expect(banner.className).toContain('border-emerald-700/40')
    expect(banner.className).toContain('text-emerald-300')
  })

  it('renders info type with correct classes', () => {
    render(<Banner type="info" data-testid="banner">Info msg</Banner>)
    const banner = screen.getByTestId('banner')
    expect(banner.className).toContain('bg-violet-500/10')
    expect(banner.className).toContain('border-violet-500/20')
    expect(banner.className).toContain('text-violet-300')
  })

  it('defaults to info type when no type is specified', () => {
    render(<Banner data-testid="banner">Default msg</Banner>)
    const banner = screen.getByTestId('banner')
    expect(banner.className).toContain('bg-violet-500/10')
    expect(banner.className).toContain('text-violet-300')
  })

  it('applies shared base classes (rounded-xl, padding, text-sm)', () => {
    render(<Banner data-testid="banner">Content</Banner>)
    const banner = screen.getByTestId('banner')
    expect(banner.className).toContain('rounded-xl')
    expect(banner.className).toContain('px-4')
    expect(banner.className).toContain('py-3')
    expect(banner.className).toContain('text-sm')
  })

  it('does not set role=alert on info or success types', () => {
    const { rerender } = render(<Banner type="info" data-testid="banner">Info</Banner>)
    expect(screen.getByTestId('banner')).not.toHaveAttribute('role')

    rerender(<Banner type="success" data-testid="banner">Success</Banner>)
    expect(screen.getByTestId('banner')).not.toHaveAttribute('role')
  })
})
