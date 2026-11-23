import React, { useState, useEffect, useMemo } from 'react'
import {
  Shield,
  Printer,
  Download,
  Search,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { exportToCsv } from '../../utils/csv'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { AuditLogsSkeleton } from './AuditLogsSkeleton'
import { useSkeletonDelayedLoading } from '../../hooks/useSkeletonLoading'
import type { Tables } from '../../types/database.types'

type AuditLog = Tables<'audit_logs'>

interface EnrichedAuditLog extends AuditLog {
  [key: string]: unknown
  user_full_name?: string
  user_role?: string
}

export const AuditLogsScreen: React.FC = () => {
  const { availableProfiles } = useDevRole()

  const [logs, setLogs] = useState<EnrichedAuditLog[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const showSkeleton = useSkeletonDelayedLoading(isLoading)

  // Status Metrics
  const [totalApproved, setTotalApproved] = useState<number>(0)
  const [totalPending, setTotalPending] = useState<number>(0)
  const [totalRejected, setTotalRejected] = useState<number>(0)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('ALL')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const fetchAuditData = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const { data: apps } = await supabase.from('leave_applications').select('status')
      if (apps) {
        setTotalApproved(apps.filter((a) => a.status === 'APPROVED').length)
        setTotalPending(apps.filter((a) => a.status === 'PENDING').length)
        setTotalRejected(apps.filter((a) => a.status === 'REJECTED').length)
      }

      const { data: logsData, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      if (logsData) {
        const profileMap = new Map(availableProfiles.map((p) => [p.id, p]))
        const enriched: EnrichedAuditLog[] = logsData.map((l) => {
          const p = l.user_id ? profileMap.get(l.user_id) : null
          return {
            ...l,
            user_full_name: p ? p.full_name : 'Unassigned / System',
            user_role: p ? p.role : 'SYSTEM',
          }
        })
        setLogs(enriched)
      } else {
        setLogs([])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAuditData()
  }, [availableProfiles])

  const availableActionTypes = useMemo(() => {
    const set = new Set<string>()
    logs.forEach((l) => {
      if (l.action_type) set.add(l.action_type)
    })
    return Array.from(set).sort()
  }, [logs])

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

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize))
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredLogs.slice(startIndex, startIndex + pageSize)
  }, [filteredLogs, currentPage, pageSize])

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

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) return
    exportToCsv(
      `mho_audit_logs_${new Date().toISOString().slice(0, 10)}`,
      filteredLogs,
      [
        { key: 'id', label: 'Log ID' },
        { key: 'created_at', label: 'Timestamp' },
        { key: 'user_full_name', label: 'User' },
        { key: 'user_role', label: 'Role' },
        { key: 'action_type', label: 'Action Type' },
        { key: 'description', label: 'Description' },
        { key: 'ip_address', label: 'IP Address' },
      ]
    )
  }

  const getActionBadgeColor = (action: string) => {
    if (action.includes('APPROVED')) return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    if (action.includes('REJECTED')) return 'bg-red-50 text-red-800 border-red-200'
    if (action.includes('PENDING') || action.includes('SUBMIT')) return 'bg-amber-50 text-amber-800 border-amber-200'
    return 'bg-teal-50 text-teal-800 border-teal-200'
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        action={
          <>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button
              onClick={handleExportCsv}
              disabled={filteredLogs.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          </>
        }
      />

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold text-slate-500 uppercase">Approved Leaves</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{totalApproved}</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold text-slate-500 uppercase">Pending In Queue</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{totalPending}</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <div className="text-2xs font-bold text-slate-500 uppercase">Disapproved / Rejected</div>
            <div className="text-2xl font-black text-rose-600 mt-1">{totalRejected}</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
            <XCircle className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <span className="text-teal-800 uppercase tracking-wider text-2xs font-semibold">
            Filter Logs
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-teal-700 text-2xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
          <div className="lg:col-span-2">
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Search</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Description, user, action, IP..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">User</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="ALL">All Users</option>
              {availableProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Action</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="ALL">All Actions</option>
              {availableActionTypes.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>

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
            <Shield className="h-4 w-4 text-teal-700" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Audit Ledger ({filteredLogs.length})
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xs text-slate-500">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-slate-300 bg-slate-50 px-2 py-0.5 text-2xs text-slate-800 focus:outline-hidden"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {showSkeleton ? (
          <AuditLogsSkeleton />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={fetchAuditData} />
        ) : filteredLogs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No audit entries"
              description="No audit logs recorded matching your filter criteria."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-2xs">
                  <tr>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5">User</th>
                    <th className="px-4 py-2.5">Action</th>
                    <th className="px-4 py-2.5">Description</th>
                    <th className="px-4 py-2.5">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-mono text-2xs text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{log.user_full_name}</div>
                        <div className="text-2xs text-slate-400">{log.user_role}</div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-2xs font-bold border ${getActionBadgeColor(
                            log.action_type
                          )}`}
                        >
                          {log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 max-w-md text-slate-800 text-xs">
                        {log.description}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-2xs text-slate-400 whitespace-nowrap">
                        {log.ip_address || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-3 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-600 bg-slate-50/50">
              <div>
                Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({filteredLogs.length} entries)
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3 w-3" /> Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AuditLogsScreen
