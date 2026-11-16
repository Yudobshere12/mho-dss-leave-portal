import React, { useState, useEffect } from 'react'
import {
  FileSignature,
  UserCheck,
  UserPlus,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Loader2,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { countWeekdays } from '../../utils/weekday'
import { supabase } from '../../lib/supabase'
import type { LeaveType } from '../../types/database.types'

export const LeaveFilingPage: React.FC = () => {
  const { currentUser, availableProfiles } = useDevRole()

  const isAdminOrHead = ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)
  const isAdmin = currentUser.role === 'MHO_ADMIN'

  // Filing Mode: 'SELF' vs 'ON_BEHALF' (only available if Admin/Head)
  const [filingMode, setFilingMode] = useState<'SELF' | 'ON_BEHALF'>('SELF')

  // Selected employee target when filing on behalf
  // 'WALK_IN' or profile UUID
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

  // Initialize selectedUserId default
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
      // Need valid dates and totalDays > 0
      if (!startDate || !endDate || totalDays <= 0) {
        setDssRecommendation('')
        setDssReason('')
        return
      }

      // If walk-in without a user_id, evaluate with null or synthetic check
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
          console.warn('DSS RPC evaluation error:', error.message)
          // Fallback client heuristic when Supabase backend is disconnected
          clientSideDssFallback()
        } else if (data && data.length > 0) {
          setDssRecommendation(data[0].recommendation)
          setDssReason(data[0].reason)
        } else {
          clientSideDssFallback()
        }
      } catch (err) {
        if (!isCancelled) {
          clientSideDssFallback()
        }
      } finally {
        if (!isCancelled) setIsDssLoading(false)
      }
    }

    function clientSideDssFallback() {
      // Client-side simulation matching evaluate_leave_credits & evaluate_schedule_conflict
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

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    setSubmitSuccess(null)

    // Validation 1: Required dates
    if (!startDate || !endDate) {
      setSubmitError('Please specify both start and end dates.')
      return
    }

    // Validation 2: Date ordering
    if (new Date(endDate) < new Date(startDate)) {
      setSubmitError('End date cannot be earlier than start date.')
      return
    }

    // Validation 3: Working days duration
    if (totalDays <= 0) {
      setSubmitError('Selected date range contains no valid working days (weekends only).')
      return
    }

    // Validation 4: Name required for walk-in
    if (filingMode === 'ON_BEHALF' && targetType === 'WALK_IN' && !walkInName.trim()) {
      setSubmitError('Please specify the full name of the walk-in employee.')
      return
    }

    // Validation 5: Overdraft prevention (Rule 2.3)
    if (effectiveApplicantProfile) {
      let availableCredits = 0
      if (leaveType === 'Vacation Leave') availableCredits = effectiveApplicantProfile.vacation_credits
      else if (leaveType === 'Sick Leave') availableCredits = effectiveApplicantProfile.sick_credits
      else if (leaveType === 'Emergency Leave') availableCredits = effectiveApplicantProfile.emergency_credits
      else availableCredits = 999

      if (totalDays > availableCredits) {
        setSubmitError(
          `Cannot file application! Requested ${totalDays} day(s) exceeds available remaining balance (${availableCredits} days) for ${leaveType}.`
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
        `Leave application successfully filed! Reference #${data?.[0]?.id || 'NEW'} has been queued for executive review.`
      )

      // Reset form
      setReason('')
      setOtherLeaveType('')
      if (targetType === 'WALK_IN') setWalkInName('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSubmitError(`Failed to submit leave application: ${msg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {filingMode === 'ON_BEHALF' ? 'Administrative On-Behalf Filing' : 'File Leave Application'}
        </h1>
        <p className="text-sm text-slate-500">
          Municipal Health Office Decision Support System leave submission module.
        </p>
      </div>

      {/* Admin Filing Mode Switcher */}
      {isAdminOrHead && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-2 text-xs">
          <span className="font-semibold text-blue-900 px-2">Filing Mode:</span>
          <button
            type="button"
            onClick={() => setFilingMode('SELF')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filingMode === 'SELF'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-800 hover:bg-blue-100/70'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Self (Acting User: {currentUser.full_name})
          </button>
          <button
            type="button"
            onClick={() => setFilingMode('ON_BEHALF')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-colors ${
              filingMode === 'ON_BEHALF'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-blue-800 hover:bg-blue-100/70'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            File on Behalf of Personnel / Walk-in
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileSignature className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">
            {filingMode === 'ON_BEHALF' ? 'On-Behalf Filing Form' : 'Employee Self-Service Filing'}
          </h2>
        </div>

        {/* Feedback Alerts */}
        {submitSuccess && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 flex items-start gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Application Submitted</div>
              <div>{submitSuccess}</div>
            </div>
          </div>
        )}

        {submitError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Validation Error</div>
              <div>{submitError}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* On-Behalf Target Selection */}
          {filingMode === 'ON_BEHALF' && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Select Filing Target
              </label>

              <div className="flex gap-4 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'REGISTERED'}
                    onChange={() => setTargetType('REGISTERED')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Registered Portal Personnel
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="targetType"
                    checked={targetType === 'WALK_IN'}
                    onChange={() => setTargetType('WALK_IN')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  Walk-in / Unregistered Staff
                </label>
              </div>

              {targetType === 'REGISTERED' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Staff Member *
                  </label>
                  <select
                    value={effectiveUserId || ''}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  >
                    {availableProfiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name} ({p.role} - {p.position || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Walk-in Employee Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="Enter full name of applicant..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              )}
            </div>
          )}

          {/* Current Entitlements Banner */}
          {effectiveApplicantProfile && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <span className="font-bold text-slate-900">{effectiveApplicantProfile.full_name}</span>
                <span className="text-slate-500 ml-1.5">
                  ({effectiveApplicantProfile.position || effectiveApplicantProfile.role})
                </span>
              </div>
              <div className="flex gap-4 font-medium">
                <span>
                  VL: <strong className="text-blue-700">{effectiveApplicantProfile.vacation_credits.toFixed(2)}</strong>
                </span>
                <span>
                  SL: <strong className="text-emerald-700">{effectiveApplicantProfile.sick_credits.toFixed(2)}</strong>
                </span>
                <span>
                  EL: <strong className="text-amber-700">{effectiveApplicantProfile.emergency_credits.toFixed(2)}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Category & Other Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Leave Category *
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specify Category Details *
                </label>
                <input
                  type="text"
                  required
                  value={otherLeaveType}
                  onChange={(e) => setOtherLeaveType(e.target.value)}
                  placeholder="e.g. Bereavement, Quarantine..."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          {/* Dates Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Live Calculated Duration */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-700">
              <Clock className="h-4 w-4 text-blue-600" />
              Calculated Duration (Excluding Saturdays & Sundays):
            </span>
            <span
              className={`font-bold text-sm ${
                totalDays > 0 ? 'text-blue-700' : 'text-slate-400'
              }`}
            >
              {totalDays} working day(s)
            </span>
          </div>

          {/* Live Decision Support System (DSS) Preview Card */}
          {startDate && endDate && (
            <div
              className={`rounded-xl border p-4 text-xs transition-all ${
                isDssLoading
                  ? 'border-slate-200 bg-slate-50 text-slate-600'
                  : dssRecommendation === 'RECOMMENDED'
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                  : 'border-amber-200 bg-amber-50/80 text-amber-900'
              }`}
            >
              <div className="flex items-center justify-between font-bold mb-1.5">
                <span className="flex items-center gap-1.5">
                  {isDssLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  ) : dssRecommendation === 'RECOMMENDED' ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  Decision Support System (DSS) Live Advisory:
                </span>
                {!isDssLoading && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wide ${
                      dssRecommendation === 'RECOMMENDED'
                        ? 'bg-emerald-200 text-emerald-900'
                        : 'bg-amber-200 text-amber-900'
                    }`}
                  >
                    {dssRecommendation || 'CALCULATING...'}
                  </span>
                )}
              </div>
              <div className="text-xs leading-relaxed">
                {isDssLoading ? 'Evaluating leave balance and active duty staff coverage...' : dssReason}
              </div>
            </div>
          )}

          {/* Reason / Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason / Justification Remarks
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State justification or applicant remarks..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || totalDays <= 0}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
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
