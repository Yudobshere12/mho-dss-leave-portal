import React, { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  Printer,
  Download,
  Filter,
  Search,
  Calendar,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  User,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { exportToCsv } from '../../utils/csv'
import type { Database } from '../../types/database.types'

type AuditLog = Database['public']['Tables']['audit_logs']['Row']

interface EnrichedAuditLog extends AuditLog {
  user_full_name?: string
  user_role?: string
}

// Demo records for offline / disconnected dev preview
const DEMO_AUDIT_LOGS: EnrichedAuditLog[] = [
  {
    id: 1,
    user_id: 'a0000000-0000-0000-0000-000000000004',
    user_full_name: 'Juan dela Cruz',
    user_role: 'STAFF',
    action_type: 'LEAVE_APPROVED',
    description: 'Leave Application #1 (Vacation Leave - 3.0 days) status changed from PENDING to APPROVED.',
    ip_address: '192.168.1.10',
    created_at: '2026-10-28T09:30:00Z',
  },
  {
    id: 2,
    user_id: 'a0000000-0000-0000-0000-000000000005',
    user_full_name: 'Maria Santos',
    user_role: 'STAFF',
    action_type: 'LEAVE_APPROVED',
    description: 'Leave Application #2 (Sick Leave - 2.0 days) status changed from PENDING to APPROVED.',
    ip_address: '192.168.1.15',
    created_at: '2026-11-10T08:00:00Z',
  },
  {
    id: 3,
    user_id: 'a0000000-0000-0000-0000-000000000004',
    user_full_name: 'Juan dela Cruz',
    user_role: 'STAFF',
    action_type: 'LEAVE_REJECTED',
    description: 'Leave Application #4 (Emergency Leave - 2.0 days) status changed from PENDING to REJECTED.',
    ip_address: '192.168.1.15',
    created_at: '2026-11-16T14:00:00Z',
  },
  {
    id: 4,
    user_id: 'a0000000-0000-0000-0000-000000000002',
    user_full_name: 'Roberto Gomez',
    user_role: 'MHO_ADMIN',
    action_type: 'LEAVE_FILED_ON_BEHALF',
    description: 'Administrator Roberto Gomez submitted walk-in Leave Application #5 for Lourdes Mendoza (2.0 days).',
    ip_address: '127.0.0.1',
    created_at: '2026-11-16T11:00:00Z',
  },
  {
    id: 5,
    user_id: 'a0000000-0000-0000-0000-000000000006',
    user_full_name: 'Antonio Luna',
    user_role: 'STAFF',
    action_type: 'LEAVE_SUBMITTED',
    description: 'Leave Application #3 (Vacation Leave - 5.0 days) submitted by Antonio Luna.',
    ip_address: '192.168.1.20',
    created_at: '2026-11-15T10:20:00Z',
  },
]

export const AuditLogsScreen: React.FC = () => {
  const { availableProfiles } = useDevRole()

  const [logs, setLogs] = useState<EnrichedAuditLog[]>(DEMO_AUDIT_LOGS)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Status Metrics (Mirrors mho_portal/reports/audit_logs.php top cards)
  const [totalApproved, setTotalApproved] = useState<number>(2)
  const [totalPending, setTotalPending] = useState<number>(2)
  const [totalRejected, setTotalRejected] = useState<number>(1)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  useEffect(() => {
    async function fetchAuditData() {
      setIsLoading(true)
      try {
        // 1. Fetch counts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: apps } = await (supabase as any).from('leave_applications').select('status')
        if (apps) {
          setTotalApproved(apps.filter((a: { status: string }) => a.status === 'APPROVED').length)
          setTotalPending(apps.filter((a: { status: string }) => a.status === 'PENDING').length)
          setTotalRejected(apps.filter((a: { status: string }) => a.status === 'REJECTED').length)
        }

        // 2. Fetch audit logs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: logsData, error } = await (supabase as any)
          .from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.warn('Could not query audit_logs, using demo logs:', error.message)
          setLogs(DEMO_AUDIT_LOGS)
        } else if (logsData && logsData.length > 0) {
          const profileMap = new Map(availableProfiles.map((p) => [p.id, p]))
          const enriched: EnrichedAuditLog[] = (logsData as EnrichedAuditLog[]).map((l) => {
            const p = l.user_id ? profileMap.get(l.user_id) : null
            return {
              ...l,
              user_full_name: p ? p.full_name : 'Unassigned / System',
              user_role: p ? p.role : 'SYSTEM',
            }
          })
          setLogs(enriched)
        } else {
          setLogs(DEMO_AUDIT_LOGS)
        }
      } catch (err) {
        console.warn('Audit logs fetch exception:', err)
        setLogs(DEMO_AUDIT_LOGS)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuditData()
  }, [availableProfiles])

  // Distinct Action Types for Filter Dropdown
  const availableActionTypes = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => {
      if (l.action_type) set.add(l.action_type)
    })
    return Array.from(set).sort()
  }, [logs])

  // Filtered dataset
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const searchMatch =
        !searchTerm.trim() ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.user_full_name && log.user_full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.ip_address && log.ip_address.includes(searchTerm))

      const userMatch = userFilter === 'ALL' || log.user_id === userFilter

      const actionMatch = actionFilter === 'ALL' || log.action_type === actionFilter

      const logDate = log.created_at.slice(0, 10)
      const dateFromMatch = !dateFrom || logDate >= dateFrom
      const dateToMatch = !dateTo || logDate <= dateTo

      return searchMatch && userMatch && actionMatch && dateFromMatch && dateToMatch
    })
  }, [logs, searchTerm, userFilter, actionFilter, dateFrom, dateTo])

  // Paginated Slicing
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredLogs.slice(startIndex, startIndex + pageSize)
  }, [filteredLogs, currentPage, pageSize])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, userFilter, actionFilter, dateFrom, dateTo, pageSize])

  const handleResetFilters = () => {
    setSearchTerm('')
    setUserFilter('ALL')
    setActionFilter('ALL')
    setDateFrom('')
    setDateTo('')
  }

  // CSV Export
  const handleExportCsv = () => {
    exportToCsv(
      `mho_audit_logs_${new Date().toISOString().slice(0, 10)}`,
      filteredLogs as unknown as Record<string, unknown>[],
      [
        { key: 'id', label: 'Log ID' },
        { key: 'created_at', label: 'Timestamp' },
        { key: 'user_full_name', label: 'User / Actor' },
        { key: 'user_role', label: 'Role' },
        { key: 'action_type', label: 'Action Type' },
        { key: 'description', label: 'Event Description' },
        { key: 'ip_address', label: 'IP Address' },
      ]
    )
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes('APPROVED')) return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    if (action.includes('REJECTED')) return 'bg-rose-100 text-rose-800 border-rose-200'
    if (action.includes('PENDING') || action.includes('SUBMIT')) return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-blue-100 text-blue-800 border-blue-200'
  }

  return (
    <div className="space-y-6">
      {/* Header & Print/Export Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Audit Logs & Operational Analytics
          </h1>
          <p className="text-sm text-slate-500">
            Municipal Health Office of Manolo Fortich &bull; Transaction & decision audit trail.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            <Printer className="h-4 w-4" />
            Print Summary Report
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <Download className="h-4 w-4" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Analytics Summary Cards (Mirrors mho_portal/reports/audit_logs.php) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Approved Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs border-l-4 border-l-emerald-500">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
            Total Approved Leaves
          </span>
          <div className="mt-2 text-3xl font-black text-emerald-600">{totalApproved}</div>
          <div className="mt-1 text-2xs text-slate-400">Processed & deducted from balances</div>
        </div>

        {/* Pending Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs border-l-4 border-l-amber-500">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
            Pending Applications
          </span>
          <div className="mt-2 text-3xl font-black text-amber-600">{totalPending}</div>
          <div className="mt-1 text-2xs text-slate-400">In queue for executive review</div>
        </div>

        {/* Rejected Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs border-l-4 border-l-rose-500">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider">
            Rejected Applications
          </span>
          <div className="mt-2 text-3xl font-black text-rose-600">{totalRejected}</div>
          <div className="mt-1 text-2xs text-slate-400">Restricted by coverage or policy</div>
        </div>
      </div>

      {/* Query Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            Filter Audit Records
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-2xs font-semibold"
          >
            <RotateCcw className="h-3 w-3" /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Keyword Search */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Search Details</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Description, actor, or IP..."
                className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* User / Actor Filter */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">User / Subject</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">All Users</option>
              {availableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">All Actions</option>
              {availableActionTypes.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter Range */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Date Logged (From)</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Main Audit Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              System Activity & Transaction Trail ({filteredLogs.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Page {currentPage} of {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / Subject</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Event Narrative</th>
                <th className="px-4 py-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    No audit records match the specified query filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-2xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {log.user_full_name || 'System Actor'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-700">
                        {log.user_role || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-2xs font-extrabold border ${getActionBadgeColor(
                          log.action_type
                        )}`}
                      >
                        {log.action_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 max-w-md leading-relaxed">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-2xs">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-hidden"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries per page &bull; Total: {filteredLogs.length}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Previous
            </button>
            <span className="px-2 font-medium text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
export default AuditLogsScreen
