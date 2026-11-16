import React from 'react'
import { ClipboardList, Download, Filter } from 'lucide-react'
import { exportToCsv } from '../../utils/csv'

const SAMPLE_LEAVES = [
  {
    id: 1,
    employee_name: 'Juan dela Cruz',
    leave_type: 'Vacation Leave',
    start_date: '2026-11-02',
    end_date: '2026-11-04',
    total_days: 3.0,
    status: 'APPROVED',
    reason: 'Annual family gathering in province.',
  },
  {
    id: 2,
    employee_name: 'Maria Santos',
    leave_type: 'Sick Leave',
    start_date: '2026-11-10',
    end_date: '2026-11-11',
    total_days: 2.0,
    status: 'APPROVED',
    reason: 'Acute gastroenteritis with medical cert.',
  },
  {
    id: 3,
    employee_name: 'Antonio Luna',
    leave_type: 'Vacation Leave',
    start_date: '2026-12-01',
    end_date: '2026-12-05',
    total_days: 5.0,
    status: 'PENDING',
    reason: 'Scheduled year-end vacation leave.',
  },
]

export const LeaveMonitorHub: React.FC = () => {
  const handleExport = () => {
    exportToCsv('mho_leave_records', SAMPLE_LEAVES, [
      { key: 'id', label: 'ID' },
      { key: 'employee_name', label: 'Employee Name' },
      { key: 'leave_type', label: 'Category' },
      { key: 'start_date', label: 'Start Date' },
      { key: 'end_date', label: 'End Date' },
      { key: 'total_days', label: 'Working Days' },
      { key: 'status', label: 'Status' },
      { key: 'reason', label: 'Remarks' },
    ])
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave Monitor Hub</h1>
          <p className="text-sm text-slate-500">
            Multi-employee tracking, timeline view, and historical query reports.
          </p>
        </div>
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Export CSV Report
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">Leave Applications Registry</h2>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Filter className="h-3.5 w-3.5" /> Showing all records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Applicant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Duration</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {SAMPLE_LEAVES.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{l.employee_name}</td>
                  <td className="px-4 py-3">{l.leave_type}</td>
                  <td className="px-4 py-3">{l.start_date} to {l.end_date}</td>
                  <td className="px-4 py-3 font-medium">{l.total_days} days</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-2xs font-bold ${
                        l.status === 'APPROVED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : l.status === 'REJECTED'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{l.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
