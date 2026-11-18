import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { LeaveCalendarView } from './LeaveCalendarView'
import { FALLBACK_LEAVE_TYPES } from '../lib/leaveTypes'
import type { Database } from '../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

const mockApplications: LeaveApplication[] = [
  // Leave spanning across dates
  {
    id: 101,
    user_id: 'user-1',
    employee_name: 'Dr. Maria Santos',
    leave_type: 'VL',
    other_leave_type: null,
    start_date: '2026-11-04',
    end_date: '2026-11-06',
    total_days: 3,
    working_days: 3,
    control_number: 'Leave-2026-000101',
    date_of_filing: '2026-10-25',
    position_at_filing: 'Medical Officer III',
    details: {},
    commutation: 'not_requested',
    credits_snapshot: null,
    recommendation: 'for_approval',
    recommendation_reason: null,
    approved_days_with_pay: 3,
    approved_days_without_pay: 0,
    approved_others: null,
    disapproval_reason: null,
    reason: 'Vacation leave with family',
    status: 'APPROVED',
    dss_recommendation: 'RECOMMENDED',
    created_by_admin_id: null,
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-10-25T08:00:00Z',
  },
  // Pending leave
  {
    id: 102,
    user_id: 'user-2',
    employee_name: 'Nurse John Reyes',
    leave_type: 'SL',
    other_leave_type: null,
    start_date: '2026-11-05',
    end_date: '2026-11-05',
    total_days: 1,
    working_days: 1,
    control_number: 'Leave-2026-000102',
    date_of_filing: '2026-11-05',
    position_at_filing: 'Nurse II',
    details: {},
    commutation: 'not_requested',
    credits_snapshot: null,
    recommendation: 'for_approval',
    recommendation_reason: null,
    approved_days_with_pay: 1,
    approved_days_without_pay: 0,
    approved_others: null,
    disapproval_reason: null,
    reason: 'Flu symptoms',
    status: 'PENDING',
    dss_recommendation: 'RECOMMENDED',
    created_by_admin_id: null,
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-11-05T08:00:00Z',
  },
  // Boundary spanning leave (Oct 28 to Nov 3)
  {
    id: 103,
    user_id: 'user-3',
    employee_name: 'Midwife Elena Cruz',
    leave_type: 'FL',
    other_leave_type: null,
    start_date: '2026-10-28',
    end_date: '2026-11-03',
    total_days: 5,
    working_days: 5,
    control_number: 'Leave-2026-000103',
    date_of_filing: '2026-10-20',
    position_at_filing: 'Midwife II',
    details: {},
    commutation: 'not_requested',
    credits_snapshot: null,
    recommendation: 'for_approval',
    recommendation_reason: null,
    approved_days_with_pay: 5,
    approved_days_without_pay: 0,
    approved_others: null,
    disapproval_reason: null,
    reason: 'Forced leave',
    status: 'APPROVED',
    dss_recommendation: 'RECOMMENDED',
    created_by_admin_id: null,
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-10-20T08:00:00Z',
  },
  // Rejected leave
  {
    id: 104,
    user_id: 'user-4',
    employee_name: 'Staff Mark Tan',
    leave_type: 'SPL',
    other_leave_type: null,
    start_date: '2026-11-05',
    end_date: '2026-11-05',
    total_days: 1,
    working_days: 1,
    control_number: 'Leave-2026-000104',
    date_of_filing: '2026-11-01',
    position_at_filing: 'Admin Aide IV',
    details: {},
    commutation: 'not_requested',
    credits_snapshot: null,
    recommendation: 'for_disapproval',
    recommendation_reason: null,
    approved_days_with_pay: 0,
    approved_days_without_pay: 0,
    approved_others: null,
    disapproval_reason: 'Understaffed',
    reason: 'Personal errand',
    status: 'REJECTED',
    dss_recommendation: 'NEEDS_REVIEW',
    created_by_admin_id: null,
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-11-01T08:00:00Z',
  },
]

describe('LeaveCalendarView component', () => {
  it('renders month name, weekday headers, and legend', () => {
    const handleDateChange = vi.fn()
    const handleViewApp = vi.fn()

    render(
      <LeaveCalendarView
        currentDate={new Date(2026, 10, 15)} // Nov 2026
        onDateChange={handleDateChange}
        applications={mockApplications}
        leaveTypes={FALLBACK_LEAVE_TYPES}
        minDutyStaffThreshold={2}
        onViewApplication={handleViewApp}
      />
    )

    expect(screen.getByText('November 2026')).toBeInTheDocument()
    expect(screen.getByText('Approved')).toBeInTheDocument()
    expect(screen.getByText(/Pending \(Striped\)/)).toBeInTheDocument()
    expect(screen.getByText(/Staffing warning badge shown/i)).toBeInTheDocument()
  })

  it('renders leaves spanning boundary dates and navigates on click', () => {
    const handleDateChange = vi.fn()
    const handleViewApp = vi.fn()

    render(
      <LeaveCalendarView
        currentDate={new Date(2026, 10, 15)}
        onDateChange={handleDateChange}
        applications={mockApplications}
        leaveTypes={FALLBACK_LEAVE_TYPES}
        minDutyStaffThreshold={2}
        onViewApplication={handleViewApp}
      />
    )

    // Check presence of spanning leave (Elena Cruz) in grid/agenda buttons
    const elenaButtons = screen.getAllByRole('button', { name: /Elena Cruz/i })
    expect(elenaButtons.length).toBeGreaterThan(0)

    // Clicking a leave item invokes onViewApplication
    fireEvent.click(elenaButtons[0])

    expect(handleViewApp).toHaveBeenCalledWith(
      expect.objectContaining({ id: 103, employee_name: 'Midwife Elena Cruz' })
    )
  })

  it('hides rejected leaves by default, but reveals them when toggled', () => {
    const handleDateChange = vi.fn()
    const handleViewApp = vi.fn()

    render(
      <LeaveCalendarView
        currentDate={new Date(2026, 10, 15)}
        onDateChange={handleDateChange}
        applications={mockApplications}
        leaveTypes={FALLBACK_LEAVE_TYPES}
        minDutyStaffThreshold={2}
        onViewApplication={handleViewApp}
      />
    )

    // Mark Tan (Rejected) button should not be in the document initially
    expect(screen.queryByRole('button', { name: /Mark Tan/i })).toBeNull()

    // Toggle "Show Rejected"
    const checkbox = screen.getByRole('checkbox', { name: /Show Rejected/i })
    fireEvent.click(checkbox)

    // Now Mark Tan button is visible
    expect(screen.getAllByRole('button', { name: /Mark Tan/i }).length).toBeGreaterThan(0)
  })

  it('renders gracefully with an empty applications month', () => {
    const handleDateChange = vi.fn()
    const handleViewApp = vi.fn()

    render(
      <LeaveCalendarView
        currentDate={new Date(2026, 11, 1)} // Dec 2026 (empty)
        onDateChange={handleDateChange}
        applications={[]}
        leaveTypes={FALLBACK_LEAVE_TYPES}
        minDutyStaffThreshold={2}
        onViewApplication={handleViewApp}
      />
    )

    expect(screen.getByText('December 2026')).toBeInTheDocument()
    // No error or crash thrown
  })
})
