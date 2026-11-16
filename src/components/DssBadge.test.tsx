import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DssBadge } from './DssBadge'

describe('DssBadge component', () => {
  it('renders "No DSS Data" fallback when recommendation is null', () => {
    render(<DssBadge recommendation={null} />)
    expect(screen.getByText('No DSS Data')).toBeInTheDocument()
  })

  it('renders green RECOMMENDED badge when recommendation begins with RECOMMENDED without warning', () => {
    const text = 'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)'
    render(<DssBadge recommendation={text} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    const badge = screen.getByTitle(text)
    expect(badge).toHaveClass('bg-emerald-100')
    expect(badge).toHaveClass('text-emerald-800')
  })

  it('renders compact RECOMMENDED text when compact=true', () => {
    const text = 'RECOMMENDED (Sufficient balance)'
    render(<DssBadge recommendation={text} compact />)
    expect(screen.getByText('RECOMMENDED')).toBeInTheDocument()
  })

  it('renders amber NEEDS REVIEW badge when recommendation contains NEEDS_REVIEW', () => {
    const text = 'NEEDS_REVIEW: Insufficient balance'
    render(<DssBadge recommendation={text} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    const badge = screen.getByTitle(text)
    expect(badge).toHaveClass('bg-amber-100')
    expect(badge).toHaveClass('text-amber-900')
  })

  it('renders amber NEEDS REVIEW badge when recommendation contains WARNING', () => {
    const text = 'Coverage Warning: Duty staff reduced below threshold'
    render(<DssBadge recommendation={text} />)
    expect(screen.getByText(text)).toBeInTheDocument()
    const badge = screen.getByTitle(text)
    expect(badge).toHaveClass('bg-amber-100')
  })

  it('renders compact NEEDS REVIEW text when compact=true and warning is present', () => {
    const text = 'NEEDS_REVIEW: Overlapping approved leave'
    render(<DssBadge recommendation={text} compact />)
    expect(screen.getByText('NEEDS REVIEW')).toBeInTheDocument()
  })
})
