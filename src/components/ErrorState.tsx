import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message,
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl border border-red-200 bg-red-50/50">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-xs font-semibold text-red-900">{title}</h3>
      <p className="text-2xs text-red-700 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-white px-3.5 py-1.5 text-2xs font-semibold text-red-800 shadow-2xs hover:bg-red-50 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  )
}
