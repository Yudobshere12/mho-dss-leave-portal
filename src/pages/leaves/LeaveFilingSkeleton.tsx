import React from 'react'
import { Skeleton } from '../../components/Skeleton'

export const LeaveFilingSkeleton: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto space-y-6" aria-busy="true">
      {/* Page Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded-md" />
      </div>

      {/* Main Form Container Skeleton */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        {/* Banner Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-5 rounded bg-slate-700" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-56 rounded bg-slate-700" />
              <Skeleton className="h-4 w-72 rounded bg-slate-700" />
            </div>
          </div>
          <Skeleton className="h-5 w-20 rounded bg-slate-800 hidden sm:block" />
        </div>

        <div className="p-5 md:p-6 space-y-6">
          {/* Header Grid: Agency, Name, Date, Position */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 space-y-3">
            <Skeleton className="h-3 w-40 rounded mb-2" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-24 rounded" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
            {/* Balances bar */}
            <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center">
              <Skeleton className="h-3 w-36 rounded" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
          </div>

          {/* Section 6.A: Type of Leave */}
          <div className="space-y-2">
            <Skeleton className="h-3.5 w-48 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          {/* Section 6.B: Details */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
            <Skeleton className="h-3 w-44 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
            <Skeleton className="h-9 w-full rounded-lg" />
          </div>

          {/* Section 6.C: Dates */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 space-y-3">
            <Skeleton className="h-3 w-36 rounded" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-20 rounded" />
                <Skeleton className="h-9 w-full rounded-xl" />
              </div>
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          {/* Section 6.D: Commutation */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-28 rounded" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-4 w-28 rounded" />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32 rounded" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>

          {/* Submit Button Area */}
          <div className="pt-2">
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}
