import React, { useState, useEffect, useMemo } from 'react'
import {
  UserCog,
  Search,
  RotateCcw,
  Edit2,
  CreditCard,
  Loader2,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import type { Database, UserRole, UserStatus } from '../../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

export const UserManagementScreen: React.FC = () => {
  const { user: authUser, role: authRole } = useAuth()
  const { currentUser } = useDevRole()

  // Component-level Guard: MHO_ADMIN only
  const activeRole = authRole || currentUser.role
  const currentUserId = authUser?.id || currentUser.id

  const [activeTab, setActiveTab] = useState<'PENDING' | 'ALL'>('PENDING')
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Quick Action Pending Review state (stores role selection per pending row)
  const [reviewRoles, setReviewRoles] = useState<Record<string, UserRole>>({})
  const [processingUserIds, setProcessingUserIds] = useState<Record<string, boolean>>({})

  // Filters for Main Directory Tab
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'approved' | 'pending' | 'rejected'>('ALL')

  // Edit Modal State (Admin editing an existing approved user's role or position)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Edit Form Fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('STAFF')
  const [status, setStatus] = useState<UserStatus>('approved')
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
        .order('created_at', { ascending: false })

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

  // Pending users count for tab badge
  const pendingUsers = useMemo(() => {
    return profiles.filter((p) => p.status === 'pending')
  }, [profiles])

  // Filtered profiles for "All Users" tab
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const searchMatch =
        !searchTerm.trim() ||
        (p.full_name && p.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.position && p.position.toLowerCase().includes(searchTerm.toLowerCase()))

      const roleMatch = roleFilter === 'ALL' || p.role === roleFilter
      const statusMatch = statusFilter === 'ALL' || p.status === statusFilter

      return searchMatch && roleMatch && statusMatch
    })
  }, [profiles, searchTerm, roleFilter, statusFilter])

  // Guard: if not MHO_ADMIN, render unauthorized screen (after hooks)
  if (activeRole !== 'MHO_ADMIN') {
    return (
      <div className="space-y-6">
        <PageHeader title="User Management" />
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center max-w-lg mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 mb-3">
            <XCircle className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Only users with the <span className="font-semibold text-slate-800">MHO_ADMIN</span> role can access User Management and approve accounts.
          </p>
        </div>
      </div>
    )
  }

  // Handle Approve / Reject via review_user RPC
  const handleReviewUser = async (targetUser: Profile, newStatus: 'approved' | 'rejected') => {
    if (targetUser.id === currentUserId) {
      setFeedback({
        type: 'error',
        message: 'You cannot approve or reject your own account.',
      })
      return
    }

    const assignedRole = reviewRoles[targetUser.id] || targetUser.role || 'STAFF'
    setProcessingUserIds((prev) => ({ ...prev, [targetUser.id]: true }))
    setFeedback(null)

    try {
      const { error } = await supabase.rpc('review_user', {
        p_user_id: targetUser.id,
        p_status: newStatus,
        p_role: assignedRole,
      })

      if (error) {
        throw new Error(error.message)
      }

      setProfiles((prev) =>
        prev.map((p) =>
          p.id === targetUser.id
            ? {
                ...p,
                status: newStatus,
                role: assignedRole,
                reviewed_by: currentUserId,
                reviewed_at: new Date().toISOString(),
              }
            : p
        )
      )

      setFeedback({
        type: 'success',
        message: `Account for ${targetUser.full_name || targetUser.email} has been ${newStatus} as ${assignedRole}.`,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFeedback({
        type: 'error',
        message: `Failed to review user: ${msg}`,
      })
    } finally {
      setProcessingUserIds((prev) => ({ ...prev, [targetUser.id]: false }))
    }
  }

  // Edit user modal open
  const handleOpenEdit = (p: Profile) => {
    setSelectedProfile(p)
    setFullName(p.full_name || '')
    setEmail(p.email || '')
    setRole(p.role)
    setStatus(p.status)
    setPosition(p.position || '')
    setVacationCredits(p.vacation_credits ?? 15.0)
    setSickCredits(p.sick_credits ?? 15.0)
    setEmergencyCredits(p.emergency_credits ?? 5.0)
    setIsActive(p.is_active ?? true)
    setIsEditModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setSelectedProfile(null)
  }

  // Submit Edit Form
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProfile) return

    // Prevent admin from editing their own role or status
    if (selectedProfile.id === currentUserId) {
      if (role !== selectedProfile.role || status !== selectedProfile.status) {
        setFeedback({
          type: 'error',
          message: 'Safety rule: You cannot modify your own role or approval status.',
        })
        return
      }
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const payload: Partial<Profile> = {
        full_name: fullName.trim(),
        role,
        status,
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

      // Also sync leave credits to leave_balances table
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

      setFeedback({
        type: 'success',
        message: `Profile for "${fullName}" updated successfully.`,
      })

      handleCloseModal()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFeedback({
        type: 'error',
        message: `Failed to update user: ${msg}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        action={
          <button
            onClick={fetchProfiles}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      {/* Feedback Alert */}
      {feedback && (
        <div
          role="alert"
          className={`flex items-center justify-between gap-3 rounded-xl border p-4 text-xs font-semibold shadow-2xs ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="rounded p-1 hover:bg-black/5"
            aria-label="Dismiss feedback"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex items-center border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('PENDING')}
          className={`relative flex items-center gap-2 pb-3 pt-1 px-4 text-xs font-bold transition-colors ${
            activeTab === 'PENDING'
              ? 'text-teal-800 border-b-2 border-teal-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Pending Approvals</span>
          {pendingUsers.length > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-extrabold bg-amber-500 text-white animate-pulse">
              {pendingUsers.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ALL')}
          className={`relative flex items-center gap-2 pb-3 pt-1 px-4 text-xs font-bold transition-colors ${
            activeTab === 'ALL'
              ? 'text-teal-800 border-b-2 border-teal-700'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>All Registered Users</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-medium bg-slate-100 text-slate-600">
            {profiles.length}
          </span>
        </button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading user directory..." />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={fetchProfiles} />
      ) : activeTab === 'PENDING' ? (
        /* ========================================================================= */
        /* PENDING APPROVALS TAB                                                     */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <p>
              Users below have signed in with Google and are awaiting administrator review and role assignment before they can access the portal.
            </p>
            <span className="font-semibold text-slate-700">
              {pendingUsers.length} {pendingUsers.length === 1 ? 'user' : 'users'} awaiting review
            </span>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-card">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">All Caught Up</h3>
              <p className="text-xs text-slate-500">
                There are no pending accounts awaiting approval at this time.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-3xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Signup Date</th>
                      <th className="py-3 px-4">Assign Role</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pendingUsers.map((p) => {
                      const isProcessing = !!processingUserIds[p.id]
                      const assignedRole = reviewRoles[p.id] || p.role || 'STAFF'
                      const isSelf = p.id === currentUserId

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-3">
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-2xs">
                                  {(p.full_name || p.email)
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900">
                                  {p.full_name || 'New Google Sign-in'}
                                </div>
                                <div className="text-2xs text-slate-400">ID: {p.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {p.email}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'}
                          </td>

                          <td className="py-3.5 px-4">
                            <select
                              value={assignedRole}
                              disabled={isProcessing || isSelf}
                              onChange={(e) =>
                                setReviewRoles((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value as UserRole,
                                }))
                              }
                              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 focus:border-teal-700 focus:ring-1 focus:ring-teal-700 disabled:opacity-60"
                            >
                              <option value="STAFF">STAFF</option>
                              <option value="MHO_ADMIN">MHO_ADMIN</option>
                              <option value="MHO_HEAD">MHO_HEAD</option>
                            </select>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            {isSelf ? (
                              <span className="text-2xs text-slate-400 italic">Self Account</span>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleReviewUser(p, 'approved')}
                                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                >
                                  {isProcessing ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  <span>Approve</span>
                                </button>

                                <button
                                  type="button"
                                  disabled={isProcessing}
                                  onClick={() => handleReviewUser(p, 'rejected')}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* ALL USERS TAB                                                             */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, email, position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-300 bg-slate-50 pl-9 pr-4 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-teal-700"
              >
                <option value="ALL">All Roles</option>
                <option value="STAFF">STAFF</option>
                <option value="MHO_ADMIN">MHO_ADMIN</option>
                <option value="MHO_HEAD">MHO_HEAD</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:border-teal-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>

              {(searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('')
                    setRoleFilter('ALL')
                    setStatusFilter('ALL')
                  }}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {filteredProfiles.length === 0 ? (
            <EmptyState
              title="No Users Found"
              description="No user records matched your criteria."
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-3xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-4">Employee</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Position</th>
                      <th className="py-3 px-4">Leave Credits (VL / SL / EL)</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProfiles.map((p) => {
                      const isSelf = p.id === currentUserId

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-3">
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-2xs">
                                  {(p.full_name || p.email).slice(0, 2).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {p.full_name || 'Staff Member'}
                                  {isSelf && (
                                    <span className="rounded-full bg-teal-100 text-teal-800 text-3xs px-2 py-0.2 font-extrabold">
                                      YOU
                                    </span>
                                  )}
                                </div>
                                <div className="text-2xs text-slate-400">{p.email}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-2xs font-bold text-slate-700">
                              <ShieldCheck className="h-3 w-3 text-teal-700" />
                              {p.role}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold uppercase ${
                                p.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : p.status === 'pending'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-red-50 text-red-800 border border-red-200'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-slate-600">
                            {p.position || '—'}
                          </td>

                          <td className="py-3.5 px-4 text-slate-700 font-mono text-2xs">
                            <span className="font-semibold text-teal-900">{p.vacation_credits ?? 15}</span>
                            <span className="text-slate-300"> / </span>
                            <span className="font-semibold text-emerald-800">{p.sick_credits ?? 15}</span>
                            <span className="text-slate-300"> / </span>
                            <span className="font-semibold text-amber-800">{p.emergency_credits ?? 5}</span>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(p)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT USER MODAL                                                           */}
      {/* ========================================================================= */}
      {isEditModalOpen && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-modal max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-teal-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Edit User: {selectedProfile.full_name || selectedProfile.email}
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Role * {selectedProfile.id === currentUserId && '(Locked for self)'}
                  </label>
                  <select
                    value={role}
                    disabled={selectedProfile.id === currentUserId}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="STAFF">STAFF</option>
                    <option value="MHO_ADMIN">MHO_ADMIN</option>
                    <option value="MHO_HEAD">MHO_HEAD</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status * {selectedProfile.id === currentUserId && '(Locked for self)'}
                  </label>
                  <select
                    value={status}
                    disabled={selectedProfile.id === currentUserId}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="approved">Approved</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Position Title</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Staff Nurse II"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700"
                />
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-teal-950 focus:border-teal-700"
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-emerald-900 focus:border-teal-700"
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-1 text-xs font-bold text-amber-900 focus:border-teal-700"
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
                  Save Changes
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
