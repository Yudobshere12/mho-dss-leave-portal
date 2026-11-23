import React from 'react'
import {
  X,
  FileText,
  Calendar,
  User,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
} from 'lucide-react'
import { LeaveTypeBadge } from './LeaveTypeBadge'
import { DssBadge } from './DssBadge'
import { DssAdvisoryCard } from './DssAdvisoryCard'
import { parseDssFromColumn } from '../lib/dssPresenter'
import type { Database, CreditsSnapshot } from '../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

interface CSForm6DetailModalProps {
  application: LeaveApplication | null
  isOpen: boolean
  onClose: () => void
  officeName?: string
  hrmoName?: string
  hrmoTitle?: string
  mhoName?: string
  mhoTitle?: string
}

export const CSForm6DetailModal: React.FC<CSForm6DetailModalProps> = ({
  application,
  isOpen,
  onClose,
  officeName = 'Office of the Municipal Health',
  hrmoName = 'Catherine C. Gatchalian',
  hrmoTitle = 'MGDH I - HRMO',
  mhoName = 'Joanne Marie V. Dueñas',
  mhoTitle = 'Municipal Health Officer',
}) => {
  if (!isOpen || !application) return null

  const details = application.details || {}
  const snapshot = application.credits_snapshot as CreditsSnapshot | null

  // Format name Last, First, Middle
  const formatFullName = (rawName: string | null) => {
    if (!rawName) return 'N/A'
    const parts = rawName.trim().split(/\s+/)
    if (parts.length <= 1) return rawName
    const last = parts[parts.length - 1]
    const rest = parts.slice(0, parts.length - 1).join(' ')
    return `${last}, ${rest}`
  }

  const dssViewModel = application.dss_recommendation
    ? parseDssFromColumn(application.dss_recommendation, {
        leaveTypeName: application.leave_type,
        startDate: application.start_date,
        endDate: application.end_date,
        requestedDays: application.working_days ?? application.total_days,
      })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto sm:my-6 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden max-h-[92dvh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Form 6 Top Header Banner */}
        <div className="bg-slate-900 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-teal-400 shrink-0" />
            <div>
              <span className="text-2xs uppercase tracking-widest text-slate-400 font-semibold block">
                Civil Service Form No. 6 (Revised 2020)
              </span>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Application for Leave</span>
                <span className="text-3xs sm:text-xs font-mono font-medium text-teal-300 bg-teal-950/60 border border-teal-800/80 px-2 py-0.5 rounded-md">
                  {application.control_number || `Leave-${application.id}`}
                </span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body - CS Form 6 Layout */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-800 flex-1">
          {/* Header Metadata Block */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1.2fr_1fr_1fr_1fr_1fr] gap-4 items-end">
            <div className="flex flex-col justify-end gap-1.5">
              <span className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                1. Office / Agency
              </span>
              <div
                title={officeName}
                className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-xs flex items-center gap-2 overflow-hidden shadow-2xs"
              >
                <Building className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{officeName}</span>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <span className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                2. Name (Last, First, MI)
              </span>
              <div
                title={formatFullName(application.employee_name)}
                className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-semibold text-xs flex items-center gap-2 overflow-hidden shadow-2xs"
              >
                <User className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{formatFullName(application.employee_name)}</span>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <span className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                3. Date of Filing
              </span>
              <div className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-800 font-semibold text-xs flex items-center gap-2 overflow-hidden shadow-2xs">
                <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                <span className="truncate">{application.date_of_filing || application.created_at?.slice(0, 10)}</span>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <span className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                4. Position
              </span>
              <div
                title={application.position_at_filing || 'Staff'}
                className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 font-semibold text-xs flex items-center overflow-hidden shadow-2xs"
              >
                <span className="truncate">{application.position_at_filing || 'Staff'}</span>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <span className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                Control Number
              </span>
              <div className="h-10 px-3 rounded-lg bg-white border border-slate-300 font-mono font-semibold text-teal-800 text-xs flex items-center overflow-hidden shadow-2xs">
                <span className="truncate">{application.control_number || 'N/A'}</span>
              </div>
            </div>

            <div className="flex flex-col justify-end gap-1.5">
              <span className="block text-xs uppercase font-bold text-slate-500 tracking-wide whitespace-nowrap">
                Current Status
              </span>
              <div className="h-10 px-3 rounded-lg bg-white border border-slate-300 flex items-center overflow-hidden shadow-2xs">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold ${
                    application.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : application.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {application.status === 'APPROVED' && <CheckCircle2 className="h-3 w-3" />}
                  {application.status === 'REJECTED' && <XCircle className="h-3 w-3" />}
                  {application.status === 'PENDING' && <Clock className="h-3 w-3" />}
                  <span>{application.status}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Section 6: Details of Application */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 uppercase tracking-wider text-2xs border-b border-slate-200">
              6. Details of Application
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 6.A Type of Leave */}
              <div className="space-y-1.5">
                <span className="text-3xs uppercase font-bold text-slate-500 block">6.A Type of Leave to be Availed</span>
                <div className="flex items-center gap-2">
                  <LeaveTypeBadge codeOrName={application.leave_type} />
                </div>
                {application.other_leave_type && (
                  <p className="text-2xs text-slate-600 mt-1">
                    Specific category: <strong className="text-slate-900">{application.other_leave_type}</strong>
                  </p>
                )}
              </div>

              {/* 6.B Details of Leave */}
              <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <span className="text-3xs uppercase font-bold text-slate-500 block">6.B Details of Leave</span>
                {details.location && (
                  <div>
                    <span className="text-slate-500">Location:</span>{' '}
                    <span className="font-semibold text-slate-900 capitalize">
                      {details.location.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {details.care_type && (
                  <div>
                    <span className="text-slate-500">Medical Care:</span>{' '}
                    <span className="font-semibold text-slate-900 capitalize">
                      {details.care_type.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {details.illness && (
                  <div>
                    <span className="text-slate-500">Illness / Diagnosis:</span>{' '}
                    <span className="font-semibold text-slate-900">{details.illness}</span>
                  </div>
                )}
                {details.study_purpose && (
                  <div>
                    <span className="text-slate-500">Study Purpose:</span>{' '}
                    <span className="font-semibold text-slate-900 capitalize">
                      {details.study_purpose.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {details.other_purpose && (
                  <div>
                    <span className="text-slate-500">Purpose:</span>{' '}
                    <span className="font-semibold text-slate-900 capitalize">
                      {details.other_purpose.replace('_', ' ')}
                    </span>
                  </div>
                )}
                {details.specify && (
                  <div>
                    <span className="text-slate-500">Specified Detail:</span>{' '}
                    <span className="font-semibold text-slate-900">{details.specify}</span>
                  </div>
                )}
                {application.reason && (
                  <div className="pt-1 text-slate-600 italic">
                    Applicant note: "{application.reason}"
                  </div>
                )}
              </div>

              {/* 6.C Number of Working Days */}
              <div className="space-y-1">
                <span className="text-3xs uppercase font-bold text-slate-500 block">6.C Number of Working Days</span>
                <div className="text-base font-bold text-teal-900">
                  {application.working_days ?? application.total_days} day(s)
                </div>
                <div className="text-2xs text-slate-500">
                  Inclusive Dates: {application.start_date} to {application.end_date}
                </div>
              </div>

              {/* 6.D Commutation */}
              <div className="space-y-1">
                <span className="text-3xs uppercase font-bold text-slate-500 block">6.D Commutation</span>
                <span
                  className={`inline-block px-2.5 py-1 rounded-md text-2xs font-semibold ${
                    application.commutation === 'requested'
                      ? 'bg-teal-100 text-teal-800 border border-teal-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {application.commutation === 'requested' ? 'Requested' : 'Not Requested'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 7.A: Certification of Leave Credits */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 uppercase tracking-wider text-2xs border-b border-slate-200 flex justify-between items-center">
              <span>7.A Certification of Leave Credits</span>
              <span className="text-3xs normal-case text-slate-500 font-normal">
                As of {snapshot?.as_of_date || application.date_of_filing}
              </span>
            </div>
            <div className="p-3">
              <table className="w-full text-center border-collapse text-2xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="py-1.5 px-2 text-left">Leave Particulars</th>
                    <th className="py-1.5 px-2">Vacation Leave</th>
                    <th className="py-1.5 px-2">Sick Leave</th>
                    <th className="py-1.5 px-2 bg-slate-100">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  <tr>
                    <td className="py-1.5 px-2 text-left font-medium text-slate-600">Total Earned</td>
                    <td className="py-1.5 px-2 font-mono font-medium">
                      {snapshot ? Number(snapshot.vacation?.total_earned ?? 0).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-medium">
                      {snapshot ? Number(snapshot.sick?.total_earned ?? 0).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-semibold bg-slate-50/70">
                      {snapshot ? Number(snapshot.total?.total_earned ?? 0).toFixed(2) : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 px-2 text-left font-medium text-slate-600">Less this application</td>
                    <td className="py-1.5 px-2 font-mono font-medium text-red-600">
                      {snapshot ? Number(snapshot.vacation?.less_this_app ?? 0).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-medium text-red-600">
                      {snapshot ? Number(snapshot.sick?.less_this_app ?? 0).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-semibold text-red-700 bg-slate-50/70">
                      {snapshot ? Number(snapshot.total?.less_this_app ?? 0).toFixed(2) : '—'}
                    </td>
                  </tr>
                  <tr className="font-bold bg-teal-50/40 text-teal-950">
                    <td className="py-1.5 px-2 text-left text-teal-900">Balance</td>
                    <td className="py-1.5 px-2 font-mono">
                      {snapshot ? Number(snapshot.vacation?.balance ?? 0).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 px-2 font-mono">
                      {snapshot ? Number(snapshot.sick?.balance ?? 0).toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 px-2 font-mono text-teal-900 bg-teal-100/50">
                      {snapshot ? Number(snapshot.total?.balance ?? 0).toFixed(2) : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-3 pt-2 border-t border-slate-100 flex justify-end">
                <div className="text-right">
                  <div className="font-bold text-slate-900 text-2xs uppercase tracking-wider">{hrmoName}</div>
                  <div className="text-3xs text-slate-500">{hrmoTitle}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7.B: Recommendation (DSS Generated) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 uppercase tracking-wider text-2xs border-b border-slate-200 flex justify-between items-center">
              <span>7.B Recommendation (DSS Engine Evaluation)</span>
              <DssBadge recommendation={application.dss_recommendation} />
            </div>
            <div className="p-3.5 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">System Recommendation:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-2xs uppercase ${
                    application.recommendation === 'for_approval'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {application.recommendation === 'for_approval' ? 'For Approval' : 'For Disapproval'}
                </span>
              </div>
              {application.recommendation_reason && (
                <p className="text-2xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  <strong className="text-slate-900">Reason / Basis:</strong> {application.recommendation_reason}
                </p>
              )}

              {/* Enhanced Presentation Card */}
              {dssViewModel && (
                <DssAdvisoryCard viewModel={dssViewModel} isAdmin={true} />
              )}
            </div>
          </div>

          {/* Section 7.C & 7.D: Action on Application (Final Decision) */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 uppercase tracking-wider text-2xs border-b border-slate-200">
              7.C & 7.D Final Executive Action
            </div>
            <div className="p-4 space-y-3">
              {application.status === 'APPROVED' ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950 space-y-2">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                    <span>7.D Approved Breakdown</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-3xs uppercase font-bold text-slate-500 block">Days with Pay</span>
                      <span className="font-bold text-emerald-900 text-sm">
                        {application.approved_days_with_pay ?? application.working_days ?? application.total_days} days
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-3xs uppercase font-bold text-slate-500 block">Days without Pay</span>
                      <span className="font-bold text-slate-700 text-sm">
                        {application.approved_days_without_pay ?? 0} days
                      </span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-emerald-200">
                      <span className="text-3xs uppercase font-bold text-slate-500 block">Others (Specify)</span>
                      <span className="text-xs text-slate-800 font-medium">
                        {application.approved_others || 'None'}
                      </span>
                    </div>
                  </div>
                  {application.admin_remarks && (
                    <div className="pt-2 text-2xs border-t border-emerald-200/60 text-emerald-900">
                      <strong>Remarks:</strong> {application.admin_remarks}
                    </div>
                  )}
                </div>
              ) : application.status === 'REJECTED' ? (
                <div className="rounded-xl border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-red-900">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>7.D Disapproved Due To</span>
                  </div>
                  <p className="bg-white p-2.5 rounded-lg border border-red-200 font-medium text-red-900">
                    {application.disapproval_reason || application.admin_remarks || 'Not specified'}
                  </p>
                </div>
              ) : (
                <div className="text-slate-500 italic p-2 bg-slate-50 rounded-lg border border-slate-200">
                  Application is currently PENDING review by the Municipal Health Officer.
                </div>
              )}

              {/* MHO Signatory Footer */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <div className="text-3xs text-slate-400">
                  Processed: {application.processed_at ? new Date(application.processed_at).toLocaleString() : 'Pending'}
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900 text-2xs uppercase tracking-wider">{mhoName}</div>
                  <div className="text-3xs text-slate-500">{mhoTitle}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-full bg-slate-900 px-5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
