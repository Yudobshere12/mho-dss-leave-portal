import React, { useState, useEffect } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  RotateCcw,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { DssBadge } from '../../components/DssBadge'
import { DecisionDialog } from '../../components/DecisionDialog'
import { PageHeader } from '../../components/PageHeader'
import { LoadingState } from '../../components/LoadingState'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import type { Database } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

export const ApprovalQueueScreen: React.FC = () => {
  const { currentUser } = useDevRole()

  const canDecide = ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)

  const [applications, setApplications] = useState<LeaveApplication[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Dialog state
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null)
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const fetchPendingQueue = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

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

  const handleConfirmDecision = async (applicationId: number, remarks: string) => {
    setIsProcessing(true)
    setFeedback(null)

    try {
      if (decisionAction === 'APPROVE') {
        const { error } = await supabase.rpc('approve_leave', {
          p_leave_id: applicationId,
          p_admin_id: currentUser.id,
          p_remarks: remarks || null,
        })
        if (error) throw new Error(error.message)
      } else {
        const { error } = await supabase.rpc('reject_leave', {
          p_leave_id: applicationId,
          p_admin_id: currentUser.id,
          p_remarks: remarks || null,
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
        title="Approval Queue"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPendingQueue}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
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

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-4 w-4 text-teal-700" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Pending Applications ({applications.length})
            </h2>
          </div>
          <span className="text-2xs text-slate-500">
            Reviewer: <strong>{currentUser.full_name}</strong>
          </span>
        </div>

        {isLoading ? (
          <LoadingState message="Loading pending approval queue..." />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={fetchPendingQueue} />
        ) : applications.length === 0 ? (
          <EmptyState
            title="No pending applications"
            description="All filed leave applications have been reviewed."
          />
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-200 p-4 space-y-3 hover:border-teal-200 hover:shadow-xs transition-all bg-white"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      {app.employee_name || 'Walk-in Personnel'}
                    </span>
                    <span className="text-2xs text-slate-400">#APP-{app.id}</span>
                    {app.user_id === null && (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-2xs font-bold text-amber-800">
                        Walk-in
                      </span>
                    )}
                  </div>
                  <DssBadge recommendation={app.dss_recommendation} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">Type:</span> {app.leave_type}
                    {app.other_leave_type && ` (${app.other_leave_type})`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {app.start_date} &rarr; {app.end_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-teal-800">
                    <Clock className="h-3.5 w-3.5 text-teal-700" />
                    <span>{app.total_days} Working Day(s)</span>
                  </div>
                </div>

                {app.reason && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2.5 border border-slate-200 rounded-lg">
                    "{app.reason}"
                  </p>
                )}

                <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-2 border-t border-slate-100 gap-2">
                  <span className="text-2xs text-slate-400">
                    Filed {new Date(app.created_at).toLocaleDateString()}
                  </span>

                  {canDecide ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenDialog(app, 'REJECT')}
                        className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
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
                      Review restricted to Administrator & Office Head.
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
    </div>
  )
}

export default ApprovalQueueScreen
