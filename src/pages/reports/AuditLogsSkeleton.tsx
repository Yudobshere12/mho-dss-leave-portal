import React from 'react'
import { Skeleton } from '../../components/Skeleton'

export const AuditLogsSkeleton: React.FC = () => {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 text-2xs uppercase">
          <tr>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-20 rounded" /></th>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-16 rounded" /></th>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-16 rounded" /></th>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-28 rounded" /></th>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-20 rounded" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <tr key={i}>
              <td className="px-4 py-3"><Skeleton className="h-3 w-32 rounded" /></td>
              <td className="px-4 py-3 space-y-1">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-2.5 w-16 rounded" />
              </td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-20 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-3.5 w-64 rounded" /></td>
              <td className="px-4 py-3"><Skeleton className="h-3 w-24 rounded" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
