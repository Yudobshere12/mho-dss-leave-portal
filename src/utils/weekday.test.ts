import { describe, it, expect } from 'vitest'
import { countWeekdays } from './weekday'

describe('countWeekdays utility', () => {
  it('returns 0 when start date or end date is empty or invalid', () => {
    expect(countWeekdays('', '')).toBe(0)
    expect(countWeekdays('2026-11-02', '')).toBe(0)
    expect(countWeekdays('', '2026-11-04')).toBe(0)
    expect(countWeekdays('invalid', '2026-11-04')).toBe(0)
  })

  it('returns 0 when end date is before start date', () => {
    expect(countWeekdays('2026-11-10', '2026-11-05')).toBe(0)
  })

  it('counts 1 weekday for a single weekday (Monday to Monday)', () => {
    // 2026-11-02 is a Monday
    expect(countWeekdays('2026-11-02', '2026-11-02')).toBe(1)
  })

  it('counts 5 working days for a full Monday-Friday week', () => {
    // 2026-11-02 (Monday) to 2026-11-06 (Friday)
    expect(countWeekdays('2026-11-02', '2026-11-06')).toBe(5)
  })

  it('returns 0 working days for a weekend-only range (Saturday to Sunday)', () => {
    // 2026-11-07 is Saturday, 2026-11-08 is Sunday
    expect(countWeekdays('2026-11-07', '2026-11-08')).toBe(0)
    expect(countWeekdays('2026-11-07', '2026-11-07')).toBe(0)
    expect(countWeekdays('2026-11-08', '2026-11-08')).toBe(0)
  })

  it('excludes weekends across multi-week spans', () => {
    // 2026-11-02 (Mon) to 2026-11-13 (Fri) = 2 weeks = 10 working days
    expect(countWeekdays('2026-11-02', '2026-11-13')).toBe(10)
    // 2026-11-02 (Mon) to 2026-11-15 (Sun) = still 10 working days
    expect(countWeekdays('2026-11-02', '2026-11-15')).toBe(10)
  })

  it('correctly handles start on a Saturday and end on a Tuesday', () => {
    // 2026-11-07 (Sat) to 2026-11-10 (Tue) -> Mon + Tue = 2 days
    expect(countWeekdays('2026-11-07', '2026-11-10')).toBe(2)
  })
})
