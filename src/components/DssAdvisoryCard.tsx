import React from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Check,
  AlertCircle,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import type { DssViewModel, DssReason } from '../lib/dssPresenter'

interface DssAdvisoryCardProps {
  viewModel: DssViewModel | null
  isLoading?: boolean
  isAdmin?: boolean
  className?: string
}

function ReasonIcon({ icon }: { icon: DssReason['icon'] }) {
  if (icon === 'check') return <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
  if (icon === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
  return <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
}

export const DssAdvisoryCard: React.FC<DssAdvisoryCardProps> = ({
  viewModel,
  isLoading = false,
  isAdmin = false,
  className = '',
}) => {
  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500 ${className}`}
      >
        <div className="flex items-center gap-2 font-semibold">
          <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
          Evaluating leave credits and clinical coverage…
        </div>
      </div>
    )
  }

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!viewModel) {
    return (
      <div
        className={`rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-400 flex items-center gap-2 ${className}`}
      >
        <HelpCircle className="h-4 w-4 shrink-0" />
        No DSS evaluation available for this application.
      </div>
    )
  }

  // ── Style map ──────────────────────────────────────────────────────────────
  const styleMap = {
    recommended: {
      wrapper: 'border-emerald-200 bg-emerald-50/60 text-emerald-900',
      badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
      factChip: 'bg-white border border-emerald-200 text-emerald-800',
      details: 'bg-emerald-50 border-emerald-200',
    },
    needs_review: {
      wrapper: 'border-amber-200 bg-amber-50/60 text-amber-900',
      badge: 'bg-amber-100 text-amber-800 border border-amber-300',
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
      factChip: 'bg-white border border-amber-200 text-amber-800',
      details: 'bg-amber-50 border-amber-200',
    },
    unknown: {
      wrapper: 'border-slate-200 bg-slate-50 text-slate-700',
      badge: 'bg-slate-100 text-slate-600 border border-slate-300',
      icon: <HelpCircle className="h-4 w-4 text-slate-400 shrink-0" />,
      factChip: 'bg-white border border-slate-200 text-slate-600',
      details: 'bg-slate-50 border-slate-200',
    },
  }

  const s = styleMap[viewModel.status]

  return (
    <div className={`rounded-xl border p-4 text-xs space-y-3 ${s.wrapper} ${className}`}>
      {/* Status badge + summary */}
      <div className="flex items-start gap-2">
        {s.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-bold ${s.badge}`}>
              {viewModel.statusLabel}
            </span>
            <span className="text-2xs font-semibold uppercase tracking-wider opacity-60">
              7.B DSS Advisory
            </span>
          </div>
          <p className="text-xs leading-relaxed font-medium">{viewModel.summary}</p>
        </div>
      </div>

      {/* Reasons list */}
      {viewModel.reasons.length > 0 && (
        <ul className="space-y-1.5 pl-1">
          {viewModel.reasons.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-xs leading-snug">
              <ReasonIcon icon={r.icon} />
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Facts chips */}
      {viewModel.facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {viewModel.facts.map((f, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-2xs font-medium ${s.factChip}`}
            >
              <span className="opacity-60">{f.label}:</span>
              <span className="font-semibold">{f.value}</span>
            </span>
          ))}
        </div>
      )}

      {/* Technical details — MHO_ADMIN only */}
      {isAdmin && (
        <details className={`rounded-lg border text-2xs mt-1 ${s.details}`}>
          <summary className="flex items-center gap-1.5 cursor-pointer select-none px-3 py-2 font-semibold opacity-70 hover:opacity-100 transition-opacity">
            <ChevronDown className="h-3 w-3 shrink-0" />
            Technical details
          </summary>
          <pre className="px-3 pb-3 pt-1 font-mono text-2xs whitespace-pre-wrap break-words opacity-80">
            {viewModel.raw}
          </pre>
        </details>
      )}
    </div>
  )
}
