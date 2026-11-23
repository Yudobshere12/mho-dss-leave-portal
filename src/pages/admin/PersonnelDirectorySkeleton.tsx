import React from 'react'
import { Skeleton } from '../../components/Skeleton'

export const PersonnelDirectorySkeleton: React.FC = () => {
  return (
    <div className="overflow-x-auto" aria-busy="true">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200 text-2xs uppercase">
          <tr>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-20 rounded" /></th>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-14 rounded" /></th>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-20 rounded" /></th>
            <th className="px-4 py-2.5 text-center"><Skeleton className="h-3 w-16 mx-auto rounded" /></th>
            <th className="px-4 py-2.5 text-center"><Skeleton className="h-3 w-16 mx-auto rounded" /></th>
            <th className="px-4 py-2.5 text-center"><Skeleton className="h-3 w-16 mx-auto rounded" /></th>
            <th className="px-4 py-2.5"><Skeleton className="h-3 w-14 rounded" /></th>
            <th className="px-4 py-2.5 text-right"><Skeleton className="h-3 w-14 ml-auto rounded" /></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <tr key={i}>
              <td className="px-4 py-3 space-y-1">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-2.5 w-40 rounded" />
              </td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded-full" /></td>
              <td className="px-4 py-3"><Skeleton className="h-3 w-28 rounded" /></td>
              <td className="px-4 py-3 text-center"><Skeleton className="h-3 w-10 mx-auto rounded" /></td>
              <td className="px-4 py-3 text-center"><Skeleton className="h-3 w-10 mx-auto rounded" /></td>
              <td className="px-4 py-3 text-center"><Skeleton className="h-3 w-10 mx-auto rounded" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-16 rounded-full" /></td>
              <td className="px-4 py-3 text-right"><Skeleton className="h-7 w-16 ml-auto rounded-lg" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
