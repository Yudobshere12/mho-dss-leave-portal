import React from 'react'
import { Users, CreditCard } from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'

export const PersonnelDirectoryScreen: React.FC = () => {
  const { availableProfiles } = useDevRole()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Personnel Directory & Credit Balances</h1>
        <p className="text-sm text-slate-500">
          Staff roster, leave entitlement allocations, and current active status.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-800">MHO Health Personnel</h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {availableProfiles.length} Total Accounts
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Full Name</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 text-center">Vacation Credits</th>
                <th className="px-4 py-3 text-center">Sick Credits</th>
                <th className="px-4 py-3 text-center">Emergency Credits</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {availableProfiles.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{p.full_name}</div>
                    <div className="text-2xs text-slate-400">{p.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-bold text-slate-700">
                      {p.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.position || '—'}</td>
                  <td className="px-4 py-3 text-center font-bold text-blue-700">{p.vacation_credits.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700">{p.sick_credits.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center font-bold text-amber-700">{p.emergency_credits.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-2xs font-semibold ${
                        p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
