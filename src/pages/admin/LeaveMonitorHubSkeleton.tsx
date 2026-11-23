import React from 'react'
import { Skeleton } from '../../components/Skeleton'

export const LeaveMonitorHubSkeleton: React.FC = () => {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/75 text-2xs uppercase">
            <th className="py-3 px-4"><Skeleton className="h-3 w-20 rounded" /></th>
            <th className="py-3 px-4"><Skeleton className="h-3 w-16 rounded" /></th>
            <th className="py-3 px-4"><Skeleton className="h-3 w-24 rounded" /></th>
            <th className="py-3 px-4"><Skeleton className="h-3 w-20 rounded" /></th>
            <th className="py-3 px-4"><Skeleton className="h-3 w-20 rounded" /></th>
            <th className="py-3 px-4"><Skeleton className="h-3 w-16 rounded" /></th>
            <th className="py-3 px-4 text-right"><Skeleton className="h-3 w-14 rounded ml-auto" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <tr key={i}>
              <td className="py-3.5 px-4 space-y-1">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-2.5 w-20 rounded" />
              </td>
              <td className="py-3.5 px-4"><Skeleton className="h-4 w-16 rounded-full" /></td>
              <td className="py-3.5 px-4"><Skeleton className="h-3 w-36 rounded" /></td>
              <td className="py-3.5 px-4"><Skeleton className="h-3 w-12 rounded" /></td>
              <td className="py-3.5 px-4"><Skeleton className="h-4 w-28 rounded-full" /></td>
              <td className="py-3.5 px-4"><Skeleton className="h-4 w-20 rounded-full" /></td>
              <td className="py-3.5 px-4 text-right"><Skeleton className="h-7 w-20 rounded-lg ml-auto" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
