import React, { useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Calendar,
} from 'lucide-react'
import type { Database } from '../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

interface DecisionDialogProps {
  application: LeaveApplication | null
  action: 'APPROVE' | 'REJECT' | null
  isOpen: boolean
  isProcessing: boolean
  onClose: () => void
  onConfirm: (applicationId: number, remarks: string) => Promise<void>
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

  if (!isOpen || !application || !action) return null

  const isApprove = action === 'APPROVE'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onConfirm(application.id, remarks.trim())
    setRemarks('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-soft space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
              isApprove ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {isApprove ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {isApprove ? 'Approve Leave Application' : 'Reject Leave Application'}
            </h3>
            <p className="text-xs text-slate-500">
              Application #{application.id} &bull; {application.employee_name || 'Walk-in Staff'}
            </p>
          </div>
        </div>

        {/* Application Summary Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="font-semibold text-slate-900">Category:</span> {application.leave_type}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Duration:</span>{' '}
              {application.total_days} working day(s)
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>
              {application.start_date} to {application.end_date}
            </span>
          </div>
          {application.reason && (
            <div className="border-t border-slate-200 pt-2 text-slate-600 italic">
              "{application.reason}"
            </div>
          )}
        </div>

        {/* DSS Advisory Notice */}
        {application.dss_recommendation && (
          <div
            className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
              application.dss_recommendation.includes('RECOMMENDED')
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-amber-200 bg-amber-50 text-amber-900'
            }`}
          >
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">DSS Recommendation:</span>{' '}
              {application.dss_recommendation}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Administrative Review Remarks {isApprove ? '(Optional)' : '(Required for rejection)'}
            </label>
            <textarea
              rows={3}
              required={!isApprove}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={
                isApprove
                  ? 'e.g. Approved. Duty staffing schedule verified.'
                  : 'e.g. Disapproved due to high patient volume on requested dates.'
              }
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 transition-all"
            />
          </div>

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
              {isApprove ? 'Confirm Approval & Deduct Credits' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
