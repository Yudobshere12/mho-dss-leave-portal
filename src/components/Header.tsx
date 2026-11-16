import React from 'react'
import { useDevRole } from '../context/DevRoleContext'
import { UserCheck, Menu, User } from 'lucide-react'

interface HeaderProps {
  onToggleSidebar?: () => void
  title?: string
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { currentUser, availableProfiles, setCurrentUser } = useDevRole()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'MHO_HEAD':
        return 'bg-teal-50 text-teal-800 border-teal-200'
      case 'MHO_ADMIN':
        return 'bg-teal-100 text-teal-900 border-teal-300'
      case 'LGU_HR':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200'
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8 shadow-xs">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {title && (
          <h2 className="hidden sm:block text-base font-bold text-slate-900 mr-2">
            {title}
          </h2>
        )}

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
        {/* Role Switcher */}
        <div className="flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs text-teal-900 shadow-2xs">
          <UserCheck className="h-4 w-4 text-teal-700 shrink-0" />
          <span className="hidden font-medium sm:inline">
            <span className="font-semibold text-teal-950">Switch Role:</span>
          </span>
          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = availableProfiles.find((p) => p.id === e.target.value)
              if (selected) setCurrentUser(selected)
            }}
            className="rounded-full border border-teal-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 shadow-2xs focus:border-teal-700 focus:outline-hidden focus:ring-1 focus:ring-teal-700"
            title="Switch User Role"
          >
            {availableProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.role})
              </option>
            ))}
          </select>
        </div>

        {/* User avatar placeholder & info */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right md:block">
            <div className="text-sm font-semibold text-slate-800">{currentUser.full_name}</div>
            <div className="text-xs text-slate-500">{currentUser.position || currentUser.email}</div>
          </div>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-bold text-xs"
            title={currentUser.full_name}
          >
            {currentUser.full_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || <User className="h-4 w-4" />}
          </div>
        </div>
      </div>
    </header>
  )
}
