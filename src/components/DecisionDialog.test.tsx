import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DecisionDialog } from './DecisionDialog'
import type { Tables } from '../types/database.types'

type LeaveApplication = Tables<'leave_applications'>

const mockApplication: LeaveApplication = {
  id: 42,
  user_id: 'a0000000-0000-0000-0000-000000000004',
  employee_name: 'Juan dela Cruz',
  leave_type: 'VL',
  other_leave_type: null,
  start_date: '2026-11-20',
  end_date: '2026-11-22',
  total_days: 3,
  working_days: 3,
  control_number: 'Leave-2026-000042',
  date_of_filing: '2026-11-15',
  position_at_filing: 'Nurse II',
  details: { location: 'within_philippines', specify: 'Bukidnon' },
  commutation: 'not_requested',
  credits_snapshot: null,
  recommendation: 'for_approval',
  recommendation_reason: 'Coverage satisfied',
  approved_days_with_pay: 3,
  approved_days_without_pay: 0,
  approved_others: null,
  disapproval_reason: null,
  reason: 'Family event in province',
  status: 'PENDING',
  dss_recommendation: 'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)',
  created_by_admin_id: null,
  processed_by_admin_id: null,
  admin_remarks: null,
  processed_at: null,
  created_at: '2026-11-15T08:00:00Z',
}

describe('DecisionDialog component', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <DecisionDialog
        application={mockApplication}
        action="APPROVE"
        isOpen={false}
        isProcessing={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders approval dialog details and triggers onConfirm with breakdown', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined)
    const onCloseMock = vi.fn()

    render(
      <DecisionDialog
        application={mockApplication}
        action="APPROVE"
        isOpen={true}
        isProcessing={false}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      />
    )

    expect(screen.getByText(/Approve Leave Application/i)).toBeInTheDocument()
    expect(screen.getByText(/Juan dela Cruz/)).toBeInTheDocument()
    expect(screen.getByText(/3 day\(s\)/)).toBeInTheDocument()

    // Submit with defaults (3 days with pay, 0 without pay)
    const submitBtn = screen.getByRole('button', { name: /Confirm Approval/i })
    fireEvent.click(submitBtn)

    expect(onConfirmMock).toHaveBeenCalledWith(42, {
      approved_days_with_pay: 3,
      approved_days_without_pay: 0,
      approved_others: null,
      remarks: null,
    })
  })

  it('renders rejection dialog requiring disapproval reason', async () => {
    const onConfirmMock = vi.fn().mockResolvedValue(undefined)
    const onCloseMock = vi.fn()

    render(
      <DecisionDialog
        application={mockApplication}
        action="REJECT"
        isOpen={true}
        isProcessing={false}
        onClose={onCloseMock}
        onConfirm={onConfirmMock}
      />
    )

    expect(screen.getByText(/Disapprove Leave Application/i)).toBeInTheDocument()

    // Add disapproval reason and submit
    const reasonInput = screen.getByPlaceholderText(/Coverage critical/i)
    fireEvent.change(reasonInput, { target: { value: 'Staff coverage below minimum threshold.' } })

    const submitBtn = screen.getByRole('button', { name: /Confirm Disapproval/i })
    fireEvent.click(submitBtn)

    expect(onConfirmMock).toHaveBeenCalledWith(42, {
      disapproval_reason: 'Staff coverage below minimum threshold.',
      remarks: null,
    })
  })
})
