import React, { useState } from 'react'
import { Users, Search, Download, Settings, RefreshCw, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { exportToCsv } from '../../utils/csv'
import { useDevRole } from '../../context/DevRoleContext'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PersonnelRow {
  id: string
  full_name: string
  email: string
  role: string
  position: string | null
  is_active: boolean
  // from leave_balances (current allocations)
  vacation_credits: number
  sick_credits: number
  emergency_credits: number
  // computed: approved days used this year
  vacation_used: number
  sick_used: number
  emergency_used: number
}

// ─── Fallback demo data ───────────────────────────────────────────────────────

const FALLBACK_DEMO: PersonnelRow[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Dr. Maria Santos',
    email: 'maria.santos@mho.gov.ph',
    role: 'head',
    position: 'Municipal Health Officer',
    is_active: true,
    vacation_credits: 15,
    sick_credits: 15,
    emergency_credits: 3,
    vacation_used: 2,
    sick_used: 0,
    emergency_used: 0,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Rolando Cruz',
    email: 'rolando.cruz@mho.gov.ph',
    role: 'admin',
    position: 'Administrative Officer',
    is_active: true,
    vacation_credits: 15,
    sick_credits: 15,
    emergency_credits: 3,
    vacation_used: 3,
    sick_used: 1,
    emergency_used: 0,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Liza Reyes',
    email: 'liza.reyes@mho.gov.ph',
    role: 'hr',
    position: 'HR Officer',
    is_active: true,
    vacation_credits: 15,
    sick_credits: 15,
    emergency_credits: 3,
    vacation_used: 0,
    sick_used: 2,
    emergency_used: 1,
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    full_name: 'Juan dela Cruz',
    email: 'juan.delacruz@mho.gov.ph',
    role: 'staff',
    position: 'Public Health Nurse',
    is_active: true,
    vacation_credits: 15,
    sick_credits: 15,
    emergency_credits: 3,
    vacation_used: 5,
    sick_used: 3,
    emergency_used: 0,
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    full_name: 'Ana Gomez',
    email: 'ana.gomez@mho.gov.ph',
    role: 'staff',
    position: 'Midwife',
    is_active: true,
    vacation_credits: 15,
    sick_credits: 15,
    emergency_credits: 3,
    vacation_used: 0,
    sick_used: 0,
    emergency_used: 0,
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    full_name: 'Roberto Tan',
    email: 'roberto.tan@mho.gov.ph',
    role: 'staff',
    position: 'Sanitation Inspector',
    is_active: false,
    vacation_credits: 15,
    sick_credits: 15,
    emergency_credits: 3,
    vacation_used: 0,
    sick_used: 0,
    emergency_used: 0,
  },
]

// ─── Query ────────────────────────────────────────────────────────────────────

