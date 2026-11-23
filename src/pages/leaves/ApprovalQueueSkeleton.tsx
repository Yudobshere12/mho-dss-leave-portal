import React from 'react'
import { Skeleton } from '../../components/Skeleton'

export const ApprovalQueueSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-busy="true">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4"
        >
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-36 rounded" />
              <div className="flex gap-2">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-3 w-28 rounded" />
              </div>
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>

          <div className="space-y-2">
            <Skeleton className="h-3.5 w-40 rounded" />
            <Skeleton className="h-3.5 w-52 rounded" />
            <Skeleton className="h-3.5 w-32 rounded" />
          </div>

          <div className="pt-2 border-t border-slate-100 flex gap-2">
            <Skeleton className="h-8 flex-1 rounded-lg" />
            <Skeleton className="h-8 flex-1 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
