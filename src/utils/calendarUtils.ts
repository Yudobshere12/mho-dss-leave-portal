/**
 * calendarUtils.ts
 * Clean utility helpers for month grid generation, range math, and layout.
 */

export interface CalendarDay {
  date: Date
  dateString: string // YYYY-MM-DD
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  isWeekend: boolean
}

export interface CalendarWeek {
  days: CalendarDay[]
}

/** Formats a Date object to YYYY-MM-DD using local time */
export function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Parses YYYY-MM-DD into a local Date without timezone offset shift */
export function parseDateString(str: string): Date {
  const [year, month, day] = str.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

/**
 * Builds a 35 or 42 cell calendar grid (Sunday to Saturday weeks)
 * for the specified month and year.
 */
export function getCalendarMonthGrid(year: number, monthIndex: number): CalendarWeek[] {
  const firstOfMonth = new Date(year, monthIndex, 1)
  const lastOfMonth = new Date(year, monthIndex + 1, 0)

  // Sunday = 0, Saturday = 6
  const startDayOfWeek = firstOfMonth.getDay()
  const totalDaysInMonth = lastOfMonth.getDate()

  const todayStr = toDateString(new Date())

  // Days from previous month to fill the first row
  const prevMonthLastDay = new Date(year, monthIndex, 0).getDate()
  const days: CalendarDay[] = []

  // Prepend previous month days
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i
    const d = new Date(year, monthIndex - 1, dayNum, 12, 0, 0)
    const dateString = toDateString(d)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    days.push({
      date: d,
      dateString,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isWeekend,
    })
  }

  // Current month days
  for (let dayNum = 1; dayNum <= totalDaysInMonth; dayNum++) {
    const d = new Date(year, monthIndex, dayNum, 12, 0, 0)
    const dateString = toDateString(d)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    days.push({
      date: d,
      dateString,
      dayNumber: dayNum,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      isWeekend,
    })
  }

  // Append next month days to complete trailing week
  let nextMonthDay = 1
  while (days.length % 7 !== 0) {
    const d = new Date(year, monthIndex + 1, nextMonthDay, 12, 0, 0)
    const dateString = toDateString(d)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    days.push({
      date: d,
      dateString,
      dayNumber: nextMonthDay,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isWeekend,
    })
    nextMonthDay++
  }

  // Group into weeks of 7 days
  const weeks: CalendarWeek[] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push({
      days: days.slice(i, i + 7),
    })
  }

  return weeks
}

/** Check if a date string falls inside [startDate, endDate] inclusive */
export function isDateInRange(targetDateStr: string, startDateStr: string, endDateStr: string): boolean {
  return targetDateStr >= startDateStr && targetDateStr <= endDateStr
}
