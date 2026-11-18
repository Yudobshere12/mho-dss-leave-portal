import { describe, it, expect } from 'vitest'
import { parseDssFromRpc, parseDssFromColumn } from './dssPresenter'

describe('dssPresenter', () => {
  describe('parseDssFromRpc', () => {
    it('handles pure recommended all conditions satisfied', () => {
      const vm = parseDssFromRpc(
        'RECOMMENDED',
        'All DSS pre-conditions satisfied. Sufficient balance & duty staff coverage satisfied.',
        { leaveTypeName: 'Vacation Leave' }
      )
      expect(vm.status).toBe('recommended')
      expect(vm.statusLabel).toBe('Recommended')
      expect(vm.reasons.length).toBeGreaterThan(0)
      expect(vm.reasons[0].icon).toBe('check')
      expect(vm.reasons[0].text).toContain('All system checks passed')
    })

    it('handles advance filing violation notice', () => {
      const vm = parseDssFromRpc(
        'NEEDS_REVIEW',
        'Advance filing notice requirement not met: filed 2 days before start date, required at least 5 days.',
        { leaveTypeName: 'Vacation Leave' }
      )
      expect(vm.status).toBe('needs_review')
      expect(vm.statusLabel).toBe('Needs Review')
      expect(vm.reasons.length).toBeGreaterThan(0)
      expect(vm.reasons[0].icon).toBe('alert')
      expect(vm.reasons[0].text).toContain('5 calendar days')
      expect(vm.reasons[0].text).toContain('2 days in advance')
    })

    it('handles walk-in applications', () => {
      const vm = parseDssFromRpc(
        'RECOMMENDED',
        'Walk-in application (no leave credit record required).',
        { leaveTypeName: 'Vacation Leave' }
      )
      expect(vm.status).toBe('recommended')
      expect(vm.reasons[0].icon).toBe('check')
      expect(vm.reasons[0].text).toContain('Walk-in application')
    })

    it('handles insufficient balance', () => {
      const vm = parseDssFromRpc(
        'NEEDS_REVIEW',
        'Insufficient balance: requested: 10 days, available: 3.5 days.',
        { leaveTypeName: 'Sick Leave' }
      )
      expect(vm.status).toBe('needs_review')
      expect(vm.reasons[0].icon).toBe('alert')
      expect(vm.reasons[0].text).toContain('Requested: 10 days')
      expect(vm.reasons[0].text).toContain('available: 3.5 days')
    })
  })

  describe('parseDssFromColumn', () => {
    it('returns null for empty input', () => {
      expect(parseDssFromColumn(null)).toBeNull()
      expect(parseDssFromColumn(undefined)).toBeNull()
      expect(parseDssFromColumn('')).toBeNull()
    })

    it('parses formatted paren format: RECOMMENDED (reason text)', () => {
      const vm = parseDssFromColumn(
        'RECOMMENDED (Sufficient balance & duty staff coverage satisfied)',
        { leaveTypeName: 'Vacation Leave' }
      )
      expect(vm).not.toBeNull()
      expect(vm?.status).toBe('recommended')
      expect(vm?.reasons[0].icon).toBe('check')
    })

    it('parses colon format: NEEDS_REVIEW: Advance filing requirement not met', () => {
      const vm = parseDssFromColumn('NEEDS_REVIEW: Advance filing requirement not met')
      expect(vm).not.toBeNull()
      expect(vm?.status).toBe('needs_review')
      expect(vm?.statusLabel).toBe('Needs Review')
    })
  })
})
