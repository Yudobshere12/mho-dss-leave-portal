import React, { useState, useEffect, useMemo } from 'react'
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
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
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import type { Database } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

export const ExecutiveDashboard: React.FC = () => {
  const { currentUser, availableProfiles } = useDevRole()

  const isStaff = currentUser.role === 'STAFF'
  const isManagement = ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'].includes(currentUser.role)

  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [minStaffThreshold, setMinStaffThreshold] = useState<number>(2)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const { data: appsData, error: appsError } = await supabase
        .from('leave_applications')
        .select('*')
        .order('created_at', { ascending: false })

      if (appsError) {
        throw new Error(appsError.message)
      }
      setApplications(appsData || [])

      const { data: settingData } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'min_duty_staff')
        .single()

      if (settingData && settingData.value) {
        setMinStaffThreshold(parseInt(settingData.value, 10))
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Stat Metrics
  const stats = useMemo(() => {
    const total = applications.length
    const pending = applications.filter((a) => a.status === 'PENDING').length
    const approved = applications.filter((a) => a.status === 'APPROVED').length
    const rejected = applications.filter((a) => a.status === 'REJECTED').length

    const categoryMap: Record<string, number> = {}
    applications.forEach((a) => {
      categoryMap[a.leave_type] = (categoryMap[a.leave_type] || 0) + 1
    })

    const categories = Object.entries(categoryMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    const upcomingApproved = applications
      .filter((a) => a.status === 'APPROVED')
      .sort((a, b) => a.start_date.localeCompare(b.start_date))

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

  // Staffing Coverage
  const staffingCoverage = useMemo(() => {
    const totalActiveStaff = availableProfiles.filter(
      (p) => p.role === 'STAFF' && p.is_active
    ).length

    const todayStr = new Date().toISOString().slice(0, 10)
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

  const handleExportSummaryCsv = () => {
    if (applications.length === 0) return
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

  const categoryColors = [
    '#0F766E',
    '#0D9488',
    '#14B8A6',
    '#059669',
    '#F59E0B',
    '#64748B',
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={isStaff ? 'Employee Leave Overview' : 'Executive Overview'}
        action={
          <>
            <button
              onClick={handleExportSummaryCsv}
              disabled={applications.length === 0}
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

      {/* Balance Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800">
              Leave Balances &bull; {currentUser.full_name} ({currentUser.role})
            </div>
            <div className="text-2xs text-slate-500 mt-0.5">
              Available authorized leave credits
            </div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-center min-w-[80px]">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Vacation</div>
              <div className="text-lg font-bold text-teal-800">
                {currentUser.vacation_credits.toFixed(1)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-center min-w-[80px]">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Sick</div>
              <div className="text-lg font-bold text-emerald-700">
                {currentUser.sick_credits.toFixed(1)}
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2 text-center min-w-[80px]">
              <div className="text-2xs font-semibold text-slate-500 uppercase">Emergency</div>
              <div className="text-lg font-bold text-amber-700">
                {currentUser.emergency_credits.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading dashboard records..." />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadData} />
      ) : (
        <>
          {/* Key Metric Stat Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-500 uppercase">Pending Review</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-600">{stats.pending}</div>
              {isManagement && (
                <div className="mt-1 text-2xs">
                  <Link to="/approvals" className="font-semibold text-amber-700 hover:underline">
                    Open Queue &rarr;
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-500 uppercase">Approved</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-600">{stats.approved}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-500 uppercase">Rejected</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                  <XCircle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-rose-600">{stats.rejected}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-500 uppercase">Total Submissions</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                  <FileText className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-teal-800">{stats.total}</div>
            </div>
          </div>

          {/* Duty Coverage */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-teal-700" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Duty Staff Coverage Monitor
                </h2>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-2xs font-bold ${
                  staffingCoverage.isUnderThreshold
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {staffingCoverage.isUnderThreshold ? (
                  <>
                    <AlertTriangle className="h-3 w-3 text-red-600" /> Under Min Threshold ({staffingCoverage.minThreshold})
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Staffing Satisfied
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-500 font-semibold block text-2xs uppercase">Staff Pool</span>
                <span className="text-xl font-bold text-slate-900">{staffingCoverage.totalActiveStaff}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-500 font-semibold block text-2xs uppercase">On Leave Today</span>
                <span className="text-xl font-bold text-amber-600">{staffingCoverage.onLeaveCount}</span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-500 font-semibold block text-2xs uppercase">On Duty</span>
                <span
                  className={`text-xl font-bold ${
                    staffingCoverage.isUnderThreshold ? 'text-red-600' : 'text-emerald-600'
                  }`}
                >
                  {staffingCoverage.currentOnDuty}
                </span>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
                <span className="text-slate-500 font-semibold block text-2xs uppercase">Min Threshold</span>
                <span className="text-xl font-bold text-teal-800">{staffingCoverage.minThreshold}</span>
              </div>
            </div>
          </div>

          {/* Middle Row: Distribution & Upcoming */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-teal-700" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Leave Category Distribution
                  </h2>
                </div>
              </div>

              {stats.categories.length === 0 ? (
                <EmptyState title="No leave applications yet" description="Applications filed will appear here." />
              ) : (
                <div className="space-y-3 pt-1">
                  {stats.categories.map((cat, idx) => {
                    const percentage = Math.round((cat.count / stats.total) * 100)
                    const color = categoryColors[idx % categoryColors.length]
                    return (
                      <div key={cat.name} className="space-y-1 text-xs">
                        <div className="flex justify-between items-center text-slate-700">
                          <span className="font-semibold flex items-center gap-2 text-2xs">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                            {cat.name}
                          </span>
                          <span className="font-bold text-2xs">
                            {cat.count} ({percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${percentage}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-teal-700" />
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Upcoming Approved Leaves
                  </h2>
                </div>
                <Link to="/admin/leaves" className="text-2xs font-semibold text-teal-700 hover:underline">
                  View All &rarr;
                </Link>
              </div>

              {stats.upcomingApproved.length === 0 ? (
                <EmptyState title="No upcoming leaves" description="Approved upcoming leaves will display here." />
              ) : (
                <div className="space-y-2">
                  {stats.upcomingApproved.slice(0, 4).map((app) => (
                    <div
                      key={app.id}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-semibold text-slate-900 text-2xs">
                        <span>{app.employee_name || 'Walk-in Personnel'}</span>
                        <span className="text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                          {app.total_days} d
                        </span>
                      </div>
                      <div className="text-slate-500 text-2xs">
                        {app.leave_type} &bull; {app.start_date} to {app.end_date}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Table: Recent Submissions */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-teal-700" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Recent Submissions
                </h2>
              </div>
              <Link
                to="/admin/leaves"
                className="text-2xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
              >
                All Records <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {stats.recentSubmissions.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No applications submitted" description="New applications will be listed here." />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-2xs">
                    <tr>
                      <th className="px-4 py-2.5">Employee Name</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Days</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Date Filed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {stats.recentSubmissions.map((rf) => (
                      <tr key={rf.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {rf.employee_name || 'Walk-in Personnel'}
                        </td>
                        <td className="px-4 py-2.5 text-2xs text-slate-600">{rf.leave_type}</td>
                        <td className="px-4 py-2.5 font-bold text-teal-800 text-2xs">{rf.total_days} d</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-2xs font-bold ${
                              rf.status === 'APPROVED'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : rf.status === 'REJECTED'
                                ? 'bg-red-50 text-red-800 border border-red-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {rf.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 font-mono text-2xs">
                          {new Date(rf.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default ExecutiveDashboard
