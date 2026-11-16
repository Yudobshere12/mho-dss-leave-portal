import React from 'react'
import { FileText, Printer, Shield } from 'lucide-react'

const SAMPLE_LOGS = [
  {
    id: 1,
    action_type: 'LEAVE_APPROVED',
    description: 'Leave Application #1 (Vacation Leave - 3.0 days) approved by Administrator Roberto Gomez.',
    ip_address: '192.168.1.10',
    created_at: '2026-10-28 09:30:00+00',
  },
  {
    id: 2,
    action_type: 'LEAVE_APPROVED',
    description: 'Leave Application #2 (Sick Leave - 2.0 days) approved by Dr. Maria Clara Salcedo.',
    ip_address: '192.168.1.15',
    created_at: '2026-11-10 08:00:00+00',
  },
  {
    id: 3,
    action_type: 'LEAVE_REJECTED',
    description: 'Leave Application #4 (Emergency Leave - 2.0 days) rejected by Dr. Maria Clara Salcedo. Reason: Coverage constraint.',
    ip_address: '192.168.1.15',
    created_at: '2026-11-16 14:00:00+00',
  },
]

export const AuditLogsScreen: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">System Audit Logs & Operational Analytics</h1>
          <p className="text-sm text-slate-500">
            Immutable chronological transaction log for executive and HR auditing.
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
        >
          <Printer className="h-4 w-4" />
          Print Audit Report
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Historical Operational Audit Trail</h2>
          </div>
          <span className="text-xs text-slate-500">Showing recent events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action Type</th>
                <th className="px-4 py-3">Event Narrative</th>
                <th className="px-4 py-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {SAMPLE_LOGS.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-2xs">
                    {log.created_at}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-2xs font-bold text-slate-800">
                      {log.action_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{log.description}</td>
                  <td className="px-4 py-3 font-mono text-2xs text-slate-500">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
