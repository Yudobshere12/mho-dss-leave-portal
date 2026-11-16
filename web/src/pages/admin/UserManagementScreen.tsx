import React, { useState, useEffect, useMemo } from 'react'
import {
  UserCog,
  UserPlus,
  Users,
  Search,
  Filter,
  RotateCcw,
  Edit2,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Shield,
  Loader2,
  X,
  Plus,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import type { Database, UserRole } from '../../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const UserManagementScreen: React.FC = () => {
  const { currentUser, availableProfiles, setCurrentUser } = useDevRole()

  const [profiles, setProfiles] = useState<Profile[]>(availableProfiles)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modal State
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields (No password handling as auth is deferred)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('STAFF')
  const [position, setPosition] = useState('')
  const [vacationCredits, setVacationCredits] = useState<number>(15.0)
  const [sickCredits, setSickCredits] = useState<number>(15.0)
  const [emergencyCredits, setEmergencyCredits] = useState<number>(5.0)
  const [isActive, setIsActive] = useState<boolean>(true)

  // Load profiles from Supabase or fallback
  const fetchProfiles = async () => {
    setIsLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rawData, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .order('role', { ascending: false })

      const data = rawData as Profile[] | null

      if (error) {
        console.warn('Could not query profiles, using local context:', error.message)
        setProfiles(availableProfiles)
      } else if (data && data.length > 0) {
        setProfiles(data)
      } else {
        setProfiles(availableProfiles)
      }
    } catch (err) {
      console.warn('Profiles query exception:', err)
      setProfiles(availableProfiles)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedProfile(null)
    setFullName('')
    setEmail('')
    setRole('STAFF')
    setPosition('Staff Nurse')
    setVacationCredits(15.0)
    setSickCredits(15.0)
    setEmergencyCredits(5.0)
    setIsActive(true)
    setModalMode('CREATE')
  }

  // Open Edit Modal
  const handleOpenEdit = (profile: Profile) => {
    setSelectedProfile(profile)
    setFullName(profile.full_name)
    setEmail(profile.email)
    setRole(profile.role)
    setPosition(profile.position || '')
    setVacationCredits(profile.vacation_credits)
    setSickCredits(profile.sick_credits)
    setEmergencyCredits(profile.emergency_credits)
    setIsActive(profile.is_active)
    setModalMode('EDIT')
  }

  const handleCloseModal = () => {
    setModalMode(null)
    setSelectedProfile(null)
  }

  // Form Submission
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setFeedback(null)

    try {
      if (modalMode === 'CREATE') {
        const newId = crypto.randomUUID()
        const payload = {
          id: newId,
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          role,
          position: position.trim() || null,
          vacation_credits: Number(vacationCredits),
          sick_credits: Number(sickCredits),
          emergency_credits: Number(emergencyCredits),
          is_active: isActive,
        }

        // Insert profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profData, error: profError } = await (supabase as any)
          .from('profiles')
          .insert(payload)
          .select()

        if (profError) throw new Error(profError.message)

        // Insert leave balances ledger row
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('leave_balances').insert({
          user_id: newId,
          vacation_credits: Number(vacationCredits),
          sick_credits: Number(sickCredits),
          emergency_credits: Number(emergencyCredits),
        })

        const created = profData?.[0] || (payload as Profile)
        setProfiles((prev) => [created, ...prev])

        setFeedback({
          type: 'success',
          message: `User account for "${fullName}" created successfully with default leave credits!`,
        })
      } else if (modalMode === 'EDIT' && selectedProfile) {
        const payload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          role,
          position: position.trim() || null,
          vacation_credits: Number(vacationCredits),
          sick_credits: Number(sickCredits),
          emergency_credits: Number(emergencyCredits),
          is_active: isActive,
          updated_at: new Date().toISOString(),
        }

        // Update profile
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: profError } = await (supabase as any)
          .from('profiles')
          .update(payload)
          .eq('id', selectedProfile.id)

        if (profError) throw new Error(profError.message)

        // Update balances ledger
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('leave_balances')
          .update({
            vacation_credits: Number(vacationCredits),
            sick_credits: Number(sickCredits),
            emergency_credits: Number(emergencyCredits),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', selectedProfile.id)

        // Update local state
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === selectedProfile.id
              ? {
                  ...p,
                  ...payload,
                }
              : p
          )
        )

        // If editing acting user, sync DevRoleContext
        if (currentUser.id === selectedProfile.id) {
          setCurrentUser({
            ...currentUser,
            ...payload,
          })
        }

        setFeedback({
          type: 'success',
          message: `User record for "${fullName}" and leave credit allocations successfully updated.`,
        })
      }

      handleCloseModal()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('User update error, updating locally:', msg)

      // Fallback local update for disconnected dev preview
      if (modalMode === 'CREATE') {
        const mockNew: Profile = {
          id: crypto.randomUUID(),
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          role,
          position: position.trim() || null,
          vacation_credits: Number(vacationCredits),
          sick_credits: Number(sickCredits),
          emergency_credits: Number(emergencyCredits),
          is_active: isActive,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setProfiles((prev) => [mockNew, ...prev])
        setFeedback({
          type: 'success',
          message: `[DEV PREVIEW] Created user "${fullName}" with default credit allocations.`,
        })
      } else if (modalMode === 'EDIT' && selectedProfile) {
        setProfiles((prev) =>
          prev.map((p) =>
            p.id === selectedProfile.id
              ? {
                  ...p,
                  full_name: fullName.trim(),
                  email: email.trim().toLowerCase(),
                  role,
                  position: position.trim() || null,
                  vacation_credits: Number(vacationCredits),
                  sick_credits: Number(sickCredits),
                  emergency_credits: Number(emergencyCredits),
                  is_active: isActive,
                }
              : p
          )
        )
        setFeedback({
          type: 'success',
          message: `[DEV PREVIEW] Updated user "${fullName}" and credit balances.`,
        })
      }
      handleCloseModal()
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filtered dataset
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const searchMatch =
        !searchTerm.trim() ||
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.position && p.position.toLowerCase().includes(searchTerm.toLowerCase()))

      const roleMatch = roleFilter === 'ALL' || p.role === roleFilter

      const statusMatch =
        statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? p.is_active : !p.is_active)

      return searchMatch && roleMatch && statusMatch
    })
  }, [profiles, searchTerm, roleFilter, statusFilter])

  return (
    <div className="space-y-6">
      {/* Page Title & Create Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Account & Leave Credit Management
          </h1>
          <p className="text-sm text-slate-500">
            Provision staff profiles, assign system access roles, and calibrate leave balances.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-4 w-4" />
          Create New Employee
        </button>
      </div>

      {/* Alert Notice */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <span className="font-medium">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Query Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <span className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            Filter Personnel Records
          </span>
          <button
            onClick={() => {
              setSearchTerm('')
              setRoleFilter('ALL')
              setStatusFilter('ALL')
            }}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-2xs font-semibold"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Search */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Search Staff</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, or position..."
                className="w-full rounded-lg border border-slate-300 pl-8 pr-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">System Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">All Roles</option>
              <option value="STAFF">STAFF</option>
              <option value="MHO_ADMIN">MHO_ADMIN</option>
              <option value="MHO_HEAD">MHO_HEAD</option>
              <option value="LGU_HR">LGU_HR</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Account State</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-blue-500 focus:outline-hidden"
            >
              <option value="ALL">All Accounts</option>
              <option value="ACTIVE">Active Accounts</option>
              <option value="INACTIVE">Deactivated Accounts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Registered Personnel ({filteredProfiles.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Password management will be handled by Supabase Auth in production
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 text-center">Vacation Credits</th>
                <th className="px-4 py-3 text-center">Sick Credits</th>
                <th className="px-4 py-3 text-center">Emergency Credits</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProfiles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No employee accounts match the query criteria.
                  </td>
                </tr>
              ) : (
                filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{p.full_name}</div>
                      <div className="text-2xs text-slate-400">{p.email}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-2xs font-bold text-slate-700">
                        {p.role}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-slate-600">{p.position || '—'}</td>

                    <td className="px-4 py-3 text-center font-bold text-blue-700">
                      {p.vacation_credits.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-emerald-700">
                      {p.sick_credits.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-center font-bold text-amber-700">
                      {p.emergency_credits.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-2xs font-semibold ${
                          p.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {p.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-2xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" /> Edit & Adjust Credits
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal Dialog */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === 'CREATE' ? 'Provision New Employee' : `Edit Account: ${selectedProfile?.full_name}`}
                </h3>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Personal Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. msantos@mho.gov.ph"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Role & Position */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">System Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    <option value="STAFF">STAFF (Health Worker / Personnel)</option>
                    <option value="MHO_ADMIN">MHO_ADMIN (System & User Administrator)</option>
                    <option value="MHO_HEAD">MHO_HEAD (Office Head / Executive)</option>
                    <option value="LGU_HR">LGU_HR (Human Resource Auditor)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Position / Designation</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Rural Health Midwife II"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Leave Credits Calibration Box */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  Leave Credit Allocations & Balances
                </div>
                <p className="text-2xs text-slate-500">
                  Direct adjustments modify both `public.profiles` and the `public.leave_balances` ledger.
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-blue-800 mb-1">Vacation (VL)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={vacationCredits}
                      onChange={(e) => setVacationCredits(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-blue-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-emerald-800 mb-1">Sick (SL)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={sickCredits}
                      onChange={(e) => setSickCredits(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-emerald-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-amber-800 mb-1">Emergency (EL)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={emergencyCredits}
                      onChange={(e) => setEmergencyCredits(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-bold text-amber-900 focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Account State Flag */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-slate-800 cursor-pointer">
                  Account is Active (eligible for duty scheduling and portal filings)
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCloseModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {modalMode === 'CREATE' ? 'Create Account' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
export default UserManagementScreen
