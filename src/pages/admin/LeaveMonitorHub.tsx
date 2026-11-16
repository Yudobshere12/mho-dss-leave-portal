import React, { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  Download,
  Filter,
  Search,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  User,
  Eye,
  PlusCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { exportToCsv } from '../../utils/csv'
import { DssBadge } from '../../components/DssBadge'
import { DecisionDialog } from '../../components/DecisionDialog'
import type { Database, LeaveStatus } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

const DEMO_LEAVE_RECORDS: LeaveApplication[] = [
  {
    id: 1,
    user_id: 'a0000000-0000-0000-0000-000000000004',
    employee_name: 'Juan dela Cruz',
    leave_type: 'Vacation Leave',
    other_leave_type: null,
    start_date: '2026-11-02',
    end_date: '2026-11-04',
    total_days: 3.0,
    reason: 'Annual family gathering in province.',
    status: 'APPROVED',
    dss_recommendation: 'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)',
    created_by_admin_id: null,
    processed_by_admin_id: 'a0000000-0000-0000-0000-000000000002',
    admin_remarks: 'Approved. Adequate nursing coverage on duty.',
    processed_at: '2026-10-28T09:30:00Z',
    created_at: '2026-10-25T08:15:00Z',
  },
  {
    id: 2,
    user_id: 'a0000000-0000-0000-0000-000000000005',
    employee_name: 'Maria Santos',
    leave_type: 'Sick Leave',
    other_leave_type: null,
    start_date: '2026-11-10',
    end_date: '2026-11-11',
    total_days: 2.0,
    reason: 'Acute gastroenteritis with medical certificate.',
    status: 'APPROVED',
    dss_recommendation: 'RECOMMENDED (Medical certificate presented; balance sufficient)',
    created_by_admin_id: null,
    processed_by_admin_id: 'a0000000-0000-0000-0000-000000000001',
    admin_remarks: 'Approved for rest and recuperation.',
    processed_at: '2026-11-10T08:00:00Z',
    created_at: '2026-11-09T16:45:00Z',
  },
  {
    id: 3,
    user_id: 'a0000000-0000-0000-0000-000000000006',
    employee_name: 'Antonio Luna',
    leave_type: 'Vacation Leave',
    other_leave_type: null,
    start_date: '2026-12-01',
    end_date: '2026-12-05',
    total_days: 5.0,
    reason: 'Scheduled year-end vacation leave.',
    status: 'PENDING',
    dss_recommendation: 'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)',
    created_by_admin_id: null,
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-11-15T10:20:00Z',
  },
  {
    id: 4,
    user_id: 'a0000000-0000-0000-0000-000000000004',
    employee_name: 'Juan dela Cruz',
    leave_type: 'Emergency Leave',
    other_leave_type: null,
    start_date: '2026-11-18',
    end_date: '2026-11-19',
    total_days: 2.0,
    reason: 'Personal urgent errand.',
    status: 'REJECTED',
    dss_recommendation: 'Coverage Warning: Approving this leave reduces duty staff below minimum threshold.',
    created_by_admin_id: null,
    processed_by_admin_id: 'a0000000-0000-0000-0000-000000000001',
    admin_remarks: 'Disapproved due to critical mass vaccination drive on requested dates.',
    processed_at: '2026-11-16T14:00:00Z',
    created_at: '2026-11-16T08:30:00Z',
  },
  {
    id: 5,
    user_id: null,
    employee_name: 'Lourdes Mendoza',
    leave_type: 'Special Privilege Leave',
    other_leave_type: null,
    start_date: '2026-12-10',
    end_date: '2026-12-11',
    total_days: 2.0,
    reason: 'Personal milestone celebration (Civil Service benefit).',
    status: 'PENDING',
    dss_recommendation: 'RECOMMENDED (Statutory leave category; coverage satisfied)',
    created_by_admin_id: 'a0000000-0000-0000-0000-000000000002',
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-11-16T11:00:00Z',
  },
]

export const LeaveMonitorHub: React.FC = () => {
  const { currentUser, availableProfiles } = useDevRole()

  const canDecide = ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)
  const isStaff = currentUser.role === 'STAFF'

  const [records, setRecords] = useState<LeaveApplication[]>(DEMO_LEAVE_RECORDS)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Decision Modal State
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null)
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Details Modal
  const [viewDetailsApp, setViewDetailsApp] = useState<LeaveApplication | null>(null)

  const fetchRecords = async () => {
    setIsLoading(true)
    try {
      let query = supabase.from('leave_applications').select('*').order('created_at', { ascending: false })

      // If acting as regular STAFF, automatically isolate to own records
      if (isStaff) {
        query = query.eq('user_id', currentUser.id)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Could not query leave_applications, using demo dataset:', error.message)
        setRecords(
          isStaff ? DEMO_LEAVE_RECORDS.filter((r) => r.user_id === currentUser.id) : DEMO_LEAVE_RECORDS
        )
      } else if (data && data.length > 0) {
        setRecords(data)
      } else {
        setRecords([])
      }
    } catch (err) {
      console.warn('Query exception:', err)
      setRecords(DEMO_LEAVE_RECORDS)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [currentUser.id, currentUser.role])

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search
      const searchMatch =
        !searchTerm.trim() ||
        (r.employee_name && r.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.reason && r.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(r.id).includes(searchTerm)

      // Status
      const statusMatch = statusFilter === 'ALL' || r.status === statusFilter

      // Category
      const categoryMatch = categoryFilter === 'ALL' || r.leave_type === categoryFilter

      // Employee
      const employeeMatch =
        employeeFilter === 'ALL' ||
        (employeeFilter === 'WALK_IN' ? r.user_id === null : r.user_id === employeeFilter)

      // Date Range (filters by start_date)
      const dateFromMatch = !dateFrom || r.start_date >= dateFrom
      const dateToMatch = !dateTo || r.start_date <= dateTo

      return searchMatch && statusMatch && categoryMatch && employeeMatch && dateFromMatch && dateToMatch
    })
  }, [records, searchTerm, statusFilter, categoryFilter, employeeFilter, dateFrom, dateTo])

  // Reset Filters
  const handleResetFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setEmployeeFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  // CSV Export
  const handleExportCsv = () => {
    exportToCsv(`mho_leave_applications_${new Date().toISOString().slice(0, 10)}`, filteredRecords, [
      { key: 'id', label: 'ID' },
      { key: 'employee_name', label: 'Employee Name' },
      { key: 'leave_type', label: 'Leave Category' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'total_days', label: 'Working Days' },
      { key: 'status', label: 'Status' },
      { key: 'dss_recommendation', label: 'DSS Recommendation' },
      { key: 'admin_remarks', label: 'Admin Remarks' },
      { key: 'created_at', label: 'Date Filed' },
    ])
  }

  // Handle Decision Confirmation
  const handleConfirmDecision = async (applicationId: number, remarks: string) => {
    setIsProcessing(true)
    try {
      if (decisionAction === 'APPROVE') {
        await supabase.rpc('approve_leave', {
          p_leave_id: applicationId,
          p_admin_id: currentUser.id,
          p_remarks: remarks || null,
        })
      } else {
        await supabase.rpc('reject_leave', {
          p_leave_id: applicationId,
          p_admin_id: currentUser.id,
          p_remarks: remarks || null,
        })
      }

      // Update local state
      setRecords((prev) =>
        prev.map((r) =>
          r.id === applicationId
            ? {
                ...r,
                status: decisionAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                admin_remarks: remarks || null,
                processed_by_admin_id: currentUser.id,
                processed_at: new Date().toISOString(),
              }
            : r
        )
      )

      setSelectedApp(null)
      setDecisionAction(null)
    } catch (err) {
      console.warn('RPC decision error, updating locally:', err)
      setRecords((prev) =>
        prev.map((r) =>
          r.id === applicationId
            ? {
                ...r,
                status: decisionAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
                admin_remarks: remarks || null,
              }
            : r
        )
      )
      setSelectedApp(null)
      setDecisionAction(null)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isStaff ? 'My Leave Applications' : 'Leave Monitoring Hub'}
          </h1>
          <p className="text-sm text-slate-500">
            {isStaff
              ? 'View personal filing history, active statuses, and decision logs.'
              : 'Multi-criteria monitoring, DSS analytics, and administrative management.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/leaves/apply"
            className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-2 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 transition-colors"
          >
            <PlusCircle className="h-4 w-4" />
            File Leave Request
          </Link>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-card space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5 text-teal-800">
            <Filter className="h-3.5 w-3.5 text-teal-700" />
            Query & Filter Criteria
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-teal-700 text-2xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Search Keywords</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, remark, or ID..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="APPROVED">APPROVED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Leave Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="ALL">All Categories</option>
              <option value="Vacation Leave">Vacation Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
              <option value="Special Privilege Leave">Special Privilege Leave</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Employee Filter (Only for Admins/HR) */}
          {!isStaff && (
            <div>
              <label className="block text-2xs font-semibold text-slate-500 mb-1">Employee</label>
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              >
                <option value="ALL">All Personnel</option>
                <option value="WALK_IN">Walk-in Only</option>
                {availableProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date From */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-800">
              Applications Registry ({filteredRecords.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            {isStaff ? 'Personal filings ledger' : 'Complete office records'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Date Range</th>
                <th className="px-4 py-3 text-center">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">DSS Advisory</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No leave applications found matching selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{r.employee_name || 'Walk-in Staff'}</div>
                      <div className="text-2xs text-slate-400 font-normal">
                        #APP-{r.id} {r.user_id === null && '&bull; Walk-in'}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">{r.leave_type}</span>
                      {r.other_leave_type && (
                        <div className="text-2xs text-slate-400">({r.other_leave_type})</div>
                      )}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-700">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {r.start_date} &rarr; {r.end_date}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-teal-800">
                      {r.total_days} d
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-2xs font-extrabold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : r.status === 'REJECTED'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <DssBadge recommendation={r.dss_recommendation} compact={true} />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewDetailsApp(r)}
                          title="View Details"
                          className="rounded-md border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>

                        {/* Inline Decision Actions for Admin/Head on Pending Applications */}
                        {canDecide && r.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedApp(r)
                                setDecisionAction('APPROVE')
                              }}
                              title="Approve Application"
                              className="rounded-md bg-emerald-50 border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-100"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedApp(r)
                                setDecisionAction('REJECT')
                              }}
                              title="Reject Application"
                              className="rounded-md bg-rose-50 border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-100"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Dialog Modal */}
      <DecisionDialog
        application={selectedApp}
        action={decisionAction}
        isOpen={Boolean(selectedApp && decisionAction)}
        isProcessing={isProcessing}
        onClose={() => {
          setSelectedApp(null)
          setDecisionAction(null)
        }}
        onConfirm={handleConfirmDecision}
      />

      {/* Details Inspector Modal */}
      {viewDetailsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Application Inspection</h3>
                <p className="text-xs text-slate-500">Reference #{viewDetailsApp.id}</p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-2xs font-extrabold ${
                  viewDetailsApp.status === 'APPROVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : viewDetailsApp.status === 'REJECTED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {viewDetailsApp.status}
              </span>
            </div>

            <div className="text-xs space-y-2.5 text-slate-700">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-slate-900">Employee:</span>{' '}
                  {viewDetailsApp.employee_name}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Category:</span>{' '}
                  {viewDetailsApp.leave_type}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Period:</span>{' '}
                  {viewDetailsApp.start_date} to {viewDetailsApp.end_date}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Duration:</span>{' '}
                  {viewDetailsApp.total_days} working days
                </div>
              </div>

              {viewDetailsApp.reason && (
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                  <span className="font-bold block text-slate-800 mb-0.5">Applicant Reason:</span>
                  <span className="italic">{viewDetailsApp.reason}</span>
                </div>
              )}

              {viewDetailsApp.dss_recommendation && (
                <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200">
                  <span className="font-bold block text-slate-800 mb-0.5">DSS Advisory Record:</span>
                  <span>{viewDetailsApp.dss_recommendation}</span>
                </div>
              )}

              {viewDetailsApp.admin_remarks && (
                <div className="rounded-xl bg-teal-50/70 p-3 border border-teal-200 text-teal-950">
                  <span className="font-bold block mb-0.5">Decision Review Remarks:</span>
                  <span>{viewDetailsApp.admin_remarks}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewDetailsApp(null)}
                className="rounded-full bg-slate-800 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default LeaveMonitorHub
