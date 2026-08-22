/**
 * ScrollFade unit tests.
 * Verifies gradient fade indicators appear/disappear based on scroll position.
 *
 * Validates: Requirements 20.5
 */

import { render, screen, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import ScrollFade from '../ScrollFade'

describe('ScrollFade', () => {

  it('renders children', () => {
    render(
      <ScrollFade>
        <p>Hello world</p>
      </ScrollFade>
    )
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('does not show top fade at initial scroll position (scrollTop=0)', () => {
    const { container } = render(
      <ScrollFade>
        <p>Content</p>
      </ScrollFade>
    )
    // At scroll position 0, no top gradient should be visible
    const fades = container.querySelectorAll('[aria-hidden="true"]')
    const topFade = Array.from(fades).find(el =>
      el.style.background.includes('to bottom')
    )
    expect(topFade).toBeUndefined()
  })

  it('shows bottom fade when content overflows', async () => {
    const { container } = render(
      <ScrollFade>
        <div style={{ height: '2000px' }}>Tall content</div>
      </ScrollFade>
    )

    // Simulate overflow: set scrollHeight > clientHeight
    const scrollEl = container.querySelector('.overflow-y-auto')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(scrollEl, 'scrollTop', { value: 0, configurable: true })

    // Trigger the scroll event — rAF fires synchronously in jsdom within act()
    await act(async () => {
      scrollEl.dispatchEvent(new Event('scroll'))
      // Allow requestAnimationFrame callback to execute
      await new Promise((r) => requestAnimationFrame(r))
    })

    // Re-render check: the bottom fade should appear
    const fades = container.querySelectorAll('[aria-hidden="true"]')
    const bottomFade = Array.from(fades).find(el =>
      el.style.background.includes('to top')
    )
    expect(bottomFade).toBeDefined()
  })

  it('shows top fade when scrolled down', async () => {
    const { container } = render(
      <ScrollFade>
        <div style={{ height: '2000px' }}>Tall content</div>
      </ScrollFade>
    )

    const scrollEl = container.querySelector('.overflow-y-auto')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(scrollEl, 'scrollTop', { value: 100, configurable: true })

    await act(async () => {
      scrollEl.dispatchEvent(new Event('scroll'))
      await new Promise((r) => requestAnimationFrame(r))
    })

    // The top fade is positioned at the top of the container
    const topFade = container.querySelector('.absolute.top-0')
    expect(topFade).not.toBeNull()
  })

  it('fade overlays have pointer-events-none class', async () => {
    const { container } = render(
      <ScrollFade>
        <div style={{ height: '2000px' }}>Tall content</div>
      </ScrollFade>
    )

    const scrollEl = container.querySelector('.overflow-y-auto')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(scrollEl, 'scrollTop', { value: 50, configurable: true })

    await act(async () => {
      scrollEl.dispatchEvent(new Event('scroll'))
      await new Promise((r) => requestAnimationFrame(r))
    })

    const fades = container.querySelectorAll('[aria-hidden="true"]')
    expect(fades.length).toBeGreaterThan(0)
    fades.forEach(fade => {
      expect(fade.className).toContain('pointer-events-none')
    })
  })

  it('applies custom bgColor in gradient styles', async () => {
    const { container } = render(
      <ScrollFade bgColor="#ff0000">
        <div style={{ height: '2000px' }}>Tall content</div>
      </ScrollFade>
    )

    const scrollEl = container.querySelector('.overflow-y-auto')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(scrollEl, 'scrollTop', { value: 50, configurable: true })

    await act(async () => {
      scrollEl.dispatchEvent(new Event('scroll'))
      await new Promise((r) => requestAnimationFrame(r))
    })

    const fades = container.querySelectorAll('[aria-hidden="true"]')
    // Both fades should use the custom color (jsdom may convert hex to rgb)
    fades.forEach(fade => {
      const bg = fade.style.background
      const hasCustomColor = bg.includes('#ff0000') || bg.includes('rgb(255, 0, 0)')
      expect(hasCustomColor).toBe(true)
    })
  })

  it('applies custom fadeHeight in gradient styles', async () => {
    const { container } = render(
      <ScrollFade fadeHeight={48}>
        <div style={{ height: '2000px' }}>Tall content</div>
      </ScrollFade>
    )

    const scrollEl = container.querySelector('.overflow-y-auto')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 300, configurable: true })
    Object.defineProperty(scrollEl, 'scrollTop', { value: 50, configurable: true })

    await act(async () => {
      scrollEl.dispatchEvent(new Event('scroll'))
      await new Promise((r) => requestAnimationFrame(r))
    })

    const fades = container.querySelectorAll('[aria-hidden="true"]')
    fades.forEach(fade => {
      expect(fade.style.height).toBe('48px')
    })
  })

  it('applies additional className to outer wrapper', () => {
    const { container } = render(
      <ScrollFade className="my-custom-class">
        <p>Content</p>
      </ScrollFade>
    )

    // The outermost wrapper div should include the custom class
    const wrapper = container.firstChild
    expect(wrapper.className).toContain('my-custom-class')
    expect(wrapper.className).toContain('relative')
    expect(wrapper.className).toContain('overflow-hidden')
  })
})
