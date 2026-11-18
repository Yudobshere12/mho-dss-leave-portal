import React, { useState, useEffect } from 'react'
import {
  FileSignature,
  UserCheck,
  UserPlus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { useAuth } from '../../context/AuthContext'
import { isActionAllowed } from '../../lib/permissions'
import { countWeekdays } from '../../utils/weekday'
import { supabase } from '../../lib/supabase'
import { PageHeader } from '../../components/PageHeader'
import { NotAuthorizedFallback } from '../../components/NotAuthorizedFallback'
import type { LeaveType } from '../../types/database.types'

export const LeaveFilingPage: React.FC = () => {
  const { currentUser, availableProfiles } = useDevRole()
  const { role: authRole } = useAuth()
  const activeRole = authRole || currentUser.role

  const canFileSelf = isActionAllowed(activeRole, 'leave:file_self')
  const canFileOnBehalf = isActionAllowed(activeRole, 'leave:file_on_behalf')

  // Filing Mode: 'SELF' vs 'ON_BEHALF' (only visible to MHO_ADMIN)
  const [filingMode, setFilingMode] = useState<'SELF' | 'ON_BEHALF'>('SELF')

  // Selected employee target when filing on behalf
  const [targetType, setTargetType] = useState<string>('REGISTERED')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [walkInName, setWalkInName] = useState<string>('')

  // Form Fields
  const [leaveType, setLeaveType] = useState<LeaveType>('Vacation Leave')
  const [otherLeaveType, setOtherLeaveType] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [reason, setReason] = useState<string>('')

  // Calculated duration
  const totalDays = countWeekdays(startDate, endDate)

  // DSS Preview State
  const [dssRecommendation, setDssRecommendation] = useState<string>('')
  const [dssReason, setDssReason] = useState<string>('')
  const [isDssLoading, setIsDssLoading] = useState<boolean>(false)

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  // Determine effective applicant
  const effectiveUserId =
    filingMode === 'SELF'
      ? currentUser.id
      : targetType === 'REGISTERED'
      ? selectedUserId || (availableProfiles[0]?.id ?? '')
      : null

  const effectiveApplicantProfile = availableProfiles.find((p) => p.id === effectiveUserId)

  const effectiveEmployeeName =
    filingMode === 'SELF'
      ? currentUser.full_name
      : targetType === 'REGISTERED'
      ? effectiveApplicantProfile?.full_name || ''
      : walkInName.trim()

  useEffect(() => {
    if (!selectedUserId && availableProfiles.length > 0) {
      const firstNonAdmin = availableProfiles.find((p) => p.role === 'STAFF') || availableProfiles[0]
      setSelectedUserId(firstNonAdmin.id)
    }
  }, [availableProfiles, selectedUserId])

  // Live DSS RPC check effect
  useEffect(() => {
    let isCancelled = false

    async function fetchDssPreview() {
      if (!startDate || !endDate || totalDays <= 0) {
        setDssRecommendation('')
        setDssReason('')
        return
      }

      setIsDssLoading(true)

      try {
        const { data, error } = await supabase.rpc('get_dss_recommendation', {
          p_user_id: effectiveUserId,
          p_leave_type: leaveType,
          p_days: totalDays,
          p_start_date: startDate,
          p_end_date: endDate,
        })

        if (isCancelled) return

        if (error) {
          clientSideDssFallback()
        } else if (data && data.length > 0) {
          setDssRecommendation(data[0].recommendation)
          setDssReason(data[0].reason)
        } else {
          clientSideDssFallback()
        }
      } catch {
        if (!isCancelled) {
          clientSideDssFallback()
        }
      } finally {
        if (!isCancelled) setIsDssLoading(false)
      }
    }

    function clientSideDssFallback() {
      if (!effectiveApplicantProfile && !effectiveUserId) {
        setDssRecommendation('RECOMMENDED')
        setDssReason('Walk-in application (no leave credit record required).')
        return
      }

      const prof = effectiveApplicantProfile || currentUser
      let available = 0
      if (leaveType === 'Vacation Leave') available = prof.vacation_credits
      else if (leaveType === 'Sick Leave') available = prof.sick_credits
      else if (leaveType === 'Emergency Leave') available = prof.emergency_credits
      else available = 999

      if (available < totalDays) {
        setDssRecommendation('NEEDS_REVIEW')
        setDssReason(
          `Insufficient ${leaveType} balance. Requested: ${totalDays} days, Available: ${available} days.`
        )
      } else {
        setDssRecommendation('RECOMMENDED')
        setDssReason(
          `Sufficient balance available (${available} days remaining). Duty staff coverage satisfied.`
        )
      }
    }

    const timer = setTimeout(() => {
      fetchDssPreview()
    }, 250)

    return () => {
      isCancelled = true
      clearTimeout(timer)
    }
  }, [effectiveUserId, leaveType, totalDays, startDate, endDate, effectiveApplicantProfile, currentUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    if (!startDate || !endDate) {
      setSubmitError('Please specify both start and end dates.')
      return
    }

    if (new Date(endDate) < new Date(startDate)) {
      setSubmitError('End date cannot be earlier than start date.')
      return
    }

    if (totalDays <= 0) {
      setSubmitError('Selected date range contains no valid working days (weekends only).')
      return
    }

    if (filingMode === 'ON_BEHALF' && targetType === 'WALK_IN' && !walkInName.trim()) {
      setSubmitError('Please specify the full name of the walk-in employee.')
      return
    }

    if (effectiveApplicantProfile) {
      let availableCredits = 0
      if (leaveType === 'Vacation Leave') availableCredits = effectiveApplicantProfile.vacation_credits
      else if (leaveType === 'Sick Leave') availableCredits = effectiveApplicantProfile.sick_credits
      else if (leaveType === 'Emergency Leave') availableCredits = effectiveApplicantProfile.emergency_credits
      else availableCredits = 999

      if (totalDays > availableCredits) {
        setSubmitError(
          `Requested ${totalDays} day(s) exceeds available remaining balance (${availableCredits} days) for ${leaveType}.`
        )
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload = {
        user_id: effectiveUserId,
        employee_name: effectiveEmployeeName,
        leave_type: leaveType,
        other_leave_type: leaveType === 'Other' ? otherLeaveType : null,
        start_date: startDate,
        end_date: endDate,
        total_days: totalDays,
        reason: reason.trim() || null,
        status: 'PENDING' as const,
        dss_recommendation: dssRecommendation
          ? `${dssRecommendation} (${dssReason})`
          : 'RECOMMENDED (PENDING REVIEW)',
        created_by_admin_id: filingMode === 'ON_BEHALF' ? currentUser.id : null,
      }

      const { data, error } = await supabase.from('leave_applications').insert(payload).select()

      if (error) {
        throw new Error(error.message)
      }

      setSubmitSuccess(
        `Leave application #${data?.[0]?.id || ''} successfully filed and queued for review.`
      )

      setReason('')
      setOtherLeaveType('')
      if (targetType === 'WALK_IN') setWalkInName('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSubmitError(`Failed to submit application: ${msg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!canFileSelf && !canFileOnBehalf) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader title="Apply for Leave" />
        <NotAuthorizedFallback message="Your current role does not have permission to file leave applications." />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        title={filingMode === 'ON_BEHALF' ? 'On-Behalf Filing' : 'Apply for Leave'}
      />

      {/* Mode Switcher: visible strictly to MHO_ADMIN */}
      {canFileOnBehalf && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 p-2 text-xs">
          <span className="font-semibold text-teal-900 px-2">Mode:</span>
          <button
            type="button"
            onClick={() => setFilingMode('SELF')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
              filingMode === 'SELF'
                ? 'bg-teal-700 text-white shadow-soft font-semibold'
                : 'text-teal-800 hover:bg-teal-100/70'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Self
          </button>
          <button
            type="button"
            onClick={() => setFilingMode('ON_BEHALF')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
              filingMode === 'ON_BEHALF'
                ? 'bg-teal-700 text-white shadow-soft font-semibold'
                : 'text-teal-800 hover:bg-teal-100/70'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            On Behalf / Walk-in
          </button>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 md:p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <FileSignature className="h-4 w-4 text-teal-700" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            {filingMode === 'ON_BEHALF' ? 'On-Behalf Filing Form' : 'Leave Request Form'}
          </h2>
        </div>

        {submitSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Application Submitted</div>
              <div>{submitSuccess}</div>
            </div>
          </div>
        )}

        {submitError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Submission Error</div>
              <div>{submitError}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {filingMode === 'ON_BEHALF' && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
              <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider">
                Filing Target
              </label>

              <div className="flex gap-4 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'REGISTERED'}
                    onChange={() => setTargetType('REGISTERED')}
                    className="text-teal-700 focus:ring-teal-700 accent-teal-700"
                  />
                  Registered Staff
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'WALK_IN'}
                    onChange={() => setTargetType('WALK_IN')}
                    className="text-teal-700 focus:ring-teal-700 accent-teal-700"
                  />
                  Walk-in Personnel
                </label>
              </div>

              {targetType === 'REGISTERED' ? (
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Staff Member *
                  </label>
                  <select
                    value={effectiveUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                  >
                    {availableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-2xs font-semibold text-slate-600 mb-1">
                    Walk-in Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Full name..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                  />
                </div>
              )}
            </div>
          )}

          {effectiveApplicantProfile && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="font-bold text-slate-900">{effectiveApplicantProfile.full_name}</span>
                <span className="text-slate-500 ml-1">
                  ({effectiveApplicantProfile.position || effectiveApplicantProfile.role})
                </span>
              </div>
              <div className="flex gap-3 text-2xs font-medium">
                <span>
                  VL: <strong className="text-teal-800">{effectiveApplicantProfile.vacation_credits.toFixed(1)}</strong>
                </span>
                <span>
                  SL: <strong className="text-emerald-700">{effectiveApplicantProfile.sick_credits.toFixed(1)}</strong>
                </span>
                <span>
                  EL: <strong className="text-amber-700">{effectiveApplicantProfile.emergency_credits.toFixed(1)}</strong>
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category *</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              >
                <option value="Vacation Leave">Vacation Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Emergency Leave">Emergency Leave</option>
                <option value="Maternity Leave">Maternity Leave</option>
                <option value="Paternity Leave">Paternity Leave</option>
                <option value="Special Privilege Leave">Special Privilege Leave</option>
                <option value="Other">Other Category</option>
              </select>
            </div>

            {leaveType === 'Other' && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Details *</label>
                <input
                  type="text"
                  required
                  value={otherLeaveType}
                  onChange={(e) => setOtherLeaveType(e.target.value)}
                  placeholder="e.g. Bereavement, Quarantine..."
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Clock className="h-3.5 w-3.5 text-teal-700" />
              Duration (weekdays only):
            </span>
            <span className={`font-bold text-xs ${totalDays > 0 ? 'text-teal-800' : 'text-slate-400'}`}>
              {totalDays} working day(s)
            </span>
          </div>

          {startDate && endDate && (
            <div
              className={`rounded-xl border p-3 text-xs transition-all ${
                isDssLoading
                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                  : dssRecommendation === 'RECOMMENDED'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1">
                <span className="flex items-center gap-1.5">
                  {isDssLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                  ) : dssRecommendation === 'RECOMMENDED' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  )}
                  DSS Advisory:
                </span>
                {!isDssLoading && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-2xs font-bold uppercase ${
                      dssRecommendation === 'RECOMMENDED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {dssRecommendation || 'CALCULATING'}
                  </span>
                )}
              </div>
              <div className="text-2xs leading-relaxed">
                {isDssLoading ? 'Evaluating balance and duty staff coverage...' : dssReason}
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason / Remarks</label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Justification remarks..."
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || totalDays <= 0}
            className="w-full flex items-center justify-center gap-1.5 rounded-full bg-teal-700 px-4 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Submit Application
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default LeaveFilingPage
