import React, { useState, useEffect, useMemo } from 'react'
import {
  ClipboardList,
  Download,
  Filter,
  Search,
  RotateCcw,
  Eye,
  PlusCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { exportToCsv } from '../../utils/csv'
import { DssBadge } from '../../components/DssBadge'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import type { Database } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

export const LeaveMonitorHub: React.FC = () => {
  const { currentUser, availableProfiles } = useDevRole()

  const isStaff = currentUser.role === 'STAFF'

  const [records, setRecords] = useState<LeaveApplication[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Details Modal
  const [viewDetailsApp, setViewDetailsApp] = useState<LeaveApplication | null>(null)

  const fetchRecords = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      let query = supabase.from('leave_applications').select('*').order('created_at', { ascending: false })

      if (isStaff) {
        query = query.eq('user_id', currentUser.id)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(error.message)
      }
      setRecords(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
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
      const searchMatch =
        !searchTerm.trim() ||
        (r.employee_name && r.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.reason && r.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        String(r.id).includes(searchTerm)

      const statusMatch = statusFilter === 'ALL' || r.status === statusFilter
      const categoryMatch = categoryFilter === 'ALL' || r.leave_type === categoryFilter
      const employeeMatch =
        employeeFilter === 'ALL' ||
        (employeeFilter === 'WALK_IN' ? r.user_id === null : r.user_id === employeeFilter)

      const dateFromMatch = !dateFrom || r.start_date >= dateFrom
      const dateToMatch = !dateTo || r.start_date <= dateTo

      return searchMatch && statusMatch && categoryMatch && employeeMatch && dateFromMatch && dateToMatch
    })
  }, [records, searchTerm, statusFilter, categoryFilter, employeeFilter, dateFrom, dateTo])

  const handleResetFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setCategoryFilter('ALL')
    setEmployeeFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  const handleExportCsv = () => {
    if (filteredRecords.length === 0) return
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Monitor"
        action={
          <>
            <button
              onClick={handleExportCsv}
              disabled={filteredRecords.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <Link
              to="/leaves/apply"
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              File Leave
            </Link>
          </>
        }
      />

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5 text-teal-800 uppercase tracking-wider text-2xs">
            <Filter className="h-3.5 w-3.5 text-teal-700" />
            Filter Criteria
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-teal-700 text-2xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-xs">
          <div className="lg:col-span-2">
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Search</label>
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

          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Category</label>
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
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-teal-700" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Applications Registry ({filteredRecords.length})
            </h2>
          </div>
          <span className="text-2xs text-slate-400">
            {isStaff ? 'Personal filings ledger' : 'Complete office records'}
          </span>
        </div>

        {isLoading ? (
          <LoadingState message="Loading leave applications..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={fetchRecords} />
        ) : filteredRecords.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No applications found"
              description="No applications match the current filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-2xs">
                <tr>
                  <th className="px-4 py-2.5">Applicant</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Date Range</th>
                  <th className="px-4 py-2.5 text-center">Duration</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">DSS Advisory</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">
                        {r.employee_name || 'Walk-in Personnel'}
                      </div>
                      <div className="text-2xs text-slate-400 font-mono">#APP-{r.id}</div>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-2xs font-medium">
                        {r.leave_type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-2xs text-slate-600">
                      {r.start_date} to {r.end_date}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-teal-800 text-2xs">
                      {r.total_days} d
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-2xs font-bold ${
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
                    <td className="px-4 py-2.5">
                      <DssBadge recommendation={r.dss_recommendation} />
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={() => setViewDetailsApp(r)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-2.5 py-1 text-2xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-3 w-3" /> Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewDetailsApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                Application #{viewDetailsApp.id} Details
              </h3>
              <DssBadge recommendation={viewDetailsApp.dss_recommendation} />
            </div>

            <div className="text-xs space-y-2 text-slate-700">
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
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                  <span className="font-bold block text-slate-800 text-2xs mb-0.5">Applicant Reason:</span>
                  <span className="italic">{viewDetailsApp.reason}</span>
                </div>
              )}

              {viewDetailsApp.dss_recommendation && (
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-200">
                  <span className="font-bold block text-slate-800 text-2xs mb-0.5">DSS Advisory Record:</span>
                  <span>{viewDetailsApp.dss_recommendation}</span>
                </div>
              )}

              {viewDetailsApp.admin_remarks && (
                <div className="rounded-lg bg-teal-50 p-2 border border-teal-200 text-teal-950">
                  <span className="font-bold block text-2xs mb-0.5">Decision Review Remarks:</span>
                  <span>{viewDetailsApp.admin_remarks}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewDetailsApp(null)}
                className="rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-teal-800 transition-colors"
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
