/**
 * @vitest-environment jsdom
 *
 * Unit tests for dashboard components:
 * - KpiCard: renders label, value, accent, hint
 * - AlertBanner: conditional render based on count > 0
 * - PlanetBars: renders bars for all 7 planets with proportional widths
 * - DashboardPage: renders 6 KPIs from mock stats, quick actions navigate
 *
 * Validates: Requirements 3.2, 3.3, 3.6, 3.8
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// vi.hoisted runs before vi.mock factories — needed so mockStats is accessible
const mockStats = vi.hoisted(() => ({
  posts: { total: 42, last24h: 5, hidden: 2 },
  reactions: 100,
  reports: { total: 10, pending: 3 },
  byPlanet: { joy: 10, vent: 8, advice: 5, grief: 3, anxiety: 7, neutral: 4, doodle: 2 },
  verdicts: { safe: 30, toxic: 5, crisis: 1 },
  storage: 'database',
  moderationEngine: 'perspective+local',
}))

vi.mock('../adminApi', () => ({
  fetchStats: vi.fn().mockResolvedValue(mockStats),
  fetchLogs: vi.fn().mockResolvedValue({ entries: [] }),
}))

vi.mock('../hooks/usePolling', () => ({
  default: vi.fn(() => ({
    data: mockStats,
    loading: false,
    error: null,
    refresh: vi.fn(),
  })),
}))

// ─── KpiCard Tests ────────────────────────────────────────────────────────────

import KpiCard from './KpiCard'

describe('KpiCard', () => {
  it('renders the label text', () => {
    render(<KpiCard label="Total Posts" value={42} />)
    expect(screen.getByText('Total Posts')).toBeInTheDocument()
  })

  it('renders the value', () => {
    render(<KpiCard label="Reactions" value={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('applies the default text-white accent class', () => {
    render(<KpiCard label="Test" value={5} />)
    const valueEl = screen.getByText('5')
    expect(valueEl).toHaveClass('text-white')
  })

  it('applies a custom accent color class', () => {
    render(<KpiCard label="Crisis" value={1} accent="text-violet-300" />)
    const valueEl = screen.getByText('1')
    expect(valueEl).toHaveClass('text-violet-300')
  })

  it('renders hint text when provided', () => {
    render(<KpiCard label="Posts" value={42} hint="Last 7 days" />)
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
  })

  it('does not render hint when not provided', () => {
    const { container } = render(<KpiCard label="Posts" value={42} />)
    // hint uses a specific class pattern
    const hintEls = container.querySelectorAll('.text-xs.text-slate-400.mt-1')
    expect(hintEls).toHaveLength(0)
  })
})

// ─── AlertBanner Tests ────────────────────────────────────────────────────────

import AlertBanner from './AlertBanner'

describe('AlertBanner', () => {
  it('returns null when count is 0', () => {
    const { container } = render(<AlertBanner variant="reports" count={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders when count > 0', () => {
    render(<AlertBanner variant="reports" count={3} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('reports variant shows pending count text (singular)', () => {
    render(<AlertBanner variant="reports" count={1} />)
    expect(screen.getByText('1 pending report')).toBeInTheDocument()
  })

  it('reports variant shows pending count text (plural)', () => {
    render(<AlertBanner variant="reports" count={5} />)
    expect(screen.getByText('5 pending reports')).toBeInTheDocument()
  })

  it('crisis variant shows crisis detection text', () => {
    render(<AlertBanner variant="crisis" count={2} />)
    expect(screen.getByText('2 crisis detections')).toBeInTheDocument()
  })

  it('reports variant uses amber styling', () => {
    render(<AlertBanner variant="reports" count={1} />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('bg-amber')
  })

  it('crisis variant uses violet styling', () => {
    render(<AlertBanner variant="crisis" count={1} />)
    const alert = screen.getByRole('alert')
    expect(alert.className).toContain('bg-violet')
  })

  it('reports variant has a clickable Review link that calls onNavigate', () => {
    const onNavigate = vi.fn()
    render(<AlertBanner variant="reports" count={3} onNavigate={onNavigate} />)
    const link = screen.getByText('Review →')
    fireEvent.click(link)
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('crisis variant does not render a Review link', () => {
    render(<AlertBanner variant="crisis" count={2} />)
    expect(screen.queryByText('Review →')).not.toBeInTheDocument()
  })
})

// ─── PlanetBars Tests ─────────────────────────────────────────────────────────

import PlanetBars from './PlanetBars'

describe('PlanetBars', () => {
  const byPlanet = { joy: 10, vent: 8, advice: 5, grief: 3, anxiety: 7, neutral: 4, doodle: 2 }

  it('renders one row per planet (7 total)', () => {
    render(<PlanetBars byPlanet={byPlanet} />)
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(7)
  })

  it('shows planet emoji and label', () => {
    render(<PlanetBars byPlanet={byPlanet} />)
    // Joy planet
    expect(screen.getByText('Joy')).toBeInTheDocument()
    expect(screen.getByText('✨')).toBeInTheDocument()
    // Venting planet
    expect(screen.getByText('Venting')).toBeInTheDocument()
    // Doodle Drift planet
    expect(screen.getByText('Doodle Drift')).toBeInTheDocument()
  })

  it('shows count number for each planet', () => {
    render(<PlanetBars byPlanet={byPlanet} />)
    // Joy has 10, venting has 8, doodle has 2
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('highest count planet has bar width of 100%', () => {
    const { container } = render(<PlanetBars byPlanet={byPlanet} />)
    // Joy has count=10 which is the max, so its bar should be 100% width
    const bars = container.querySelectorAll('[style*="width"]')
    const widths = Array.from(bars).map(b => b.style.width)
    expect(widths).toContain('100%')
  })

  it('zero count renders 0% width bar', () => {
    const zeroData = { joy: 0, vent: 5, advice: 0, grief: 0, anxiety: 0, neutral: 0, doodle: 0 }
    const { container } = render(<PlanetBars byPlanet={zeroData} />)
    const bars = container.querySelectorAll('[style*="width"]')
    const widths = Array.from(bars).map(b => b.style.width)
    // Only vent=5 should be 100%, all others 0%
    const zeroWidths = widths.filter(w => w === '0%')
    expect(zeroWidths).toHaveLength(6)
  })

  it('proportional widths are correct', () => {
    // With byPlanet max=10, vent=8 should be 80%
    const { container } = render(<PlanetBars byPlanet={byPlanet} />)
    const bars = container.querySelectorAll('[style*="width"]')
    const widths = Array.from(bars).map(b => b.style.width)
    expect(widths).toContain('80%') // vent: 8/10 = 80%
  })
})

// ─── DashboardPage Tests ──────────────────────────────────────────────────────

import DashboardPage from '../pages/DashboardPage'

describe('DashboardPage', () => {
  let onAuthError
  let onNavigate

  beforeEach(() => {
    vi.clearAllMocks()
    onAuthError = vi.fn()
    onNavigate = vi.fn()
  })

  it('renders 6 KPI cards with correct values from mock stats', () => {
    const { container } = render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    // Find all KPI value elements (text-2xl font-bold inside KPI cards)
    const kpiValues = container.querySelectorAll('.text-2xl.font-bold')
    expect(kpiValues).toHaveLength(6)
    // Check individual values exist in the document
    const values = Array.from(kpiValues).map(el => el.textContent)
    expect(values).toContain('42')   // Total Posts
    expect(values).toContain('5')    // Posts 24h
    expect(values).toContain('3')    // Pending Reports
    expect(values).toContain('100')  // Reactions
    expect(values).toContain('1')    // Crisis
    expect(values).toContain('2')    // Blocked
  })

  it('renders KPI labels', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    expect(screen.getByText('Total Posts')).toBeInTheDocument()
    expect(screen.getByText('Posts (24h)')).toBeInTheDocument()
    expect(screen.getByText('Pending Reports')).toBeInTheDocument()
    expect(screen.getByText('Reactions')).toBeInTheDocument()
    expect(screen.getByText('Crisis')).toBeInTheDocument()
    expect(screen.getByText('Blocked')).toBeInTheDocument()
  })

  it('renders 3 quick action buttons', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    expect(screen.getByText('Review reports')).toBeInTheDocument()
    expect(screen.getByText('View live logs')).toBeInTheDocument()
    expect(screen.getByText('Test filter rules')).toBeInTheDocument()
  })

  it('quick action "Review reports" calls onNavigate with "reports"', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Review reports'))
    expect(onNavigate).toHaveBeenCalledWith('reports')
  })

  it('quick action "View live logs" calls onNavigate with "logs"', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('View live logs'))
    expect(onNavigate).toHaveBeenCalledWith('logs')
  })

  it('quick action "Test filter rules" calls onNavigate with "rules"', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Test filter rules'))
    expect(onNavigate).toHaveBeenCalledWith('rules')
  })

  it('renders alert banner for pending reports > 0', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    expect(screen.getByText('3 pending reports')).toBeInTheDocument()
  })

  it('renders alert banner for crisis > 0', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    expect(screen.getByText('1 crisis detection')).toBeInTheDocument()
  })

  it('renders planet activity distribution section', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    expect(screen.getByText('Activity by planet')).toBeInTheDocument()
  })

  it('renders health indicators for database and moderation engine', () => {
    render(<DashboardPage onAuthError={onAuthError} onNavigate={onNavigate} />)
    expect(screen.getByText('✓ Persistent storage (database)')).toBeInTheDocument()
    expect(screen.getByText('✓ Perspective AI + local lexicons')).toBeInTheDocument()
  })
})
