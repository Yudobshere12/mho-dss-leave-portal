import React from 'react'

interface PageHeaderProps {
  title: string
  action?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, action }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-4">
      <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  )
}
