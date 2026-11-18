import React, { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
} from 'lucide-react'
import { LeaveTypeBadge } from './LeaveTypeBadge'
import { DssAdvisoryCard } from './DssAdvisoryCard'
import { parseDssFromColumn } from '../lib/dssPresenter'
import type { Database } from '../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

export interface ApprovalPayload {
  approved_days_with_pay: number
  approved_days_without_pay: number
  approved_others: string | null
  remarks: string | null
}

export interface RejectionPayload {
  disapproval_reason: string
  remarks: string | null
}

interface DecisionDialogProps {
  application: LeaveApplication | null
  action: 'APPROVE' | 'REJECT' | null
  isOpen: boolean
  isProcessing: boolean
  onClose: () => void
  onConfirm: (
    applicationId: number,
    decisionPayload: ApprovalPayload | RejectionPayload | string
  ) => Promise<void>
}

export const DecisionDialog: React.FC<DecisionDialogProps> = ({
  application,
  action,
  isOpen,
  isProcessing,
  onClose,
  onConfirm,
}) => {
  const [remarks, setRemarks] = useState('')
  const [daysWithPay, setDaysWithPay] = useState<number>(0)
  const [daysWithoutPay, setDaysWithoutPay] = useState<number>(0)
  const [approvedOthers, setApprovedOthers] = useState<string>('')
  const [disapprovalReason, setDisapprovalReason] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)

  // Initialize form fields when opening dialog
  useEffect(() => {
    if (application) {
      const workingDays = application.working_days ?? application.total_days
      setDaysWithPay(workingDays)
      setDaysWithoutPay(0)
      setApprovedOthers('')
      setRemarks('')
      setDisapprovalReason('')
      setValidationError(null)
    }
  }, [application, action])

  const workingDays = application ? (application.working_days ?? application.total_days) : 0

  const dssViewModel = useMemo(() => {
    if (!application?.dss_recommendation) return null
    return parseDssFromColumn(application.dss_recommendation, {
      leaveTypeName: application.leave_type,
      startDate: application.start_date,
      endDate: application.end_date,
      requestedDays: workingDays,
    })
  }, [application, workingDays])

  if (!isOpen || !application || !action) return null

  const isApprove = action === 'APPROVE'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)

    if (isApprove) {
      const totalDecidedDays = Number(daysWithPay) + Number(daysWithoutPay)
      if (totalDecidedDays > workingDays) {
        setValidationError(
          `Sum of days with pay (${daysWithPay}) and days without pay (${daysWithoutPay}) cannot exceed total working days (${workingDays}).`
        )
        return
      }

      await onConfirm(application.id, {
        approved_days_with_pay: Number(daysWithPay),
        approved_days_without_pay: Number(daysWithoutPay),
        approved_others: approvedOthers.trim() || null,
        remarks: remarks.trim() || null,
      })
    } else {
      if (!disapprovalReason.trim()) {
        setValidationError('Disapproval reason is required by CS Form No. 6.')
        return
      }

      await onConfirm(application.id, {
        disapproval_reason: disapprovalReason.trim(),
        remarks: remarks.trim() || null,
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg my-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-soft space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isApprove
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {isApprove ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isApprove ? 'Approve Leave Application (7.D)' : 'Disapprove Leave Application (7.D)'}
            </h3>
            <p className="text-xs text-slate-500">
              {application.control_number || `Application #${application.id}`} &bull; {application.employee_name || 'Walk-in Staff'}
            </p>
          </div>
        </div>

        {/* Application Summary Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-900">Category:</span>{' '}
              <LeaveTypeBadge codeOrName={application.leave_type} />
            </div>
            <div>
              <span className="font-semibold text-slate-900">Working Days:</span>{' '}
              <span className="font-bold text-teal-900">{workingDays} day(s)</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {application.start_date} to {application.end_date}
            </span>
          </div>
        </div>

        {/* DSS Advisory Notice */}
        {application.dss_recommendation && (
          <DssAdvisoryCard
            viewModel={dssViewModel}
            isAdmin={true}
          />
        )}

        {validationError && (
          <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 border border-red-200 font-medium">
            {validationError}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isApprove ? (
            /* Approve Form Fields */
            <div className="space-y-3 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-200">
              <span className="text-2xs uppercase tracking-wider font-bold text-emerald-900 block">
                Civil Service Form 6 Section 7.D Approval Breakdown
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">
                    Days with Pay *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={workingDays}
                    required
                    value={daysWithPay}
                    onChange={(e) => setDaysWithPay(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-700 mb-1">
                    Days without Pay *
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={workingDays}
                    required
                    value={daysWithoutPay}
                    onChange={(e) => setDaysWithoutPay(parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 font-semibold focus:border-teal-700 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">
                  Others (Specify)
                </label>
                <input
                  type="text"
                  value={approvedOthers}
                  onChange={(e) => setApprovedOthers(e.target.value)}
                  placeholder="e.g. Subject to availability of replacement nurse"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">
                  Administrative Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Approved. Duty staffing schedule verified."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-hidden"
                />
              </div>
            </div>
          ) : (
            /* Rejection Form Fields */
            <div className="space-y-3 bg-red-50/40 p-3.5 rounded-xl border border-red-200">
              <span className="text-2xs uppercase tracking-wider font-bold text-red-900 block">
                Civil Service Form 6 Section 7.D Disapproval Reason
              </span>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">
                  Disapproval Reason *
                </label>
                <textarea
                  rows={3}
                  required
                  value={disapprovalReason}
                  onChange={(e) => setDisapprovalReason(e.target.value)}
                  placeholder="e.g. Coverage critical: Approving this leave would drop clinic duty staff below minimum safe threshold."
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-red-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-700 mb-1">
                  Additional Internal Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Applicant notified via SMS"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-red-600 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onClose}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold text-white shadow-soft transition-all disabled:opacity-50 ${
                isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-600/30'
                  : 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-600/30'
              }`}
            >
              {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isApprove ? 'Confirm Approval (CS Form 6)' : 'Confirm Disapproval (CS Form 6)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
