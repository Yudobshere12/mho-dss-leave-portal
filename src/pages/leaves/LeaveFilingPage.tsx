import React, { useState, useEffect, useMemo } from 'react'
import {
  FileSignature,
  Calendar,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  UserPlus,
  Building,
  User,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { countWeekdays } from '../../utils/weekday'
import { PageHeader } from '../../components/PageHeader'
import { NotAuthorizedFallback } from '../../components/NotAuthorizedFallback'
import { LeaveTypeBadge } from '../../components/LeaveTypeBadge'
import { DssAdvisoryCard } from '../../components/DssAdvisoryCard'
import { parseDssFromRpc } from '../../lib/dssPresenter'
import { FALLBACK_LEAVE_TYPES, type LeaveTypeRecord } from '../../lib/leaveTypes'
import { useSystemSettings } from '../../lib/systemSettings'
import { LeaveFilingSkeleton } from './LeaveFilingSkeleton'
import { useSkeletonDelayedLoading } from '../../hooks/useSkeletonLoading'
import type { Database, CommutationType, LeaveDetails } from '../../types/database.types'

type LeaveType = Database['public']['Tables']['leave_applications']['Row']['leave_type']

// Helper to format full name Last, First, Middle
function formatLastFirst(fullName: string | null | undefined): string {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return fullName
  const last = parts[parts.length - 1]
  const rest = parts.slice(0, parts.length - 1).join(' ')
  return `${last}, ${rest}`
}

export const LeaveFilingPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth()
  const { currentUser, availableProfiles, isLoading: devRoleLoading } = useDevRole()
  const { settings, isLoading: settingsLoading } = useSystemSettings()

  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeRecord[]>(FALLBACK_LEAVE_TYPES)
  const [isTypesLoading, setIsTypesLoading] = useState<boolean>(true)
  const [filingMode, setFilingMode] = useState<'SELF' | 'ON_BEHALF'>('SELF')

  // On-Behalf specific sub-state
  const [targetType, setTargetType] = useState<'REGISTERED' | 'WALK_IN'>('REGISTERED')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [walkInName, setWalkInName] = useState<string>('')

  // Form Fields - Civil Service Form No. 6 (Revised 2020)
  const [positionAtFiling, setPositionAtFiling] = useState<string>('')
  const [leaveType, setLeaveType] = useState<LeaveType>('VL')
  const [otherLeaveType, setOtherLeaveType] = useState('')

  // Section 6.B Details fields
  const [detailLocation, setDetailLocation] = useState<'within_philippines' | 'abroad'>('within_philippines')
  const [detailCareType, setDetailCareType] = useState<'in_hospital' | 'out_patient'>('out_patient')
  const [detailIllness, setDetailIllness] = useState<string>('')
  const [detailStudyPurpose, setDetailStudyPurpose] = useState<'masters_completion' | 'bar_board_review'>('masters_completion')
  const [detailOtherPurpose, setDetailOtherPurpose] = useState<'' | 'monetization' | 'terminal_leave'>('')
  const [detailSpecify, setDetailSpecify] = useState<string>('')

  // Dates and Working Days
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [commutation, setCommutation] = useState<CommutationType>('not_requested')
  const [reason, setReason] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Live DSS RPC check state
  const [dssRecommendation, setDssRecommendation] = useState<string>('')
  const [dssReason, setDssReason] = useState<string>('')
  const [isDssLoading, setIsDssLoading] = useState<boolean>(false)

  const canFileSelf = ['STAFF', 'MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)
  const canFileOnBehalf = ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)

  // Working days count
  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return 0
    return countWeekdays(startDate, endDate)
  }, [startDate, endDate])

  // Effective applicant profile
  const effectiveUserId =
    filingMode === 'SELF'
      ? (user?.id || currentUser.id)
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

  // Update position prefill whenever applicant changes
  useEffect(() => {
    if (filingMode === 'SELF') {
      setPositionAtFiling(currentUser.position || '')
    } else if (targetType === 'REGISTERED' && effectiveApplicantProfile) {
      setPositionAtFiling(effectiveApplicantProfile.position || '')
    } else {
      setPositionAtFiling('')
    }
  }, [filingMode, targetType, effectiveApplicantProfile, currentUser])

  // Load dynamic leave types from DB
  useEffect(() => {
    let isMounted = true
    async function loadTypes() {
      try {
        const { data, error } = await supabase
          .from('leave_types')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (!error && data && data.length > 0 && isMounted) {
          setLeaveTypes(data as LeaveTypeRecord[])
        }
      } catch (err) {
        console.warn('Using fallback leave types:', err)
      } finally {
        if (isMounted) {
          setIsTypesLoading(false)
        }
      }
    }
    loadTypes()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!selectedUserId && availableProfiles.length > 0) {
      const firstNonAdmin = availableProfiles.find((p) => p.role === 'STAFF') || availableProfiles[0]
      setSelectedUserId(firstNonAdmin.id)
    }
  }, [availableProfiles, selectedUserId])

  // Live DSS check effect
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

      const activeTypeConfig = leaveTypes.find((t) => t.code === leaveType)
      const chargedTo = activeTypeConfig?.charged_to ?? 'NONE'
      const typeLabel = activeTypeConfig?.name ?? leaveType

      // Advance notice check fallback
      if (activeTypeConfig?.requires_advance_filing && startDate) {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays < activeTypeConfig.min_advance_days) {
          setDssRecommendation('NEEDS_REVIEW')
          setDssReason(
            `Notice requirement not met: Filed ${Math.max(0, diffDays)} day(s) before start date, required at least ${activeTypeConfig.min_advance_days} days.`
          )
          return
        }
      }

      const prof = effectiveApplicantProfile || currentUser
      let available = 0
      if (chargedTo === 'VL') available = prof.vacation_credits
      else if (chargedTo === 'SL') available = prof.sick_credits
      else available = 999

      if (available < totalDays) {
        setDssRecommendation('NEEDS_REVIEW')
        setDssReason(
          `Insufficient ${typeLabel} balance. Requested: ${totalDays} days, Available: ${available} days.`
        )
      } else {
        setDssRecommendation('RECOMMENDED')
        setDssReason(
          `Sufficient balance available (${available >= 999 ? 'Non-credit/Statutory' : `${available} days remaining`}). Duty staff coverage satisfied.`
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
  }, [effectiveUserId, leaveType, totalDays, startDate, endDate, effectiveApplicantProfile, currentUser, leaveTypes])

  const selectedTypeConfig = leaveTypes.find((t) => t.code === leaveType)

  const dssViewModel = useMemo(() => {
    if (!startDate || !endDate || (!dssRecommendation && !dssReason)) return null
    return parseDssFromRpc(dssRecommendation, dssReason, {
      leaveTypeName: selectedTypeConfig?.name || leaveType,
      startDate,
      endDate,
      requestedDays: totalDays,
    })
  }, [startDate, endDate, dssRecommendation, dssReason, selectedTypeConfig, leaveType, totalDays])

  // Earliest allowed start date according to leave_types configuration
  const minStartDate = useMemo(() => {
    const today = new Date()
    if (selectedTypeConfig?.requires_advance_filing && selectedTypeConfig.min_advance_days > 0) {
      today.setDate(today.getDate() + selectedTypeConfig.min_advance_days)
    }
    return today.toISOString().slice(0, 10)
  }, [selectedTypeConfig])

  // Advance filing violation check
  const isTooEarlyForAdvanceNotice = useMemo(() => {
    if (!selectedTypeConfig?.requires_advance_filing || !startDate) return false
    return startDate < minStartDate
  }, [selectedTypeConfig, startDate, minStartDate])
  const isVLorSPL = ['VL', 'FL', 'SPL'].includes(leaveType)
  const isSL = leaveType === 'SL'
  const isSLBW = leaveType === 'SLBW'
  const isStudy = leaveType === 'STUDY'
  const isOther = leaveType === 'OTHER'

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

    if (isTooEarlyForAdvanceNotice) {
      setSubmitError(
        `Advance filing notice requirement not met: ${selectedTypeConfig?.name || leaveType} must be filed at least ${selectedTypeConfig?.min_advance_days || 5} days before the start date. Earliest allowed start date is ${minStartDate}.`
      )
      return
    }

    if (filingMode === 'ON_BEHALF' && targetType === 'WALK_IN' && !walkInName.trim()) {
      setSubmitError('Please specify the full name of the walk-in employee.')
      return
    }

    // Prepare details payload according to CS Form 6 Section 6.B rules
    const detailsPayload: LeaveDetails = {}

    if (isVLorSPL) {
      if (!detailSpecify.trim()) {
        setSubmitError('Please specify the location/destination for vacation/privilege leave.')
        return
      }
      detailsPayload.location = detailLocation
      detailsPayload.specify = detailSpecify.trim()
    } else if (isSL) {
      if (!detailIllness.trim()) {
        setSubmitError('Please specify the illness or medical condition for sick leave.')
        return
      }
      detailsPayload.care_type = detailCareType
      detailsPayload.illness = detailIllness.trim()
    } else if (isSLBW) {
      if (!detailIllness.trim()) {
        setSubmitError('Please specify the illness or gynecological disorder for Special Leave Benefits for Women.')
        return
      }
      detailsPayload.illness = detailIllness.trim()
    } else if (isStudy) {
      detailsPayload.study_purpose = detailStudyPurpose
    } else if (isOther) {
      if (!detailSpecify.trim()) {
        setSubmitError('Please specify details for other leave category.')
        return
      }
      detailsPayload.specify = detailSpecify.trim()
    }

    if (detailOtherPurpose) {
      detailsPayload.other_purpose = detailOtherPurpose
    }

    if (effectiveApplicantProfile) {
      const activeTypeConfig = leaveTypes.find((t) => t.code === leaveType)
      const chargedTo = activeTypeConfig?.charged_to ?? 'NONE'
      let availableCredits = 999
      if (chargedTo === 'VL') availableCredits = effectiveApplicantProfile.vacation_credits
      else if (chargedTo === 'SL') availableCredits = effectiveApplicantProfile.sick_credits

      if (totalDays > availableCredits) {
        setSubmitError(
          `Requested ${totalDays} day(s) exceeds available remaining balance (${availableCredits} days) for ${activeTypeConfig?.name || leaveType}.`
        )
        return
      }
    }

    setIsSubmitting(true)

    try {
      const payload = {
        user_id: effectiveUserId,
        employee_name: effectiveEmployeeName,
        position_at_filing: positionAtFiling.trim() || null,
        leave_type: leaveType,
        other_leave_type: leaveType === 'OTHER' ? otherLeaveType.trim() || null : null,
        start_date: startDate,
        end_date: endDate,
        details: detailsPayload,
        commutation,
        reason: reason.trim() || null,
        status: 'PENDING' as const,
        created_by_admin_id: filingMode === 'ON_BEHALF' ? currentUser.id : null,
      }

      const { data, error } = await supabase.from('leave_applications').insert(payload).select()

      if (error) {
        throw new Error(error.message)
      }

      const inserted = data?.[0]
      const controlNum = inserted?.control_number || `Leave-${inserted?.id}`
      setSubmitSuccess(
        `Leave application ${controlNum} successfully filed under CS Form No. 6 and queued for executive review.`
      )

      // Reset form
      setReason('')
      setOtherLeaveType('')
      setDetailSpecify('')
      setDetailIllness('')
      setDetailOtherPurpose('')
      if (targetType === 'WALK_IN') setWalkInName('')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setSubmitError(`Failed to submit application: ${msg}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isInitialLoading = authLoading || devRoleLoading || settingsLoading || isTypesLoading
  const showSkeleton = useSkeletonDelayedLoading(isInitialLoading)

  if (showSkeleton) {
    return <LeaveFilingSkeleton />
  }

  if (!canFileSelf && !canFileOnBehalf) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader title="Apply for Leave" />
        <NotAuthorizedFallback message="Your current role does not have permission to file leave applications." />
      </div>
    )
  }

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={filingMode === 'ON_BEHALF' ? 'On-Behalf Leave Filing' : 'Apply for Leave'}
      />

      {/* Mode Switcher: visible to MHO_ADMIN and MHO_HEAD */}
      {canFileOnBehalf && (
        <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/70 p-2 text-xs">
          <span className="font-semibold text-teal-900 px-2">Filing Mode:</span>
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
            File for Myself
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
            File On Behalf / Walk-in
          </button>
        </div>
      )}

      {/* Main CS Form No. 6 Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        {/* Banner Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileSignature className="h-5 w-5 text-teal-400" />
            <div>
              <span className="text-3xs uppercase tracking-widest text-slate-400 font-semibold block">
                Civil Service Form No. 6 (Application for Leave, Revised 2020)
              </span>
              <h2 className="text-sm font-bold text-white">
                {settings.office_name} &bull; Municipality of Manolo Fortich
              </h2>
            </div>
          </div>
          <span className="text-2xs font-mono font-medium text-teal-300 bg-teal-950/60 border border-teal-800/80 px-2 py-0.5 rounded-md hidden sm:inline-block">
            CS Form 6
          </span>
        </div>

        <div className="p-5 md:p-6 space-y-5">
          {submitSuccess && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Application Filed Successfully</div>
                <div className="mt-0.5 text-emerald-800">{submitSuccess}</div>
              </div>
            </div>
          )}

          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">Submission Error</div>
                <div className="mt-0.5 text-rose-800">{submitError}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            {/* On-Behalf Target Selector */}
            {filingMode === 'ON_BEHALF' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                <label className="block text-2xs font-bold text-slate-700 uppercase tracking-wider">
                  Target Applicant
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
                    Registered Employee
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      checked={targetType === 'WALK_IN'}
                      onChange={() => setTargetType('WALK_IN')}
                      className="text-teal-700 focus:ring-teal-700 accent-teal-700"
                    />
                    Walk-in Personnel (Non-portal)
                  </label>
                </div>

                {targetType === 'REGISTERED' ? (
                  <div>
                    <label className="block text-2xs font-semibold text-slate-600 mb-1">
                      Select Personnel *
                    </label>
                    <select
                      value={effectiveUserId || ''}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                    >
                      {availableProfiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {formatLastFirst(p.full_name)} ({p.position || p.role})
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
                      placeholder="e.g. Dela Cruz, Juan M."
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Section 1 to 5: Form Header Fields (Form Order) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 space-y-3">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-600 block border-b border-slate-200 pb-1.5">
                Form Header Information
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr_1fr] gap-4 items-end">
                {/* 1. Office / Agency */}
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                    1. Office / Agency
                  </label>
                  <div
                    title={settings.office_name}
                    className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-xs flex items-center gap-2 overflow-hidden shadow-2xs"
                  >
                    <Building className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{settings.office_name}</span>
                  </div>
                </div>

                {/* 2. Name (Last, First, Middle) */}
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                    2. Name (Last, First, MI)
                  </label>
                  <div
                    title={formatLastFirst(effectiveEmployeeName) || 'Applicant Name'}
                    className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-semibold text-xs flex items-center gap-2 overflow-hidden shadow-2xs"
                  >
                    <User className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{formatLastFirst(effectiveEmployeeName) || 'Applicant Name'}</span>
                  </div>
                </div>

                {/* 3. Date of Filing */}
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                    3. Date of Filing
                  </label>
                  <div className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-xs flex items-center gap-2 overflow-hidden shadow-2xs">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{todayFormatted}</span>
                  </div>
                </div>

                {/* 4. Position */}
                <div className="flex flex-col justify-end gap-1.5">
                  <label className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                    4. Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={positionAtFiling}
                    onChange={(e) => setPositionAtFiling(e.target.value)}
                    placeholder="e.g. Nurse II, Midwife III"
                    className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 font-semibold shadow-2xs focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Balance Badge if registered applicant */}
              {effectiveApplicantProfile && (
                <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-2xs text-slate-600">
                  <span>Current Available Balances:</span>
                  <div className="flex gap-3 font-mono font-medium">
                    <span>
                      Vacation: <strong className="text-teal-900">{effectiveApplicantProfile.vacation_credits.toFixed(2)}</strong>
                    </span>
                    <span>
                      Sick: <strong className="text-emerald-800">{effectiveApplicantProfile.sick_credits.toFixed(2)}</strong>
                    </span>
                    <span>
                      Special Emergency: <strong className="text-amber-800">{effectiveApplicantProfile.emergency_credits.toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 6.A: Type of Leave */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                    6.A Type of Leave to be Availed of *
                  </label>
                  {selectedTypeConfig && (
                    <LeaveTypeBadge codeOrName={selectedTypeConfig.code} showName={false} />
                  )}
                </div>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 font-medium focus:border-teal-700 focus:bg-white focus:outline-hidden"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      [{t.code}] {t.name}
                    </option>
                  ))}
                </select>
                {selectedTypeConfig?.legal_basis && (
                  <p className="mt-1 text-2xs text-slate-500 italic">
                    Legal Basis: {selectedTypeConfig.legal_basis}
                  </p>
                )}
                {selectedTypeConfig?.requires_advance_filing && (
                  <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Advance Filing Notice Requirement:</span>{' '}
                      This leave must be filed at least {selectedTypeConfig.min_advance_days} days before the start date. Earliest start date:{' '}
                      <strong className="underline">{minStartDate}</strong>.
                    </div>
                  </div>
                )}
              </div>

              {leaveType === 'OTHER' && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Specific Leave Category *</label>
                  <input
                    type="text"
                    required
                    value={otherLeaveType}
                    onChange={(e) => setOtherLeaveType(e.target.value)}
                    placeholder="e.g. Special Leave Benefit..."
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Section 6.B: Details of Leave (Conditional per Form 6 Rules) */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3.5">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-800 block border-b border-slate-200 pb-1.5">
                6.B Details of Leave (Specific Circumstances)
              </span>

              {/* Vacation / Forced / Special Privilege Leave */}
              {isVLorSPL && (
                <div className="space-y-3">
                  <div className="flex gap-4 text-xs font-medium text-slate-800">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="detailLocation"
                        value="within_philippines"
                        checked={detailLocation === 'within_philippines'}
                        onChange={() => setDetailLocation('within_philippines')}
                        className="text-teal-700 accent-teal-700"
                      />
                      Within the Philippines
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="detailLocation"
                        value="abroad"
                        checked={detailLocation === 'abroad'}
                        onChange={() => setDetailLocation('abroad')}
                        className="text-teal-700 accent-teal-700"
                      />
                      Abroad
                    </label>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 mb-1">
                      Specify Location / Destination *
                    </label>
                    <input
                      type="text"
                      required
                      value={detailSpecify}
                      onChange={(e) => setDetailSpecify(e.target.value)}
                      placeholder={
                        detailLocation === 'within_philippines'
                          ? 'e.g. Davao City, Cagayan de Oro'
                          : 'e.g. Tokyo, Japan'
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Sick Leave */}
              {isSL && (
                <div className="space-y-3">
                  <div className="flex gap-4 text-xs font-medium text-slate-800">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="detailCareType"
                        value="in_hospital"
                        checked={detailCareType === 'in_hospital'}
                        onChange={() => setDetailCareType('in_hospital')}
                        className="text-teal-700 accent-teal-700"
                      />
                      In Hospital (Specify Illness)
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="detailCareType"
                        value="out_patient"
                        checked={detailCareType === 'out_patient'}
                        onChange={() => setDetailCareType('out_patient')}
                        className="text-teal-700 accent-teal-700"
                      />
                      Out Patient (Specify Illness)
                    </label>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 mb-1">
                      Illness / Diagnosis *
                    </label>
                    <input
                      type="text"
                      required
                      value={detailIllness}
                      onChange={(e) => setDetailIllness(e.target.value)}
                      placeholder="e.g. Acute Upper Respiratory Tract Infection, Dengue..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Special Leave Benefits for Women */}
              {isSLBW && (
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Illness / Gynecological Disorder *
                  </label>
                  <input
                    type="text"
                    required
                    value={detailIllness}
                    onChange={(e) => setDetailIllness(e.target.value)}
                    placeholder="Specify gynecological disorder / surgery details..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              )}

              {/* Study Leave */}
              {isStudy && (
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Study Purpose *
                  </label>
                  <select
                    value={detailStudyPurpose}
                    onChange={(e) => setDetailStudyPurpose(e.target.value as 'masters_completion' | 'bar_board_review')}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                  >
                    <option value="masters_completion">Completion of Master's Degree</option>
                    <option value="bar_board_review">BAR / Board Examination Review</option>
                  </select>
                </div>
              )}

              {/* Other Purpose (Monetization / Terminal) */}
              <div>
                <label className="block text-2xs font-semibold text-slate-700 mb-1">
                  Other Purpose (Optional)
                </label>
                <select
                  value={detailOtherPurpose}
                  onChange={(e) => setDetailOtherPurpose(e.target.value as '' | 'monetization' | 'terminal_leave')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                >
                  <option value="">None / Standard Leave</option>
                  <option value="monetization">Monetization of Leave Credits</option>
                  <option value="terminal_leave">Terminal Leave</option>
                </select>
              </div>

              {/* Generic specify for OTHER or other categories */}
              {isOther && (
                <div>
                  <label className="block text-2xs font-semibold text-slate-700 mb-1">
                    Specific Details / Justification *
                  </label>
                  <input
                    type="text"
                    required
                    value={detailSpecify}
                    onChange={(e) => setDetailSpecify(e.target.value)}
                    placeholder="Provide required details..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              )}
            </div>

            {/* Section 6.C: Inclusive Dates & Working Days */}
            <div className="space-y-3">
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-800 block">
                6.C Inclusive Dates & Number of Working Days
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    min={selectedTypeConfig?.requires_advance_filing ? minStartDate : undefined}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-1.5 text-xs text-slate-900 focus:outline-hidden ${
                      isTooEarlyForAdvanceNotice
                        ? 'border-red-400 bg-red-50 focus:border-red-500'
                        : 'border-slate-300 bg-slate-50 focus:border-teal-700 focus:bg-white'
                    }`}
                  />
                  {isTooEarlyForAdvanceNotice && (
                    <p className="mt-1 text-2xs font-semibold text-red-600">
                      Cannot start earlier than {minStartDate} ({selectedTypeConfig?.min_advance_days || 5} days advance notice required).
                    </p>
                  )}
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    min={startDate || (selectedTypeConfig?.requires_advance_filing ? minStartDate : undefined)}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-slate-700">
                  <Clock className="h-3.5 w-3.5 text-teal-700" />
                  Working Days (Excluding Weekends):
                </span>
                <span className={`font-bold text-sm ${totalDays > 0 ? 'text-teal-900' : 'text-slate-400'}`}>
                  {totalDays} day(s)
                </span>
              </div>
            </div>

            {/* Section 6.D: Commutation */}
            <div>
              <span className="text-2xs uppercase tracking-wider font-bold text-slate-800 block mb-1.5">
                6.D Commutation
              </span>
              <div className="flex gap-5 text-xs font-medium text-slate-800">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="commutation"
                    value="not_requested"
                    checked={commutation === 'not_requested'}
                    onChange={() => setCommutation('not_requested')}
                    className="text-teal-700 accent-teal-700"
                  />
                  Not Requested
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="commutation"
                    value="requested"
                    checked={commutation === 'requested'}
                    onChange={() => setCommutation('requested')}
                    className="text-teal-700 accent-teal-700"
                  />
                  Requested
                </label>
              </div>
            </div>

            {/* Live DSS Advisory Evaluation (Restricted to Management: Admin / Head) */}
            {startDate && endDate && ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser?.role) && (
              <DssAdvisoryCard
                viewModel={dssViewModel}
                isLoading={isDssLoading}
                isAdmin={currentUser?.role === 'MHO_ADMIN'}
              />
            )}

            {/* Remarks / Justification */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Additional Remarks / Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional notes or remarks..."
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-hidden"
              />
            </div>

            {/* Submit Button & Inline Notice */}
            <div className="space-y-2">
              {isTooEarlyForAdvanceNotice && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Filing Blocked:</span> This leave type requires at least{' '}
                    {selectedTypeConfig?.min_advance_days || 5} days advance notice. Earliest allowed start date is{' '}
                    <strong>{minStartDate}</strong>.
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || isInitialLoading || totalDays <= 0 || isTooEarlyForAdvanceNotice}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Leave Application
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LeaveFilingPage
