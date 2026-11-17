import React, { useState, useRef, useEffect } from 'react'
import { useDevRole } from '../context/DevRoleContext'
import { UserCheck, Menu, User, ChevronDown } from 'lucide-react'

interface HeaderProps {
  onToggleSidebar?: () => void
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { currentUser, availableProfiles, setCurrentUser } = useDevRole()
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const roleDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(e.target as Node)
      ) {
        setIsRoleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

        {/* Current Active Role Badge */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getRoleBadgeColor(
            currentUser.role
          )}`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          {currentUser.role}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Switch Role Dropdown in Header */}
        <div className="relative" ref={roleDropdownRef}>
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
            aria-label={`Switch acting role. Currently ${currentUser.role}`}
            aria-haspopup="listbox"
            aria-expanded={isRoleDropdownOpen}
            className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50/80 px-3 py-1 text-xs font-semibold text-teal-900 hover:bg-teal-100/70 transition-colors focus:outline-hidden focus:ring-2 focus:ring-teal-700/30"
          >
            <span className="text-2xs text-teal-700 font-medium">Switch Role:</span>
            <span>{currentUser.role}</span>
            <ChevronDown
              className={`h-3 w-3 text-teal-700 transition-transform duration-200 ${
                isRoleDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isRoleDropdownOpen && (
            <div
              role="listbox"
              aria-label="Select simulated user profile"
              className="absolute right-0 top-full z-50 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-card"
            >
              <div className="px-2.5 py-1 text-3xs font-bold text-slate-400 uppercase tracking-wider">
                Simulate Role (Dev Preview)
              </div>
              <div className="space-y-0.5 mt-0.5 max-h-60 overflow-y-auto">
                {availableProfiles.map((p) => {
                  const isSelected = p.id === currentUser.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setCurrentUser(p)
                        setIsRoleDropdownOpen(false)
                      }}
                      className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ${
                        isSelected
                          ? 'bg-teal-700 text-white font-semibold'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-semibold truncate">{p.full_name}</div>
                      <div
                        className={`text-2xs truncate ${
                          isSelected ? 'text-teal-100' : 'text-slate-400'
                        }`}
                      >
                        {p.role} &bull; {p.position || 'Staff'}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-slate-200" />

        {/* User profile info */}
        <div className="flex items-center gap-2.5">
          <div className="hidden text-right md:block">
            <div className="text-xs font-semibold text-slate-800">{currentUser.full_name}</div>
            <div className="text-2xs text-slate-500">{currentUser.position || currentUser.email}</div>
          </div>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-bold text-xs"
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
