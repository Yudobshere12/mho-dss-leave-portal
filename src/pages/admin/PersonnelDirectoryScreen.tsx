import React, { useState } from 'react'
import { Users, Search, Download, Settings, RotateCcw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { exportToCsv } from '../../utils/csv'
import { useDevRole } from '../../context/DevRoleContext'
import { useAuth } from '../../context/AuthContext'
import { isActionAllowed } from '../../lib/permissions'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'

interface PersonnelRow {
  [key: string]: unknown
  id: string
  full_name: string
  email: string
  role: string
  position: string | null
  is_active: boolean
  vacation_credits: number
  sick_credits: number
  emergency_credits: number
  vacation_used: number
  sick_used: number
  emergency_used: number
}

async function fetchPersonnel(): Promise<PersonnelRow[]> {
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, position, is_active, vacation_credits, sick_credits, emergency_credits')
    .order('full_name')

  if (pe) throw pe

  const { data: balances, error: be } = await supabase
    .from('leave_balances')
    .select('user_id, vacation_credits, sick_credits, emergency_credits')

  if (be) throw be

  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const { data: approved, error: ae } = await supabase
    .from('leave_applications')
    .select('user_id, leave_type, total_days')
    .eq('status', 'APPROVED')
    .gte('start_date', yearStart)

  if (ae) throw ae

  const balanceMap: Record<string, { vacation: number; sick: number; emergency: number }> = {}
  for (const b of balances ?? []) {
    balanceMap[b.user_id] = {
      vacation: Number(b.vacation_credits),
      sick: Number(b.sick_credits),
      emergency: Number(b.emergency_credits),
    }
  }

  const usageMap: Record<string, Record<string, number>> = {}
  for (const a of approved ?? []) {
    const uid = a.user_id
    if (!uid) continue
    if (!usageMap[uid]) usageMap[uid] = {}
    const leaveKey =
      a.leave_type === 'Vacation Leave'
        ? 'vacation'
        : a.leave_type === 'Sick Leave'
        ? 'sick'
        : a.leave_type === 'Emergency Leave'
        ? 'emergency'
        : 'other'
    usageMap[uid][leaveKey] = (usageMap[uid][leaveKey] ?? 0) + Number(a.total_days)
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    role: p.role,
    position: p.position,
    is_active: p.is_active,
    vacation_credits: balanceMap[p.id]?.vacation ?? p.vacation_credits,
    sick_credits: balanceMap[p.id]?.sick ?? p.sick_credits,
    emergency_credits: balanceMap[p.id]?.emergency ?? p.emergency_credits,
    vacation_used: usageMap[p.id]?.['vacation'] ?? 0,
    sick_used: usageMap[p.id]?.['sick'] ?? 0,
    emergency_used: usageMap[p.id]?.['emergency'] ?? 0,
  }))
}

const CreditCell: React.FC<{ credits: number; used: number; color: string }> = ({
  credits,
  used,
  color,
}) => {
  const remaining = credits - used
  const pct = credits > 0 ? Math.max(0, Math.min(1, remaining / credits)) : 0
  return (
    <td className="px-4 py-2.5 text-center">
      <div className={`font-bold text-xs ${color}`}>{remaining.toFixed(1)}</div>
      <div className="text-2xs text-slate-400">of {credits.toFixed(1)}</div>
      <div className="mt-1 h-1 w-12 mx-auto rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct < 0.3 ? 'bg-red-400' : pct < 0.6 ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </td>
  )
}

const ROLE_COLORS: Record<string, string> = {
  MHO_HEAD: 'bg-teal-50 text-teal-800 border border-teal-200',
  MHO_ADMIN: 'bg-teal-100 text-teal-900 border border-teal-300',
  LGU_HR: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  STAFF: 'bg-slate-100 text-slate-700 border border-slate-200',
}

export const PersonnelDirectoryScreen: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useDevRole()
  const { role: authRole } = useAuth()
  const activeRole = authRole || currentUser.role
  const canManagePersonnel = isActionAllowed(activeRole, 'personnel:manage')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const { data, isLoading, isError, error, refetch } = useQuery<PersonnelRow[]>({
    queryKey: ['personnel-directory'],
    queryFn: fetchPersonnel,
    retry: 1,
  })

  const rows = data ?? []

  const filtered = rows.filter((p) => {
    const matchSearch =
      search.trim() === '' ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      (p.position ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || p.role === roleFilter
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.is_active) ||
      (statusFilter === 'inactive' && !p.is_active)
    return matchSearch && matchRole && matchStatus
  })

  const handleExportCsv = () => {
    if (filtered.length === 0) return
    exportToCsv(
      `mho_personnel_directory_${new Date().toISOString().slice(0, 10)}`,
      filtered,
      [
        { key: 'full_name', label: 'Full Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'position', label: 'Position' },
        { key: 'vacation_credits', label: 'Vacation Credits' },
        { key: 'vacation_used', label: 'Vacation Used' },
        { key: 'sick_credits', label: 'Sick Credits' },
        { key: 'sick_used', label: 'Sick Used' },
        { key: 'emergency_credits', label: 'Emergency Credits' },
        { key: 'emergency_used', label: 'Emergency Used' },
        { key: 'is_active', label: 'Active Status' },
      ]
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personnel Directory"
        action={
          <>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
            {canManagePersonnel && (
              <button
                onClick={() => navigate('/admin/users')}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 transition-colors"
              >
                <Settings className="h-3.5 w-3.5" />
                Manage Users
              </button>
            )}
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, position…"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
        >
          <option value="all">All Roles</option>
          <option value="MHO_HEAD">MHO Head</option>
          <option value="MHO_ADMIN">MHO Admin</option>
          <option value="LGU_HR">LGU HR</option>
          <option value="STAFF">Staff</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-teal-700" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Health Personnel</h2>
          </div>
          <span className="text-2xs text-slate-500 font-medium">
            {filtered.length} of {rows.length} accounts
          </span>
        </div>

        {isLoading ? (
          <LoadingState message="Loading personnel records..." />
        ) : isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : 'Failed to query personnel data.'}
            onRetry={() => refetch()}
          />
        ) : filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No personnel found"
              description="No employee records match the selected filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-2xs">
                <tr>
                  <th className="px-4 py-2.5">Full Name</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Position</th>
                  <th className="px-4 py-2.5 text-center">Vacation Left</th>
                  <th className="px-4 py-2.5 text-center">Sick Left</th>
                  <th className="px-4 py-2.5 text-center">Emergency Left</th>
                  <th className="px-4 py-2.5">Status</th>
                  {canManagePersonnel && <th className="px-4 py-2.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{p.full_name}</div>
                      <div className="text-slate-400 text-2xs">{p.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded-md px-2 py-0.5 text-2xs font-bold ${
                          ROLE_COLORS[p.role] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 text-2xs">{p.position || '—'}</td>
                    <CreditCell
                      credits={p.vacation_credits}
                      used={p.vacation_used}
                      color="text-teal-800"
                    />
                    <CreditCell
                      credits={p.sick_credits}
                      used={p.sick_used}
                      color="text-emerald-700"
                    />
                    <CreditCell
                      credits={p.emergency_credits}
                      used={p.emergency_used}
                      color="text-amber-700"
                    />
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-2xs font-semibold ${
                          p.is_active
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canManagePersonnel && (
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => navigate('/admin/users')}
                          className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-2xs font-medium text-slate-600 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-800 transition-colors"
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default PersonnelDirectoryScreen
