import React from 'react'
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react'

interface DssBadgeProps {
  recommendation: string | null
  compact?: boolean
}

export const DssBadge: React.FC<DssBadgeProps> = ({ recommendation, compact = false }) => {
  if (!recommendation) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-semibold text-slate-600">
        <HelpCircle className="h-3 w-3" />
        No DSS Data
      </span>
    )
  }

  const isRecommended = recommendation.toUpperCase().startsWith('RECOMMENDED')
  const isCaution =
    recommendation.toUpperCase().includes('NEEDS_REVIEW') ||
    recommendation.toUpperCase().includes('WARNING') ||
    recommendation.toUpperCase().includes('CAUTION')

  if (isRecommended && !isCaution) {
    return (
      <span
        title={recommendation}
        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-2xs font-bold text-emerald-800 border border-emerald-200"
      >
        <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
        {compact ? 'RECOMMENDED' : recommendation}
      </span>
    )
  }

  return (
    <span
      title={recommendation}
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-2xs font-bold text-amber-900 border border-amber-200"
    >
      <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
      {compact ? 'NEEDS REVIEW' : recommendation}
    </span>
  )
}
