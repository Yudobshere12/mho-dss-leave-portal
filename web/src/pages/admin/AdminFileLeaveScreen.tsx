import React, { useState } from 'react'
import { FilePlus, Calculator } from 'lucide-react'
import { countWeekdays } from '../../utils/weekday'

export const AdminFileLeaveScreen: React.FC = () => {
  const [employeeName, setEmployeeName] = useState('')
  const [leaveType, setLeaveType] = useState('Vacation Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const workingDays = countWeekdays(startDate, endDate)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">File On-Behalf / Walk-in Leave</h1>
        <p className="text-sm text-slate-500">
          Administrative filing module for unregistered or walk-in personnel without portal accounts.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FilePlus className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">Walk-in Application Form</h2>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Full Name *</label>
            <input
              type="text"
              required
              value={employeeName}
              onChange={(e) => setEmployeeName(e.target.value)}
              placeholder="e.g. Lourdes Mendoza"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Category *</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
            >
              <option value="Vacation Leave">Vacation Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Emergency Leave">Emergency Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
              <option value="Special Privilege Leave">Special Privilege Leave</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
            <span className="flex items-center gap-1.5 font-medium">
              <Calculator className="h-4 w-4 text-blue-600" />
              Calculated Working Days:
            </span>
            <span className="font-bold text-sm">{workingDays} day(s)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Justification</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State remarks or walk-in filing details..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            Submit Administrative Application
          </button>
        </form>
      </div>
    </div>
  )
}
