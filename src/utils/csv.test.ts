import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportToCsv } from './csv'

describe('exportToCsv utility', () => {
  let createdUrl: string | null = null
  let clicked = false
  let appendedElement: HTMLElement | null = null
  let removedElement: HTMLElement | null = null

  beforeEach(() => {
    clicked = false
    createdUrl = null
    appendedElement = null
    removedElement = null

    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn((blob: Blob) => {
        createdUrl = 'blob:mock-url'
        return createdUrl
      }),
      revokeObjectURL: vi.fn(),
    })

    // Mock document.body.appendChild and removeChild
    vi.spyOn(document.body, 'appendChild').mockImplementation((el: Node) => {
      appendedElement = el as HTMLElement
      return el
    })
    vi.spyOn(document.body, 'removeChild').mockImplementation((el: Node) => {
      removedElement = el as HTMLElement
      return el
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('handles empty rows gracefully without throwing or creating download', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    exportToCsv('empty.csv', [])
    expect(warnSpy).toHaveBeenCalledWith('exportToCsv: No rows provided for export')
    expect(appendedElement).toBeNull()
  })

  it('exports rows to CSV with automatic headers and triggers download link', () => {
    const data = [
      { name: 'Dr. Maria Clara', role: 'MHO_HEAD', days: 5 },
      { name: 'Juan dela Cruz', role: 'STAFF', days: 2 },
    ]

    exportToCsv('personnel_report', data)

    expect(appendedElement).not.toBeNull()
    expect(appendedElement?.tagName).toBe('A')
    expect(appendedElement?.getAttribute('download')).toBe('personnel_report.csv')
    expect(appendedElement?.getAttribute('href')).toBe('blob:mock-url')
    expect(removedElement).toBe(appendedElement)
  })

  it('escapes quotes and handles null/undefined values properly', () => {
    const data = [
      { name: 'Quote "Test"', notes: null, remark: undefined },
    ]

    exportToCsv('quote_test.csv', data)

    expect(appendedElement?.getAttribute('download')).toBe('quote_test.csv')
  })

  it('supports custom headers mapping', () => {
    const data = [
      { id: 1, full_name: 'Dr. Santos', vacation: 15 },
    ]
    const customHeaders = [
      { key: 'full_name' as const, label: 'Employee Name' },
      { key: 'vacation' as const, label: 'Vacation Balance' },
    ]

    exportToCsv('custom_headers.csv', data, customHeaders)

    expect(appendedElement?.getAttribute('download')).toBe('custom_headers.csv')
  })
})
