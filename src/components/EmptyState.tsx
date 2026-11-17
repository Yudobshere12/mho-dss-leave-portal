import React from 'react'
import { FolderOpen } from 'lucide-react'

interface EmptyStateProps {
  title?: string
  description?: string
  action?: React.ReactNode
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
        <FolderOpen className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-semibold text-slate-700">{title}</h3>
      {description && <p className="text-2xs text-slate-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
