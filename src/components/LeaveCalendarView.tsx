import React, { useState, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  AlertTriangle,
  X,
  Eye,
} from 'lucide-react'
import {
  getCalendarMonthGrid,
  isDateInRange,
  type CalendarDay,
} from '../utils/calendarUtils'
import { getLeaveTypeTheme, type LeaveTypeRecord } from '../lib/leaveTypes'
import type { Database } from '../types/database.types'

type LeaveApplication = Database['public']['Tables']['leave_applications']['Row']

interface LeaveCalendarViewProps {
  currentDate: Date
  onDateChange: (newDate: Date) => void
  applications: LeaveApplication[]
  leaveTypes: LeaveTypeRecord[]
  minDutyStaffThreshold: number
  onViewApplication: (app: LeaveApplication) => void
  isLoading?: boolean
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const LeaveCalendarView: React.FC<LeaveCalendarViewProps> = ({
  currentDate,
  onDateChange,
  applications,
  leaveTypes,
  minDutyStaffThreshold = 2,
  onViewApplication,
  isLoading = false,
}) => {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Local filter states for calendar view
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('ALL')
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL')
  const [showRejected, setShowRejected] = useState<boolean>(false)

  // Popover state for "+N more" or day inspection
  const [activeDayModal, setActiveDayModal] = useState<{
    dateStr: string
    leaves: LeaveApplication[]
  } | null>(null)

  // Navigation handlers
  const handlePrevMonth = () => {
    onDateChange(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    onDateChange(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    onDateChange(new Date())
  }

  // Generate month grid
  const weeks = useMemo(() => {
    return getCalendarMonthGrid(year, month)
  }, [year, month])

  // Filter applications based on calendar-level controls
  const activeApplications = useMemo(() => {
    return applications.filter((app) => {
      if (!showRejected && app.status === 'REJECTED') {
        return false
      }
      if (selectedLeaveType !== 'ALL' && app.leave_type !== selectedLeaveType) {
        return false
      }
      if (selectedEmployee !== 'ALL' && app.user_id !== selectedEmployee) {
        return false
      }
      return true
    })
  }, [applications, showRejected, selectedLeaveType, selectedEmployee])

  // Unique list of employees present in the loaded applications
  const uniqueEmployees = useMemo(() => {
    const map = new Map<string, string>()
    applications.forEach((a) => {
      if (a.user_id && a.employee_name) {
        map.set(a.user_id, a.employee_name)
      }
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [applications])

  // Map each calendar day string to matching leave applications
  const dayLeavesMap = useMemo(() => {
    const map = new Map<string, LeaveApplication[]>()
    weeks.forEach((w) => {
      w.days.forEach((day) => {
        const matching = activeApplications.filter((app) =>
          isDateInRange(day.dateString, app.start_date, app.end_date)
        )
        map.set(day.dateString, matching)
      })
    })
    return map
  }, [weeks, activeApplications])

  // Agenda view list for mobile: only days in current month that have leaves
  const agendaDays = useMemo(() => {
    const list: { day: CalendarDay; leaves: LeaveApplication[] }[] = []
    weeks.forEach((w) => {
      w.days.forEach((d) => {
        if (d.isCurrentMonth) {
          const leaves = dayLeavesMap.get(d.dateString) || []
          if (leaves.length > 0) {
            list.push({ day: d, leaves })
          }
        }
      })
    })
    return list
  }, [weeks, dayLeavesMap])

  return (
    <div className="space-y-4">
      {/* Calendar Header: Navigation & Month Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={handlePrevMonth}
              title="Previous Month"
              aria-label="Previous Month"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNextMonth}
              title="Next Month"
              aria-label="Next Month"
              className="p-1.5 rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status filter (Show rejected toggle) */}
          <label className="inline-flex items-center gap-1.5 text-2xs font-semibold text-slate-600 select-none cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
            <input
              type="checkbox"
              checked={showRejected}
              onChange={(e) => setShowRejected(e.target.checked)}
              className="rounded text-teal-700 accent-teal-700"
            />
            <span>Show Rejected</span>
          </label>

          {/* Leave Type Filter */}
          <select
            value={selectedLeaveType}
            onChange={(e) => setSelectedLeaveType(e.target.value)}
            className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {leaveTypes.map((t) => (
              <option key={t.code} value={t.code}>
                {t.code} - {t.name}
              </option>
            ))}
          </select>

          {/* Employee Filter */}
          {uniqueEmployees.length > 0 && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="rounded-xl border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:bg-white focus:outline-hidden max-w-[150px] truncate"
            >
              <option value="ALL">All Staff ({uniqueEmployees.length})</option>
              {uniqueEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Legend & Coverage Threshold Notice */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-4 py-2.5 rounded-xl border border-slate-200 text-2xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700 uppercase tracking-wider">Legend:</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-5 rounded bg-emerald-600 inline-block shadow-2xs" />
            <span className="font-medium text-slate-700">Approved</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-5 rounded border border-amber-400 bg-amber-50 inline-block"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, #fef3c7, #fef3c7 4px, #fde68a 4px, #fde68a 8px)',
              }}
            />
            <span className="font-medium text-slate-700">Pending (Striped)</span>
          </span>
          {showRejected && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-5 rounded bg-red-100 border border-red-300 line-through inline-block" />
              <span className="font-medium text-slate-700">Rejected</span>
            </span>
          )}
        </div>

        {/* Coverage Note */}
        <div className="inline-flex items-center gap-1.5 text-slate-500">
          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
          <span>
            Staffing warning badge shown when active leaves &ge; {minDutyStaffThreshold} staff on duty.
          </span>
        </div>
      </div>

      {/* Desktop / Tablet Grid View */}
      <div className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        {/* Weekday Names Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center font-bold text-2xs uppercase tracking-wider text-slate-600">
          {WEEKDAY_NAMES.map((w, idx) => (
            <div
              key={w}
              className={`py-2.5 border-r last:border-r-0 border-slate-200 ${
                idx === 0 || idx === 6 ? 'text-slate-400 bg-slate-100/60' : ''
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Month Weeks Grid */}
        <div className="divide-y divide-slate-200">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 divide-x divide-slate-200 min-h-[110px]">
              {week.days.map((day) => {
                const dayLeaves = dayLeavesMap.get(day.dateString) || []
                const isOverThreshold = dayLeaves.length >= minDutyStaffThreshold
                const maxDisplay = 2
                const overflowCount = dayLeaves.length - maxDisplay

                return (
                  <div
                    key={day.dateString}
                    className={`p-1.5 transition-colors flex flex-col justify-between ${
                      !day.isCurrentMonth
                        ? 'bg-slate-50/50 text-slate-400'
                        : day.isWeekend
                        ? 'bg-slate-50/70 text-slate-600'
                        : 'bg-white text-slate-800'
                    } ${day.isToday ? 'ring-2 ring-teal-600 ring-inset bg-teal-50/20' : ''}`}
                  >
                    {/* Date Number & Coverage Badge Header */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center justify-center text-xs font-semibold rounded-full h-5 w-5 ${
                          day.isToday
                            ? 'bg-teal-700 text-white font-bold'
                            : !day.isCurrentMonth
                            ? 'text-slate-400'
                            : 'text-slate-800'
                        }`}
                      >
                        {day.dayNumber}
                      </span>

                      {/* Daily Coverage Staff Badge */}
                      {dayLeaves.length > 0 && day.isCurrentMonth && (
                        <span
                          title={`${dayLeaves.length} staff member(s) on leave this date`}
                          className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.2 text-3xs font-bold ${
                            isOverThreshold
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          <Users className="h-2.5 w-2.5" />
                          {dayLeaves.length}
                        </span>
                      )}
                    </div>

                    {/* Leave Spans / Bars */}
                    <div className="space-y-1 flex-1 overflow-hidden">
                      {dayLeaves.slice(0, maxDisplay).map((leave) => {
                        const theme = getLeaveTypeTheme(leave.leave_type)
                        const isPending = leave.status === 'PENDING'
                        const isRejected = leave.status === 'REJECTED'

                        return (
                          <button
                            key={leave.id}
                            onClick={() => onViewApplication(leave)}
                            title={`${leave.employee_name} (${leave.leave_type}): ${leave.start_date} to ${leave.end_date} [${leave.status}]`}
                            className={`w-full text-left truncate rounded-md px-1.5 py-0.5 text-3xs font-semibold transition-all hover:scale-[1.02] flex items-center gap-1 shadow-2xs ${
                              isRejected
                                ? 'bg-red-50 text-red-700 border border-red-200 line-through opacity-70'
                                : isPending
                                ? 'border border-dashed border-amber-400 text-amber-900 bg-amber-50/90'
                                : 'text-white'
                            }`}
                            style={
                              !isPending && !isRejected
                                ? { backgroundColor: theme.chartBg || '#0f766e' }
                                : undefined
                            }
                          >
                            <span className="font-mono text-4xs uppercase px-1 py-0.2 rounded bg-black/15 shrink-0">
                              {leave.leave_type}
                            </span>
                            <span className="truncate">{leave.employee_name}</span>
                          </button>
                        )
                      })}

                      {/* "+N more" Popover trigger */}
                      {overflowCount > 0 && (
                        <button
                          onClick={() =>
                            setActiveDayModal({
                              dateStr: day.dateString,
                              leaves: dayLeaves,
                            })
                          }
                          className="w-full text-center text-3xs font-bold text-teal-800 hover:text-teal-950 bg-teal-50/80 hover:bg-teal-100/90 rounded px-1 py-0.5 border border-teal-200 transition-colors"
                        >
                          +{overflowCount} more
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Agenda / List-by-Day View */}
      <div className="block md:hidden space-y-3">
        {agendaDays.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-xs text-slate-500 shadow-soft">
            <CalendarIcon className="h-6 w-6 text-slate-300 mx-auto mb-2" />
            No staff on leave scheduled for {MONTH_NAMES[month]} {year}.
          </div>
        ) : (
          agendaDays.map(({ day, leaves }) => {
            const isOverThreshold = leaves.length >= minDutyStaffThreshold
            return (
              <div
                key={day.dateString}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        day.isToday ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      {day.date.toLocaleDateString('en-PH', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {day.isToday && (
                      <span className="text-3xs font-bold uppercase text-teal-700">Today</span>
                    )}
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-bold ${
                      isOverThreshold
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Users className="h-3 w-3" />
                    {leaves.length} staff
                  </span>
                </div>

                <div className="space-y-1.5">
                  {leaves.map((leave) => {
                    const theme = getLeaveTypeTheme(leave.leave_type)
                    return (
                      <button
                        key={leave.id}
                        onClick={() => onViewApplication(leave)}
                        className="w-full text-left p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-900 truncate">
                            {leave.employee_name}
                          </div>
                          <div className="text-3xs text-slate-500">
                            {leave.start_date} &rarr; {leave.end_date} ({leave.working_days ?? leave.total_days} days)
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-1.5">
                          <span
                            className="text-3xs font-bold px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: theme.chartBg || '#0f766e' }}
                          >
                            {leave.leave_type}
                          </span>
                          <span
                            className={`text-3xs font-semibold px-1.5 py-0.5 rounded-full ${
                              leave.status === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : leave.status === 'REJECTED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {leave.status}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* "+N More" / Day Leaves Popover Dialog */}
      {activeDayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Staff on Leave ({activeDayModal.dateStr})
                </h3>
                <p className="text-2xs text-slate-500">
                  {activeDayModal.leaves.length} employee(s) scheduled on leave for this date
                </p>
              </div>
              <button
                onClick={() => setActiveDayModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 space-y-1">
              {activeDayModal.leaves.map((leave) => {
                const theme = getLeaveTypeTheme(leave.leave_type)
                return (
                  <div
                    key={leave.id}
                    className="py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">{leave.employee_name}</div>
                      <div className="text-3xs text-slate-500">
                        {leave.start_date} &rarr; {leave.end_date} &bull; {leave.working_days ?? leave.total_days} day(s)
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-3xs font-bold px-1.5 py-0.5 rounded text-white"
                        style={{ backgroundColor: theme.chartBg || '#0f766e' }}
                      >
                        {leave.leave_type}
                      </span>
                      <button
                        onClick={() => {
                          setActiveDayModal(null)
                          onViewApplication(leave)
                        }}
                        className="inline-flex items-center gap-1 text-2xs font-semibold text-teal-700 hover:text-teal-900 px-2 py-1 rounded-full border border-teal-200 bg-teal-50 hover:bg-teal-100 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        CS Form 6
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                onClick={() => setActiveDayModal(null)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
