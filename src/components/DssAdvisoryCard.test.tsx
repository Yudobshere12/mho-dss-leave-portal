import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { DssAdvisoryCard } from './DssAdvisoryCard'
import type { DssViewModel } from '../lib/dssPresenter'

describe('DssAdvisoryCard component', () => {
  it('renders loading state when isLoading is true', () => {
    render(<DssAdvisoryCard viewModel={null} isLoading={true} />)
    expect(screen.getByText(/Evaluating leave credits and clinical coverage/i)).toBeInTheDocument()
  })

  it('renders empty fallback when viewModel is null and not loading', () => {
    render(<DssAdvisoryCard viewModel={null} isLoading={false} />)
    expect(screen.getByText(/No DSS evaluation available/i)).toBeInTheDocument()
  })

  it('renders recommended view model correctly', () => {
    const mockVm: DssViewModel = {
      status: 'recommended',
      statusLabel: 'Recommended',
      summary: 'The system recommends approving this leave application.',
      reasons: [
        { icon: 'check', text: 'All system checks passed — leave credits and clinical coverage are sufficient.' },
      ],
      facts: [{ label: 'Requested', value: '3 days' }],
      raw: 'RECOMMENDED (Coverage satisfied)',
    }

    render(<DssAdvisoryCard viewModel={mockVm} isAdmin={true} />)

    expect(screen.getByText('Recommended')).toBeInTheDocument()
    expect(screen.getByText(/The system recommends approving/i)).toBeInTheDocument()
    expect(screen.getByText(/All system checks passed/i)).toBeInTheDocument()
    expect(screen.getByText('Requested:')).toBeInTheDocument()
    expect(screen.getByText('3 days')).toBeInTheDocument()
    expect(screen.getByText('Technical details')).toBeInTheDocument()
  })

  it('hides technical details when isAdmin is false', () => {
    const mockVm: DssViewModel = {
      status: 'needs_review',
      statusLabel: 'Needs Review',
      summary: 'Requires manual review.',
      reasons: [{ icon: 'alert', text: 'Notice requirement not met.' }],
      facts: [],
      raw: 'NEEDS_REVIEW (Notice requirement not met)',
    }

    render(<DssAdvisoryCard viewModel={mockVm} isAdmin={false} />)
    expect(screen.queryByText('Technical details')).toBeNull()
  })
})
