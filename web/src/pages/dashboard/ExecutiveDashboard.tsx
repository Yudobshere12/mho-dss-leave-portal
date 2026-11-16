import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Users,
  ShieldAlert,
  Calendar,
  Download,
  PlusCircle,
  ArrowRight,
  TrendingUp,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { exportToCsv } from '../../utils/csv'
import { DssBadge } from '../../components/DssBadge'
import type { Database, LeaveType } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

const DEMO_APPLICATIONS: LeaveApplication[] = [
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
    reason: 'Acute gastroenteritis with medical cert.',
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
    admin_remarks: 'Disapproved due to mass vaccination drive on requested dates.',
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
    reason: 'Personal milestone celebration.',
    status: 'PENDING',
    dss_recommendation: 'RECOMMENDED (Statutory leave category; coverage satisfied)',
    created_by_admin_id: 'a0000000-0000-0000-0000-000000000002',
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-11-16T11:00:00Z',
  },
]

export const ExecutiveDashboard: React.FC = () => {
  const { currentUser, availableProfiles } = useDevRole()

  const isStaff = currentUser.role === 'STAFF'
  const isManagement = ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'].includes(currentUser.role)

  const [applications, setApplications] = useState<LeaveApplication[]>(DEMO_APPLICATIONS)
  const [minStaffThreshold, setMinStaffThreshold] = useState<number>(2)

  // Fetch applications & settings
  useEffect(() => {
    async function loadData() {
      try {
        const { data: appsData } = await supabase
          .from('leave_applications')
          .select('*')
          .order('created_at', { ascending: false })

        if (appsData && appsData.length > 0) {
          setApplications(appsData)
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: settingData } = await (supabase as any)
          .from('system_settings')
          .select('value')
          .eq('key', 'min_duty_staff')
          .single()

        if (settingData && settingData.value) {
          setMinStaffThreshold(parseInt(settingData.value, 10))
        }
      } catch (err) {
        console.warn('Dashboard fetch fallback to demo records:', err)
      }
    }
    loadData()
  }, [])

  // Stat Metrics
  const stats = useMemo(() => {
    const total = applications.length
    const pending = applications.filter((a) => a.status === 'PENDING').length
    const approved = applications.filter((a) => a.status === 'APPROVED').length
    const rejected = applications.filter((a) => a.status === 'REJECTED').length

    // Category breakdown
    const categoryMap: Record<string, number> = {}
    applications.forEach((a) => {
      categoryMap[a.leave_type] = (categoryMap[a.leave_type] || 0) + 1
    })

    const categories = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // Upcoming approved leaves (sorted by start_date ascending)
    const upcomingApproved = applications
      .filter((a) => a.status === 'APPROVED')
      .sort((a, b) => a.start_date.localeCompare(b.start_date))

    // 5 Most recent submissions
    const recentSubmissions = applications.slice(0, 5)

    return {
      total,
      pending,
      approved,
      rejected,
      categories,
      upcomingApproved,
      recentSubmissions,
    }
  }, [applications])

  // Staffing Coverage Analytics
  const staffingCoverage = useMemo(() => {
    const totalActiveStaff = availableProfiles.filter(
      (p) => p.role === 'STAFF' && p.is_active
    ).length

    // Count distinct staff with currently overlapping approved leaves for today
    const todayStr = '2026-11-16' // Anchored to current simulated portal date
    const onLeaveToday = applications.filter(
      (a) =>
        a.status === 'APPROVED' &&
        a.user_id !== null &&
        a.start_date <= todayStr &&
        a.end_date >= todayStr
    )

    const onLeaveCount = new Set(onLeaveToday.map((a) => a.user_id)).size
    const currentOnDuty = Math.max(0, totalActiveStaff - onLeaveCount)
    const isUnderThreshold = currentOnDuty < minStaffThreshold

    return {
      totalActiveStaff,
      onLeaveCount,
      currentOnDuty,
      isUnderThreshold,
      minThreshold: minStaffThreshold,
    }
  }, [availableProfiles, applications, minStaffThreshold])

  // Export Summary CSV
  const handleExportSummaryCsv = () => {
    exportToCsv(
      `mho_executive_summary_${new Date().toISOString().slice(0, 10)}`,
      applications,
      [
        { key: 'id', label: 'ID' },
        { key: 'employee_name', label: 'Employee Name' },
        { key: 'leave_type', label: 'Category' },
        { key: 'start_date', label: 'Start Date' },
        { key: 'end_date', label: 'End Date' },
        { key: 'total_days', label: 'Working Days' },
        { key: 'status', label: 'Status' },
        { key: 'dss_recommendation', label: 'DSS Recommendation' },
        { key: 'created_at', label: 'Date Filed' },
      ]
    )
  }

  // Color palette for category doughnut simulation
  const categoryColors = [
    '#2563eb', // Blue
    '#eab308', // Amber
    '#10b981', // Emerald
    '#f43f5e', // Rose
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {isStaff ? 'Employee Leave Overview' : 'Executive Overview & Analytics'}
          </h1>
          <p className="text-sm text-slate-500">
            {isStaff
              ? 'Your leave credit allocations, filing records, and duty schedule.'
              : 'Real-time DSS health, staffing duty coverage, and leave category breakdown.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportSummaryCsv}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Export Overview CSV
          </button>
          <Link
            to="/leaves/apply"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <PlusCircle className="h-4 w-4" />
            File Leave Request
          </Link>
        </div>
      </div>

      {/* Credits Overview Card (Personal Balance for Staff / Summary for Admin) */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <span className="text-2xs font-bold uppercase tracking-wider text-blue-600">
              Leave Balance Summary &bull; Acting as {currentUser.full_name} ({currentUser.role})
            </span>
            <div className="text-sm text-slate-600 mt-0.5">
              Net available leave days authorized by Municipal Health Office policy.
            </div>
          </div>
          <div className="flex gap-4">
            <div className="rounded-lg bg-white/90 border border-blue-200/80 px-4 py-2 text-center shadow-2xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Vacation (VL)</div>
              <div className="text-xl font-black text-blue-700">
                {currentUser.vacation_credits.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg bg-white/90 border border-emerald-200/80 px-4 py-2 text-center shadow-2xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Sick (SL)</div>
              <div className="text-xl font-black text-emerald-700">
                {currentUser.sick_credits.toFixed(2)}
              </div>
            </div>
            <div className="rounded-lg bg-white/90 border border-amber-200/80 px-4 py-2 text-center shadow-2xs">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Emergency (EL)</div>
              <div className="text-xl font-black text-amber-700">
                {currentUser.emergency_credits.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metric Stat Cards Row (Mirrors mho_portal/dashboard.php) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pending Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              Pending Review
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-amber-600">{stats.pending}</div>
          <div className="mt-1 flex items-center justify-between text-2xs text-slate-400">
            <span>Awaiting executive decision</span>
            {isManagement && (
              <Link to="/approvals" className="font-semibold text-amber-600 hover:underline">
                Review &rarr;
              </Link>
            )}
          </div>
        </div>

        {/* Approved Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              Approved Filings
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-emerald-600">{stats.approved}</div>
          <div className="mt-1 text-2xs text-slate-400">Credits adjusted & processed</div>
        </div>

        {/* Rejected Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              Rejected Requests
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
              <XCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-rose-600">{stats.rejected}</div>
          <div className="mt-1 text-2xs text-slate-400">Coverage or credit conflicts</div>
        </div>

        {/* Total Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
              Total Submissions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-blue-600">{stats.total}</div>
          <div className="mt-1 text-2xs text-slate-400">All registered records</div>
        </div>
      </div>

      {/* Staffing Coverage & DSS Duty Health (Rule 3.2 Live View) */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Healthcare Staffing Duty Coverage Monitor (DSS Engine)
            </h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-bold ${
              staffingCoverage.isUnderThreshold
                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            {staffingCoverage.isUnderThreshold ? (
              <>
                <AlertTriangle className="h-3 w-3 text-rose-600" /> Under Min Threshold ({staffingCoverage.minThreshold})
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Staffing Requirement Satisfied
              </>
            )}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <span className="text-slate-500 font-semibold block text-2xs uppercase">Active Staff Pool</span>
            <span className="text-2xl font-extrabold text-slate-900">
              {staffingCoverage.totalActiveStaff}
            </span>
            <span className="block text-slate-400 text-2xs mt-1">Health personnel</span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <span className="text-slate-500 font-semibold block text-2xs uppercase">On Approved Leave</span>
            <span className="text-2xl font-extrabold text-amber-600">
              {staffingCoverage.onLeaveCount}
            </span>
            <span className="block text-slate-400 text-2xs mt-1">Personnel out today</span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <span className="text-slate-500 font-semibold block text-2xs uppercase">Duty Coverage</span>
            <span
              className={`text-2xl font-extrabold ${
                staffingCoverage.isUnderThreshold ? 'text-rose-600' : 'text-emerald-600'
              }`}
            >
              {staffingCoverage.currentOnDuty}
            </span>
            <span className="block text-slate-400 text-2xs mt-1">Projected available</span>
          </div>

          <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-200">
            <span className="text-slate-500 font-semibold block text-2xs uppercase">Safety Threshold</span>
            <span className="text-2xl font-extrabold text-blue-700">
              {staffingCoverage.minThreshold}
            </span>
            <span className="block text-slate-400 text-2xs mt-1">Min active staff floor</span>
          </div>
        </div>
      </div>

      {/* Middle Row: Leave Category Chart + Upcoming Approved Leaves */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category Breakdown Chart Card (7 cols) */}
        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Leave Category Distribution
              </h2>
            </div>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-semibold text-slate-600">
              Real-time DSS
            </span>
          </div>

          {stats.categories.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No leave categories recorded yet.
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {/* Category Bar Chart Visualization */}
              {stats.categories.map((cat, idx) => {
                const percentage = Math.round((cat.count / stats.total) * 100)
                const color = categoryColors[idx % categoryColors.length]
                return (
                  <div key={cat.name} className="space-y-1 text-xs">
                    <div className="flex justify-between items-center text-slate-700">
                      <span className="font-semibold flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {cat.name}
                      </span>
                      <span className="font-bold">
                        {cat.count} application(s) &bull; {percentage}%
                      </span>
                    </div>
                    {/* Bar */}
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Upcoming Approved Leaves (5 cols) */}
        <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Upcoming Approved Leaves
              </h2>
            </div>
            <Link
              to="/admin/leaves"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              All &rarr;
            </Link>
          </div>

          {stats.upcomingApproved.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No approved leaves on upcoming roster.
            </div>
          ) : (
            <div className="space-y-3">
              {stats.upcomingApproved.slice(0, 4).map((app) => (
                <div
                  key={app.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>{app.employee_name || 'Walk-in Personnel'}</span>
                    <span className="text-2xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full font-semibold">
                      {app.total_days} days
                    </span>
                  </div>
                  <div className="text-slate-600 flex items-center gap-1.5 text-2xs">
                    <span className="font-medium text-slate-800">{app.leave_type}</span>
                    <span>&bull;</span>
                    <span>
                      {app.start_date} to {app.end_date}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Table: Recent Filings Registry (Mirrors dashboard.php recent submissions) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">5 Most Recent Submissions</h2>
          </div>
          <Link
            to="/admin/leaves"
            className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
          >
            Open Complete Leave Monitor <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Employee Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Working Days</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats.recentSubmissions.map((rf) => (
                <tr key={rf.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {rf.employee_name || 'Walk-in Personnel'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-medium text-slate-700">
                      {rf.leave_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-700">{rf.total_days} d</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-2xs font-extrabold ${
                        rf.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : rf.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {rf.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-2xs">
                    {new Date(rf.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
export default ExecutiveDashboard
