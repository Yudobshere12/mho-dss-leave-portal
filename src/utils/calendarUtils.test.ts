import { describe, it, expect } from 'vitest'
import {
  toDateString,
  parseDateString,
  getCalendarMonthGrid,
  isDateInRange,
} from './calendarUtils'

describe('calendarUtils', () => {
  it('formats Date to YYYY-MM-DD correctly', () => {
    const d = new Date(2026, 10, 20) // Nov 20, 2026
    expect(toDateString(d)).toBe('2026-11-20')
  })

  it('parses YYYY-MM-DD string into local date without shift', () => {
    const parsed = parseDateString('2026-11-20')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(10) // 0-indexed November
    expect(parsed.getDate()).toBe(20)
  })

  it('generates a full month grid aligned to 7-day weeks', () => {
    // November 2026: Nov 1 is Sunday
    const weeks = getCalendarMonthGrid(2026, 10)
    expect(weeks.length).toBeGreaterThanOrEqual(4)
    weeks.forEach((w) => {
      expect(w.days.length).toBe(7)
    })

    const firstDay = weeks[0].days[0]
    expect(firstDay.date.getDay()).toBe(0) // Sunday

    // Check count of current month days
    const currentMonthDays = weeks.flatMap((w) => w.days).filter((d) => d.isCurrentMonth)
    expect(currentMonthDays.length).toBe(30) // November has 30 days
  })

  it('correctly tests if a date is within an inclusive range', () => {
    expect(isDateInRange('2026-11-20', '2026-11-18', '2026-11-22')).toBe(true)
    expect(isDateInRange('2026-11-18', '2026-11-18', '2026-11-22')).toBe(true)
    expect(isDateInRange('2026-11-22', '2026-11-18', '2026-11-22')).toBe(true)
    expect(isDateInRange('2026-11-17', '2026-11-18', '2026-11-22')).toBe(false)
    expect(isDateInRange('2026-11-23', '2026-11-18', '2026-11-22')).toBe(false)
  })
})
