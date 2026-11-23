import React from 'react'
import { Skeleton } from '../../components/Skeleton'

export const UserManagementSkeleton: React.FC = () => {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-64 rounded" />
        <Skeleton className="h-3 w-32 rounded" />
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-3xs uppercase">
              <th className="px-4 py-3"><Skeleton className="h-3 w-20 rounded" /></th>
              <th className="px-4 py-3"><Skeleton className="h-3 w-20 rounded" /></th>
              <th className="px-4 py-3"><Skeleton className="h-3 w-16 rounded" /></th>
              <th className="px-4 py-3"><Skeleton className="h-3 w-16 rounded" /></th>
              <th className="px-4 py-3 text-right"><Skeleton className="h-3 w-20 ml-auto rounded" /></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td className="px-4 py-3 space-y-1">
                  <Skeleton className="h-3.5 w-32 rounded" />
                  <Skeleton className="h-2.5 w-44 rounded" />
                </td>
                <td className="px-4 py-3"><Skeleton className="h-3 w-28 rounded" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded-full" /></td>
                <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded-full" /></td>
                <td className="px-4 py-3 text-right"><Skeleton className="h-7 w-28 ml-auto rounded-lg" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
