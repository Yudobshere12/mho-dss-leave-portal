import React from 'react'
import { CalendarCheck, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

export const ApprovalQueueScreen: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Decision Support System Approval Queue</h1>
        <p className="text-sm text-slate-500">
          Review pending employee applications evaluated by the algorithmic DSS engine.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <CalendarCheck className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">Pending Review Applications</h2>
        </div>

        {/* Sample Item Card */}
        <div className="rounded-lg border border-slate-200 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <span className="font-bold text-slate-900">Antonio Luna</span>
              <span className="ml-2 text-xs text-slate-500 font-medium">Medical Technologist I</span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              DSS: RECOMMENDED (PENDING REVIEW)
            </span>
          </div>

          <div className="text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded">
            <div><strong>Type:</strong> Vacation Leave</div>
            <div><strong>Dates:</strong> Dec 01 - Dec 05, 2026 (5 days)</div>
            <div><strong>Balance:</strong> 15.00 days available</div>
          </div>

          <p className="text-xs text-slate-600 italic">"Scheduled year-end vacation leave."</p>

          <div className="flex justify-end gap-2 pt-2">
            <button className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100">
              <XCircle className="h-3.5 w-3.5" /> Reject
            </button>
            <button className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Deduct Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
