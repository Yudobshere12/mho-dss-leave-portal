import React from 'react'
import { Info } from 'lucide-react'

export const DemoBanner: React.FC = () => {
  return (
    <aside
      aria-label="Demo environment notice"
      className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs shrink-0 select-none z-50"
    >
      <Info className="h-4 w-4 shrink-0 text-slate-950" />
      <span>Demo build - dummy data only, no authentication</span>
    </aside>
  )
}
