import React from 'react'
import { useDevRole } from '../context/DevRoleContext'
import { ShieldAlert, UserCheck } from 'lucide-react'

export const Header: React.FC = () => {
  const { currentUser, availableProfiles, setCurrentUser } = useDevRole()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'MHO_HEAD':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'MHO_ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'LGU_HR':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-6 shadow-xs">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeColor(
            currentUser.role
          )}`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {currentUser.role} Console
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* TEMPORARY DEV ROLE SWITCHER */}
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
          <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="hidden font-medium sm:inline">
            <span className="font-bold">[DEV ACTING AS]:</span>
          </span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = availableProfiles.find((p) => p.id === e.target.value)
              if (selected) setCurrentUser(selected)
            }}
            className="rounded border border-amber-300 bg-white px-2 py-1 font-medium text-slate-900 shadow-2xs focus:border-blue-500 focus:outline-hidden"
            title="Temporary Dev User Switcher (Replace in Auth Phase)"
          >
            {availableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.role})
              </option>
            ))}
          </select>
        </div>

        <div className="hidden text-right md:block">
          <div className="text-sm font-semibold text-slate-800">{currentUser.full_name}</div>
          <div className="text-xs text-slate-500">{currentUser.position || currentUser.email}</div>
        </div>
      </div>
    </header>
  )
}
