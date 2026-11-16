import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DecisionDialog } from './DecisionDialog'
import type { Tables } from '../types/database.types'

type LeaveApplication = Tables<'leave_applications'>

const mockApplication: LeaveApplication = {
  id: 42,
  user_id: 'a0000000-0000-0000-0000-000000000004',
  employee_name: 'Juan dela Cruz',
  leave_type: 'Vacation Leave',
  other_leave_type: null,
  start_date: '2026-11-20',
  end_date: '2026-11-22',
  total_days: 3,
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

  it('renders approval dialog details and triggers onConfirm', async () => {
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

    expect(screen.getByText('Approve Leave Application')).toBeInTheDocument()
    expect(screen.getByText(/Juan dela Cruz/)).toBeInTheDocument()
    expect(screen.getByText(/3 working day\(s\)/)).toBeInTheDocument()
    expect(screen.getByText('Confirm Approval & Deduct Credits')).toBeInTheDocument()

    // Add remarks and submit
    const remarksInput = screen.getByPlaceholderText(/e\.g\. Approved/i)
    fireEvent.change(remarksInput, { target: { value: 'All duty coverage verified.' } })

    const submitBtn = screen.getByRole('button', { name: /Confirm Approval/i })
    fireEvent.click(submitBtn)

    expect(onConfirmMock).toHaveBeenCalledWith(42, 'All duty coverage verified.')
  })

  it('renders rejection dialog requiring remarks', async () => {
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

    expect(screen.getByText('Reject Leave Application')).toBeInTheDocument()
    expect(screen.getByText('Confirm Rejection')).toBeInTheDocument()

    const remarksInput = screen.getByPlaceholderText(/e\.g\. Disapproved due to high patient volume/i)
    expect(remarksInput).toBeRequired()

    fireEvent.change(remarksInput, { target: { value: 'Staff coverage below required threshold.' } })
    const submitBtn = screen.getByRole('button', { name: /Confirm Rejection/i })
    fireEvent.click(submitBtn)

    expect(onConfirmMock).toHaveBeenCalledWith(42, 'Staff coverage below required threshold.')
  })

  it('triggers onClose when Cancel button is clicked', () => {
    const onCloseMock = vi.fn()

    render(
      <DecisionDialog
        application={mockApplication}
        action="APPROVE"
        isOpen={true}
        isProcessing={false}
        onClose={onCloseMock}
        onConfirm={vi.fn()}
      />
    )

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' })
    fireEvent.click(cancelBtn)
    expect(onCloseMock).toHaveBeenCalledTimes(1)
  })
})
