import React from 'react'
import { useDevRole } from '../context/DevRoleContext'
import { UserCheck, Menu, User } from 'lucide-react'

interface HeaderProps {
  onToggleSidebar?: () => void
  title?: string
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, title }) => {
  const { currentUser } = useDevRole()

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'MHO_HEAD':
        return 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800'
      case 'MHO_ADMIN':
        return 'bg-teal-100 text-teal-900 border-teal-300 dark:bg-teal-900/60 dark:text-teal-200 dark:border-teal-700'
      case 'LGU_HR':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-8 shadow-xs transition-colors">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {title && (
          <h2 className="hidden sm:block text-base font-bold text-slate-900 dark:text-white mr-2">
            {title}
          </h2>
        )}

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeColor(
            currentUser.role
          )}`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {currentUser.role}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {/* User profile info */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right md:block">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{currentUser.full_name}</div>
            <div className="text-2xs text-slate-500 dark:text-slate-400">{currentUser.position || currentUser.email}</div>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200 border border-teal-200 dark:border-teal-700 font-bold text-xs"
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

export default Header