async function fetchPersonnel(): Promise<PersonnelRow[]> {
  // 1. Load all profiles
  const { data: profiles, error: pe } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, position, is_active, vacation_credits, sick_credits, emergency_credits')
    .order('full_name')

  if (pe) throw pe

  // 2. Load leave_balances (allocations)
  const { data: balances, error: be } = await supabase
    .from('leave_balances')
    .select('user_id, vacation_credits, sick_credits, emergency_credits')

  if (be) throw be

  // 3. Load approved leave_applications for current calendar year to compute usage
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const { data: approved, error: ae } = await supabase
    .from('leave_applications')
    .select('user_id, leave_type, total_days')
    .eq('status', 'APPROVED')
    .gte('start_date', yearStart)

  if (ae) throw ae

  // Build lookup maps from leave_balances (keyed by user_id)
  const balanceMap: Record<string, { vacation: number; sick: number; emergency: number }> = {}
  for (const b of balances ?? []) {
    balanceMap[b.user_id] = {
      vacation: Number(b.vacation_credits),
      sick: Number(b.sick_credits),
      emergency: Number(b.emergency_credits),
    }
  }

  // Build usage map from approved leave_applications
  const usageMap: Record<string, Record<string, number>> = {}
  for (const a of approved ?? []) {
    const uid = a.user_id
    if (!uid) continue
    if (!usageMap[uid]) usageMap[uid] = {}
    const leaveKey = a.leave_type === 'Vacation Leave'
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

// ─── Helper components ────────────────────────────────────────────────────────

const CreditCell: React.FC<{ credits: number; used: number; color: string }> = ({
  credits,
  used,
  color,
}) => {
  const remaining = credits - used
  const pct = credits > 0 ? Math.max(0, Math.min(1, remaining / credits)) : 0
  return (
    <td className="px-4 py-3 text-center">
      <div className={`font-bold text-sm ${color}`}>{remaining.toFixed(2)}</div>
      <div className="text-2xs text-slate-400">of {credits.toFixed(2)}</div>
      <div className="mt-1 h-1 w-16 mx-auto rounded-full bg-slate-200 overflow-hidden">
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
  head: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  hr: 'bg-teal-100 text-teal-800',
  staff: 'bg-slate-100 text-slate-700',
}

// ─── Main component ───────────────────────────────────────────────────────────

export const PersonnelDirectoryScreen: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useDevRole()
  const isPrivileged = ['MHO_HEAD', 'MHO_ADMIN', 'LGU_HR'].includes(currentUser.role)

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('active')

  const { data, isLoading, isError, refetch } = useQuery<PersonnelRow[]>({
    queryKey: ['personnel-directory'],
    queryFn: fetchPersonnel,
    placeholderData: FALLBACK_DEMO,
    retry: 1,
  })

  const rows = data ?? FALLBACK_DEMO

  // Apply filters
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

  function handleExport() {
    exportToCsv(
      `personnel_directory_${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((p) => ({
        Name: p.full_name,
        Email: p.email,
        Role: p.role,
        Position: p.position ?? '',
        Status: p.is_active ? 'Active' : 'Inactive',
        'Vacation (Remaining)': (p.vacation_credits - p.vacation_used).toFixed(2),
        'Vacation (Allotted)': p.vacation_credits.toFixed(2),
        'Sick (Remaining)': (p.sick_credits - p.sick_used).toFixed(2),
        'Sick (Allotted)': p.sick_credits.toFixed(2),
        'Emergency (Remaining)': (p.emergency_credits - p.emergency_used).toFixed(2),
        'Emergency (Allotted)': p.emergency_credits.toFixed(2),
      })),
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Personnel Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Staff roster, leave credit allocations, and remaining balances for{' '}
            {new Date().getFullYear()}.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          {isPrivileged && (
            <button
              onClick={() => navigate('/admin/users')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage Users
            </button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Could not reach Supabase — showing demo data. Check your{' '}
            <code className="text-xs">.env</code> credentials.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, position…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">All Roles</option>
          <option value="head">Head</option>
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
          <option value="staff">Staff</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">MHO Health Personnel</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {isLoading ? 'Loading…' : `${filtered.length} of ${rows.length} accounts`}
          </span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400">Loading personnel…</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-400">No personnel match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Full Name</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Position</th>
                  <th className="px-4 py-3 text-center">Vacation Remaining</th>
                  <th className="px-4 py-3 text-center">Sick Remaining</th>
                  <th className="px-4 py-3 text-center">Emergency Remaining</th>
                  <th className="px-4 py-3">Status</th>
                  {isPrivileged && <th className="px-4 py-3">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.full_name}</div>
                      <div className="text-slate-400 text-[11px]">{p.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          ROLE_COLORS[p.role] ?? 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{p.position || '—'}</td>
                    <CreditCell
                      credits={p.vacation_credits}
                      used={p.vacation_used}
                      color="text-blue-700"
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
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          p.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {isPrivileged && (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate('/admin/users')}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-emerald-400" /> ≥ 60% remaining
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-amber-400" /> 30–59% remaining
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-4 rounded-full bg-red-400" /> &lt; 30% remaining
        </span>
        <span className="ml-auto">Credits shown are <strong>remaining</strong> (allotted − approved usage this year).</span>
      </div>
    </div>
  )
}
