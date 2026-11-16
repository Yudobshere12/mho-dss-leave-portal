import React, { useState, useEffect, useMemo } from 'react'
import {
  UserCog,
  UserPlus,
  Search,
  RotateCcw,
  Edit2,
  CreditCard,
  Loader2,
  X,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import type { Database, UserRole } from '../../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const UserManagementScreen: React.FC = () => {
  const { currentUser, availableProfiles, setCurrentUser } = useDevRole()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modal State
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT' | null>(null)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('STAFF')
  const [position, setPosition] = useState('')
  const [vacationCredits, setVacationCredits] = useState<number>(15.0)
  const [sickCredits, setSickCredits] = useState<number>(15.0)
  const [emergencyCredits, setEmergencyCredits] = useState<number>(5.0)
  const [isActive, setIsActive] = useState<boolean>(true)

  const fetchProfiles = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }
      setProfiles(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfiles()
  }, [])

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

  const handleSaveUser = async (e: React.FormEvent) => {
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

        const { data: profData, error: profError } = await supabase
          .from('profiles')
          .insert(payload)
          .select()

        if (profError) throw new Error(profError.message)

        await supabase.from('leave_balances').insert({
          user_id: newId,
          vacation_credits: Number(vacationCredits),
          sick_credits: Number(sickCredits),
          emergency_credits: Number(emergencyCredits),
        })

        const created = profData?.[0] || (payload as Profile)
        setProfiles((prev) => [created, ...prev])

        setFeedback({
          type: 'success',
          message: `User account for "${fullName}" created successfully!`,
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

        const { error: profError } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', selectedProfile.id)

        if (profError) throw new Error(profError.message)

        await supabase
          .from('leave_balances')
          .update({
            vacation_credits: Number(vacationCredits),
            sick_credits: Number(sickCredits),
            emergency_credits: Number(emergencyCredits),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', selectedProfile.id)

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

        if (currentUser.id === selectedProfile.id) {
          setCurrentUser({
            ...currentUser,
            ...payload,
          })
        }

        setFeedback({
          type: 'success',
          message: `User record for "${fullName}" updated successfully.`,
        })
      }

      handleCloseModal()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFeedback({
        type: 'error',
        message: `Failed to save user: ${msg}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const searchMatch =
        !searchTerm.trim() ||
        p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.position && p.position.toLowerCase().includes(searchTerm.toLowerCase()))

      const roleMatch = roleFilter === 'ALL' || p.role === roleFilter
      const statusMatch =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && p.is_active) ||
        (statusFilter === 'INACTIVE' && !p.is_active)

      return searchMatch && roleMatch && statusMatch
    })
  }, [profiles, searchTerm, roleFilter, statusFilter])

  const handleResetFilters = () => {
    setSearchTerm('')
    setRoleFilter('ALL')
    setStatusFilter('ALL')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        action={
          <>
            <button
              onClick={fetchProfiles}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Add User
            </button>
          </>
        }
      />

      {feedback && (
        <div
          className={`rounded-xl border p-3.5 text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-2xs font-bold underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-100 pb-2">
          <span className="text-teal-800 uppercase tracking-wider text-2xs font-semibold">
            Filter Roster
          </span>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-slate-400 hover:text-teal-700 text-2xs font-semibold transition-colors"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Search</label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, email, position..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="ALL">All Roles</option>
              <option value="MHO_HEAD">MHO Head</option>
              <option value="MHO_ADMIN">MHO Admin</option>
              <option value="LGU_HR">LGU HR</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog className="h-4 w-4 text-teal-700" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Configured Profiles ({filteredProfiles.length})
            </h2>
          </div>
        </div>

        {isLoading ? (
          <LoadingState message="Loading registered users..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={fetchProfiles} />
        ) : filteredProfiles.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No users found"
              description="No user records match the filter criteria."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200 text-2xs">
                <tr>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-4 py-2.5">Role</th>
                  <th className="px-4 py-2.5">Position</th>
                  <th className="px-4 py-2.5 text-center">Vacation</th>
                  <th className="px-4 py-2.5 text-center">Sick</th>
                  <th className="px-4 py-2.5 text-center">Emergency</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{p.full_name}</div>
                      <div className="text-2xs text-slate-400">{p.email}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-700">
                        {p.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-2xs text-slate-600">{p.position || '—'}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-teal-800 text-2xs">
                      {p.vacation_credits.toFixed(1)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-emerald-700 text-2xs">
                      {p.sick_credits.toFixed(1)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-amber-700 text-2xs">
                      {p.emergency_credits.toFixed(1)}
                    </td>
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
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-2xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <Edit2 className="h-3 w-3" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900">
                {modalMode === 'CREATE' ? 'Add User Account' : `Edit User: ${selectedProfile?.full_name}`}
              </h3>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maria Santos"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. maria@mho.gov.ph"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                  >
                    <option value="STAFF">STAFF (Health Personnel)</option>
                    <option value="MHO_ADMIN">MHO_ADMIN (Administrative Officer)</option>
                    <option value="MHO_HEAD">MHO_HEAD (Municipal Health Officer)</option>
                    <option value="LGU_HR">LGU_HR (Human Resource)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Position Title</label>
                  <input
                    type="text"
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    placeholder="e.g. Rural Health Midwife II"
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              </div>

              {/* Leave Credits Calibration Box */}
              <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3.5 space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-teal-900 text-2xs">
                  <CreditCard className="h-3.5 w-3.5 text-teal-700" />
                  Leave Credit Allocations
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block font-semibold text-teal-900 text-2xs mb-1">Vacation (VL)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={vacationCredits}
                      onChange={(e) => setVacationCredits(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-teal-950 focus:border-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-emerald-800 text-2xs mb-1">Sick (SL)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={sickCredits}
                      onChange={(e) => setSickCredits(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-900 focus:border-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-amber-800 text-2xs mb-1">Emergency (EL)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={emergencyCredits}
                      onChange={(e) => setEmergencyCredits(parseFloat(e.target.value) || 0)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 focus:border-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-teal-700 focus:ring-teal-700 accent-teal-700"
                />
                <label htmlFor="isActiveToggle" className="font-semibold text-slate-800 cursor-pointer text-xs">
                  Account is Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleCloseModal}
                  className="rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-4 py-1.5 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 disabled:opacity-50 transition-colors"
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
