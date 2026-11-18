import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ClipboardList,
  Download,
  Filter,
  Search,
  RotateCcw,
  Eye,
  PlusCircle,
  FileText,
  Calendar as CalendarViewIcon,
  Table as TableViewIcon,
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
import { LeaveTypeBadge } from '../../components/LeaveTypeBadge'
import { CSForm6DetailModal } from '../../components/CSForm6DetailModal'
import { LeaveCalendarView } from '../../components/LeaveCalendarView'
import { FALLBACK_LEAVE_TYPES, type LeaveTypeRecord, getLeaveTypeTheme } from '../../lib/leaveTypes'
import { useSystemSettings } from '../../lib/systemSettings'
import { toDateString } from '../../utils/calendarUtils'
import type { Database } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

export const LeaveMonitorHub: React.FC = () => {
  const { currentUser, availableProfiles } = useDevRole()
  const { settings } = useSystemSettings()

  const isStaff = currentUser.role === 'STAFF'
  const canAccessCalendar = currentUser.role === 'MHO_ADMIN' || currentUser.role === 'MHO_HEAD'

  const [activeView, setActiveView] = useState<'TABLE' | 'CALENDAR'>('TABLE')
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date())
  const [calendarRecords, setCalendarRecords] = useState<LeaveApplication[]>([])
  const [isCalendarLoading, setIsCalendarLoading] = useState<boolean>(false)

  const [records, setRecords] = useState<LeaveApplication[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRecord[]>(FALLBACK_LEAVE_TYPES)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [employeeFilter, setEmployeeFilter] = useState<string>('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // CS Form 6 Details Modal
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
    let isMounted = true
    async function loadTypes() {
      try {
        const { data, error } = await supabase
          .from('leave_types')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (!error && data && data.length > 0 && isMounted) {
          setLeaveTypes(data as LeaveTypeRecord[])
        }
      } catch (e) {
        console.warn('Using fallback leave types in monitor:', e)
      }
    }
    loadTypes()
    return () => {
      isMounted = false
    }
  }, [])

  // Fetch leaves overlapping the current calendar month view
  const fetchCalendarRecords = useCallback(async (targetDate: Date) => {
    setIsCalendarLoading(true)
    try {
      const year = targetDate.getFullYear()
      const month = targetDate.getMonth()
      const firstOfMonth = new Date(year, month, 1)
      const lastOfMonth = new Date(year, month + 1, 0)

      const startRangeStr = toDateString(firstOfMonth)
      const endRangeStr = toDateString(lastOfMonth)

      // Query for leaves overlapping [startRangeStr, endRangeStr]:
      // start_date <= endRangeStr AND end_date >= startRangeStr
      let query = supabase
        .from('leave_applications')
        .select('*')
        .lte('start_date', endRangeStr)
        .gte('end_date', startRangeStr)
        .order('start_date', { ascending: true })

      if (isStaff) {
        query = query.eq('user_id', currentUser.id)
      }

      const { data, error } = await query
      if (error) throw new Error(error.message)
      setCalendarRecords(data || [])
    } catch (err) {
      console.warn('Error loading calendar month range:', err)
      // Fallback to currently filtered table records
      setCalendarRecords(records)
    } finally {
      setIsCalendarLoading(false)
    }
  }, [currentUser.id, isStaff, records])

  useEffect(() => {
    fetchRecords()
  }, [currentUser.id, currentUser.role])

  useEffect(() => {
    if (activeView === 'CALENDAR') {
      fetchCalendarRecords(calendarDate)
    }
  }, [activeView, calendarDate, fetchCalendarRecords])

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search term
      const matchesSearch =
        !searchTerm.trim() ||
        (r.employee_name && r.employee_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.control_number && r.control_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.reason && r.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (r.other_leave_type && r.other_leave_type.toLowerCase().includes(searchTerm.toLowerCase()))

      // Status
      const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter

      // Category
      const matchesCategory = categoryFilter === 'ALL' || r.leave_type === categoryFilter

      // Employee
      const matchesEmployee = employeeFilter === 'ALL' || r.user_id === employeeFilter

      // Date range
      const matchesDateFrom = !dateFrom || r.start_date >= dateFrom
      const matchesDateTo = !dateTo || r.end_date <= dateTo

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCategory &&
        matchesEmployee &&
        matchesDateFrom &&
        matchesDateTo
      )
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
      { key: 'control_number', label: 'Control Number' },
      { key: 'id', label: 'ID' },
      { key: 'employee_name', label: 'Employee Name' },
      { key: 'position_at_filing', label: 'Position' },
      { key: 'leave_type', label: 'Leave Category' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'working_days', label: 'Working Days' },
      { key: 'commutation', label: 'Commutation' },
      { key: 'status', label: 'Status' },
      { key: 'dss_recommendation', label: 'DSS Recommendation' },
      { key: 'admin_remarks', label: 'Admin Remarks' },
      { key: 'date_of_filing', label: 'Date Filed' },
    ])
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Monitor Hub"
        action={
          <div className="flex items-center gap-2">
            {/* View Toggle (Only visible to MHO_ADMIN and MHO_HEAD) */}
            {canAccessCalendar && (
              <div className="inline-flex items-center rounded-full border border-slate-300 bg-white p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setActiveView('TABLE')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    activeView === 'TABLE'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableViewIcon className="h-3.5 w-3.5" />
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView('CALENDAR')}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    activeView === 'CALENDAR'
                      ? 'bg-teal-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CalendarViewIcon className="h-3.5 w-3.5" />
                  Calendar
                </button>
              </div>
            )}

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
              New Application
            </Link>
          </div>
        }
      />

      {/* Main View: Calendar or Table */}
      {activeView === 'CALENDAR' && canAccessCalendar ? (
        <LeaveCalendarView
          currentDate={calendarDate}
          onDateChange={(d) => setCalendarDate(d)}
          applications={calendarRecords}
          leaveTypes={leaveTypes}
          minDutyStaffThreshold={settings.min_duty_staff || 2}
          onViewApplication={(app) => setViewDetailsApp(app)}
          isLoading={isCalendarLoading}
        />
      ) : (
        <>
          {/* Filter Toolbar (Table view specific) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search employee, control #, reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-hidden transition-all"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden transition-all"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden transition-all"
                >
                  <option value="ALL">All Categories</option>
                  {leaveTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} - {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Filter (Admins only) */}
              {!isStaff && (
                <div>
                  <select
                    value={employeeFilter}
                    onChange={(e) => setEmployeeFilter(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden transition-all"
                  >
                    <option value="ALL">All Staff</option>
                    {availableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reset Filters */}
              <div className="flex items-center">
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              </div>
            </div>

            {/* Date Sub-Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Date Range:</span>
              <div className="flex items-center gap-1.5">
                <span>From:</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-2xs text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span>To:</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-2xs text-slate-900 focus:bg-white focus:outline-hidden"
                />
              </div>
              <span className="ml-auto text-slate-400 font-medium">
                Showing {filteredRecords.length} of {records.length} applications
              </span>
            </div>
          </div>

          {/* Main Table / State View */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
            {isLoading ? (
              <div className="p-8">
                <LoadingState message="Loading leave applications directory..." />
              </div>
            ) : errorMessage ? (
              <div className="p-8">
                <ErrorState message={errorMessage} onRetry={fetchRecords} />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Applications Found"
                  description="No leave records matched your applied search criteria."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold text-2xs uppercase tracking-wider">
                      <th className="py-3 px-4">Control #</th>
                      <th className="py-3 px-4">Applicant</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Working Days</th>
                      <th className="py-3 px-4">DSS Status</th>
                      <th className="py-3 px-4">Final Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((r) => {
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <span className="font-mono font-semibold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded text-2xs">
                              {r.control_number || `Leave-${r.id}`}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{r.employee_name}</div>
                            {r.position_at_filing && (
                              <div className="text-3xs text-slate-500">{r.position_at_filing}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <LeaveTypeBadge codeOrName={r.leave_type} />
                            {r.other_leave_type && (
                              <span className="text-3xs text-slate-500 block mt-0.5 truncate max-w-[120px]">
                                {r.other_leave_type}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            <div>
                              {r.start_date} &rarr; {r.end_date}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {r.working_days ?? r.total_days} days
                          </td>
                          <td className="py-3 px-4">
                            <DssBadge recommendation={r.dss_recommendation} />
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold ${
                                r.status === 'APPROVED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : r.status === 'REJECTED'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {r.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => setViewDetailsApp(r)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-2.5 py-1 text-2xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Eye className="h-3 w-3" />
                              View CS Form 6
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* CS Form 6 Details Modal */}
      <CSForm6DetailModal
        application={viewDetailsApp}
        isOpen={Boolean(viewDetailsApp)}
        onClose={() => setViewDetailsApp(null)}
        officeName={settings.office_name}
        hrmoName={settings.hrmo_name}
        hrmoTitle={settings.hrmo_title}
        mhoName={settings.mho_name}
        mhoTitle={settings.mho_title}
      />
    </div>
  )
}
