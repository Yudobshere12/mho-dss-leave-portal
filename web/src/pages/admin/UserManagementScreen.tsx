import React from 'react'
import { UserCog, UserPlus } from 'lucide-react'

export const UserManagementScreen: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Account Provisioning</h1>
          <p className="text-sm text-slate-500">
            Provision new employee accounts and assign system access roles.
          </p>
        </div>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700">
          <UserPlus className="h-4 w-4" />
          Create New Account
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <UserCog className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-800">Account Provisioning Rules</h2>
        </div>
        <p className="text-sm text-slate-600">
          Creating a new staff profile automatically seeds default leave credits:
        </p>
        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1 bg-slate-50 p-4 rounded-lg">
          <li><strong>Vacation Credits:</strong> 15.00 days</li>
          <li><strong>Sick Credits:</strong> 15.00 days</li>
          <li><strong>Emergency Credits:</strong> 5.00 days</li>
          <li><strong>Default System Role:</strong> STAFF</li>
        </ul>
      </div>
    </div>
  )
}
