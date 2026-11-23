import React, { useState, useEffect } from 'react'
import {
  Calendar,
  Clock,
  RotateCcw,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { DssBadge } from '../../components/DssBadge'
import { DecisionDialog, type ApprovalPayload, type RejectionPayload } from '../../components/DecisionDialog'
import { CSForm6DetailModal } from '../../components/CSForm6DetailModal'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { LeaveTypeBadge } from '../../components/LeaveTypeBadge'
import { ApprovalQueueSkeleton } from './ApprovalQueueSkeleton'
import { useSkeletonDelayedLoading } from '../../hooks/useSkeletonLoading'
import { useSystemSettings } from '../../lib/systemSettings'
import type { Database } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

export const ApprovalQueueScreen: React.FC = () => {
  const { currentUser } = useDevRole()
  const { settings } = useSystemSettings()

  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const showSkeleton = useSkeletonDelayedLoading(isLoading)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Decision Modal State
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null)
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  // Form 6 Details Modal State
  const [detailModalApp, setDetailModalApp] = useState<LeaveApplication | null>(null)

  const canDecide = currentUser.role === 'MHO_HEAD'

  const fetchPendingQueue = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }
      setApplications(data || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setErrorMessage(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingQueue()
  }, [])

  const handleOpenDialog = (app: LeaveApplication, action: 'APPROVE' | 'REJECT') => {
    setSelectedApp(app)
    setDecisionAction(action)
  }

  const handleConfirmDecision = async (
    applicationId: number,
    decisionPayload: ApprovalPayload | RejectionPayload | string
  ) => {
    setIsProcessing(true)
    setFeedback(null)

    try {
      if (decisionAction === 'APPROVE') {
        const payload: ApprovalPayload =
          typeof decisionPayload === 'object' && 'approved_days_with_pay' in decisionPayload
            ? decisionPayload
            : {
                approved_days_with_pay: 0,
                approved_days_without_pay: 0,
                approved_others: null,
                remarks: typeof decisionPayload === 'string' ? decisionPayload : null,
              }

        const { error } = await supabase.rpc('approve_leave', {
          p_leave_id: applicationId,
          p_approved_days_with_pay: payload.approved_days_with_pay,
          p_approved_days_without_pay: payload.approved_days_without_pay,
          p_approved_others: payload.approved_others,
          p_remarks: payload.remarks,
        })
        if (error) throw new Error(error.message)
      } else {
        const payload: RejectionPayload =
          typeof decisionPayload === 'object' && 'disapproval_reason' in decisionPayload
            ? decisionPayload
            : {
                disapproval_reason:
                  typeof decisionPayload === 'string' ? decisionPayload : 'Disapproved by MHO Head',
                remarks: null,
              }

        const { error } = await supabase.rpc('reject_leave', {
          p_leave_id: applicationId,
          p_disapproval_reason: payload.disapproval_reason,
          p_remarks: payload.remarks,
        })
        if (error) throw new Error(error.message)
      }

      setFeedback({
        type: 'success',
        message: `Application #${applicationId} marked as ${decisionAction}.`,
      })

      setApplications((prev) => prev.filter((a) => a.id !== applicationId))
      setSelectedApp(null)
      setDecisionAction(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      setFeedback({
        type: 'error',
        message: `Failed to process decision: ${msg}`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Approval Queue"
        action={
          <button
            onClick={fetchPendingQueue}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        }
      />

      {feedback && (
        <div
          className={`flex items-center justify-between rounded-xl p-4 text-xs font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline ml-4 hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Reviewer Notice */}
      <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-4 text-xs text-teal-900 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <span>Reviewing as: </span>
          <strong>{currentUser.full_name}</strong>
          <span className="text-teal-700 font-normal"> ({currentUser.role})</span>
        </div>
        <div className="text-2xs text-teal-800">
          Signatory: <strong>{settings.mho_name}</strong> ({settings.mho_title})
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft space-y-4">
        {showSkeleton ? (
          <ApprovalQueueSkeleton />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={fetchPendingQueue} />
        ) : applications.length === 0 ? (
          <EmptyState
            title="Approval Queue Clean"
            description="There are currently no leave applications awaiting executive review."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-xs shadow-2xs hover:border-slate-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">
                      {app.employee_name || 'Walk-in Applicant'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-3xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                        {app.control_number || `Leave-${app.id}`}
                      </span>
                      {app.position_at_filing && (
                        <span className="text-3xs text-slate-500">{app.position_at_filing}</span>
                      )}
                    </div>
                  </div>
                  <DssBadge recommendation={app.dss_recommendation} />
                </div>

                <div className="space-y-1.5 text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">Type:</span>{' '}
                    <LeaveTypeBadge codeOrName={app.leave_type} />
                    {app.other_leave_type && (
                      <span className="text-2xs text-slate-500 truncate">({app.other_leave_type})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {app.start_date} &rarr; {app.end_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-teal-800">
                    <Clock className="h-3.5 w-3.5 text-teal-700" />
                    <span>{app.working_days ?? app.total_days} Working Day(s)</span>
                  </div>
                </div>

                {app.reason && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
                    "{app.reason}"
                  </p>
                )}

                <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-2 border-t border-slate-100 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xs text-slate-400">
                      Filed {app.date_of_filing || new Date(app.created_at).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailModalApp(app)}
                      className="inline-flex items-center gap-1 text-2xs font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                    >
                      <FileText className="h-3 w-3" />
                      View Form 6
                    </button>
                  </div>

                  {canDecide ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenDialog(app, 'REJECT')}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Disapprove
                      </button>
                      <button
                        onClick={() => handleOpenDialog(app, 'APPROVE')}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    </div>
                  ) : (
                    <span className="text-2xs text-slate-500 italic">
                      Review restricted to Office Head.
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DecisionDialog
        application={selectedApp}
        action={decisionAction}
        isOpen={Boolean(selectedApp && decisionAction)}
        isProcessing={isProcessing}
        onClose={() => {
          setSelectedApp(null)
          setDecisionAction(null)
        }}
        onConfirm={handleConfirmDecision}
      />

      <CSForm6DetailModal
        application={detailModalApp}
        isOpen={Boolean(detailModalApp)}
        onClose={() => setDetailModalApp(null)}
        officeName={settings.office_name}
        hrmoName={settings.hrmo_name}
        hrmoTitle={settings.hrmo_title}
        mhoName={settings.mho_name}
        mhoTitle={settings.mho_title}
      />
    </div>
  )
}

export default ApprovalQueueScreen
