/**
 * Counts working days (weekdays) between start_date and end_date (inclusive),
 * excluding Saturdays and Sundays.
 * Matches Postgres count_weekdays() behavior.
 */
export function countWeekdays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0

  const start = new Date(startDateStr)
  const end = new Date(endDateStr)

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0
  }

  let count = 0
  const cur = new Date(start)

  while (cur <= end) {
    const dayOfWeek = cur.getDay() // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++
    }
    cur.setDate(cur.getDate() + 1)
  }

  return count
}
