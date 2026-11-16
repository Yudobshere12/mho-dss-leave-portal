import React, { useState } from 'react'
import { FileSignature, Calculator, AlertCircle } from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'
import { countWeekdays } from '../../utils/weekday'

export const ApplyLeaveScreen: React.FC = () => {
  const { currentUser } = useDevRole()
  const [leaveType, setLeaveType] = useState('Vacation Leave')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const workingDays = countWeekdays(startDate, endDate)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Apply for Leave</h1>
        <p className="text-sm text-slate-500">
          Submit employee self-service leave requests with automated DSS credit & conflict checking.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <FileSignature className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">Application Details</h2>
        </div>

        {/* Current Applicant Info */}
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-700 flex justify-between items-center">
          <div>
            <span className="font-semibold text-slate-900">Applicant:</span> {currentUser.full_name} ({currentUser.position || 'Staff'})
          </div>
          <div className="flex gap-3">
            <span>VL: <strong>{currentUser.vacation_credits}</strong></span>
            <span>SL: <strong>{currentUser.sick_credits}</strong></span>
            <span>EL: <strong>{currentUser.emergency_credits}</strong></span>
          </div>
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Category</label>
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Working Days Calculated Preview */}
          <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
            <span className="flex items-center gap-1.5 font-medium">
              <Calculator className="h-4 w-4 text-blue-600" />
              Calculated Duration (Excluding Weekends):
            </span>
            <span className="font-bold text-sm">{workingDays} working day(s)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Remarks</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State reason for filing leave..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-hidden"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            Submit Leave Application
          </button>
        </form>
      </div>
    </div>
  )
}
