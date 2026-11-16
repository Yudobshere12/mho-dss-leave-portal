/**
 * Utility to export an array of tabular objects to a downloadable CSV file.
 */
export function exportToCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  headers?: { key: keyof T; label: string }[]
): void {
  if (!rows || !rows.length) {
    console.warn('exportToCsv: No rows provided for export')
    return
  }

  const columns = headers
    ? headers
    : Object.keys(rows[0]).map((k) => ({ key: k as keyof T, label: k }))

  const headerLine = columns.map((col) => `"${col.label.replace(/"/g, '""')}"`).join(',')

  const bodyLines = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col.key]
        if (val === null || val === undefined) {
          return '""'
        }
        const strVal = String(val).replace(/"/g, '""')
        return `"${strVal}"`
      })
      .join(',')
  )

  const csvContent = [headerLine, ...bodyLines].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
