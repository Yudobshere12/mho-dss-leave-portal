import React, { useState, useEffect } from 'react'
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Clock,
  Calendar,
  Loader2,
  FileText,
  Filter,
} from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { supabase } from '../../lib/supabase'
import { DssBadge } from '../../components/DssBadge'
import { DecisionDialog } from '../../components/DecisionDialog'
import type { Database } from '../../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

// Initial demo items for offline dev preview
const DEMO_PENDING_APPLICATIONS: LeaveApplication[] = [
  {
    id: 3,
    user_id: 'a0000000-0000-0000-0000-000000000006',
    employee_name: 'Antonio Luna',
    leave_type: 'Vacation Leave',
    other_leave_type: null,
    start_date: '2026-12-01',
    end_date: '2026-12-05',
    total_days: 5.0,
    reason: 'Scheduled year-end vacation leave.',
    status: 'PENDING',
    dss_recommendation: 'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)',
    created_by_admin_id: null,
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-11-15T10:20:00Z',
  },
  {
    id: 5,
    user_id: null,
    employee_name: 'Lourdes Mendoza',
    leave_type: 'Special Privilege Leave',
    other_leave_type: null,
    start_date: '2026-12-10',
    end_date: '2026-12-11',
    total_days: 2.0,
    reason: 'Personal milestone celebration (Civil Service benefit).',
    status: 'PENDING',
    dss_recommendation: 'RECOMMENDED (Statutory leave category; coverage satisfied)',
    created_by_admin_id: 'a0000000-0000-0000-0000-000000000002',
    processed_by_admin_id: null,
    admin_remarks: null,
    processed_at: null,
    created_at: '2026-11-16T11:00:00Z',
  },
]

export const ApprovalQueueScreen: React.FC = () => {
  const { currentUser } = useDevRole()

  // Permissions based on DevRoleContext
  // Decision triggers: MHO_ADMIN and MHO_HEAD only. LGU_HR has read-only auditing view.
  const canDecide = ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)
  const isHR = currentUser.role === 'LGU_HR'

  const [applications, setApplications] = useState<LeaveApplication[]>(DEMO_PENDING_APPLICATIONS)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Dialog state
  const [selectedApp, setSelectedApp] = useState<LeaveApplication | null>(null)
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT' | null>(null)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const fetchPendingQueue = async () => {
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('status', 'PENDING')
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('Could not query leave_applications, using offline demo queue:', error.message)
        setApplications(DEMO_PENDING_APPLICATIONS)
      } else if (data && data.length > 0) {
        setApplications(data)
      } else {
        setApplications([])
      }
    } catch (err) {
      console.warn('Queue query exception:', err)
      setApplications(DEMO_PENDING_APPLICATIONS)
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
        message: `Application #${applicationId} was successfully marked as ${decisionAction}. Balance and audit logs updated.`,
      })

      // Remove from pending queue locally
      setApplications((prev) => prev.filter((a) => a.id !== applicationId))
      setSelectedApp(null)
      setDecisionAction(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn('Decision RPC error, simulating client update:', msg)

      // Fallback local simulation for disconnected preview
      setApplications((prev) => prev.filter((a) => a.id !== applicationId))
      setSelectedApp(null)
      setDecisionAction(null)
      setFeedback({
        type: 'success',
        message: `[DEV PREVIEW] Application #${applicationId} marked as ${decisionAction} by ${currentUser.full_name}.`,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            DSS Leave Approval Queue
          </h1>
          <p className="text-sm text-slate-500">
            Algorithmic Decision Support System (DSS) evaluation queue for executive sign-off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isHR && (
            <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              Auditor View (Read-Only)
            </span>
          )}
          <button
            onClick={fetchPendingQueue}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
          >
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Role Feedback Alert */}
      {feedback && (
        <div
          className={`rounded-xl border p-4 text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-bold underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-800">
              Pending Applications ({applications.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Acting Reviewer: <strong>{currentUser.full_name}</strong> ({currentUser.role})
          </span>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            Loading approval queue...
          </div>
        ) : applications.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            <div className="font-semibold text-slate-700">No Pending Requests in Queue</div>
            <div>All leave applications have been reviewed and decided.</div>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => (
              <div
                key={app.id}
                className="rounded-xl border border-slate-200 p-5 space-y-3.5 hover:border-slate-300 transition-colors shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-base text-slate-900">
                      {app.employee_name || 'Walk-in Personnel'}
                    </span>
                    <span className="text-xs text-slate-400">#APP-{app.id}</span>
                    {app.user_id === null && (
                      <span className="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-2xs font-bold text-amber-800">
                        Walk-in
                      </span>
                    )}
                  </div>
                  <DssBadge recommendation={app.dss_recommendation} />
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                  <div>
                    <span className="font-semibold text-slate-900">Category:</span> {app.leave_type}
                    {app.other_leave_type && ` (${app.other_leave_type})`}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {app.start_date} &rarr; {app.end_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                    <Clock className="h-3.5 w-3.5 text-blue-600" />
                    <span>{app.total_days} Working Day(s)</span>
                  </div>
                </div>

                {/* Reason */}
                {app.reason && (
                  <p className="text-xs text-slate-600 italic bg-white p-2 border border-slate-100 rounded">
                    "{app.reason}"
                  </p>
                )}

                {/* Decision Actions */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center pt-2 border-t border-slate-100 gap-2">
                  <span className="text-2xs text-slate-400">
                    Filed on {new Date(app.created_at).toLocaleDateString()}
                  </span>

                  {canDecide ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleOpenDialog(app, 'REJECT')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject Request
                      </button>
                      <button
                        onClick={() => handleOpenDialog(app, 'APPROVE')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve & Deduct Credits
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

      {/* Decision Dialog */}
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
