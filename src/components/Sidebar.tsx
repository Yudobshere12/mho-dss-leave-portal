import React, { useState, useRef, useEffect } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSignature,
  CalendarCheck,
  ClipboardList,
  Users,
  UserCog,
  FileText,
  ChevronDown,
  Sun,
  Moon,
  LogOut,
  X,
} from 'lucide-react'
import { useDevRole } from '../context/DevRoleContext'
import { useTheme } from '../context/ThemeContext'
import logoMarkSvg from '../assets/logo-mark.svg'
import type { UserRole } from '../types/database.types'

interface NavItemConfig {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  allowedRoles: UserRole[]
}

interface NavGroupConfig {
  title: string
  items: NavItemConfig[]
}

const NAV_GROUPS: NavGroupConfig[] = [
  {
    title: 'Main',
    items: [
      {
        label: 'Dashboard',
        to: '/dashboard',
        icon: LayoutDashboard,
        allowedRoles: ['STAFF', 'MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'],
      },
      {
        label: 'File Leave',
        to: '/leaves/apply',
        icon: FileSignature,
        allowedRoles: ['STAFF', 'MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'],
      },
      {
        label: 'Approval Queue',
        to: '/approvals',
        icon: CalendarCheck,
        allowedRoles: ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'],
      },
    ],
  },
  {
    title: 'Manage',
    items: [
      {
        label: 'Leave Monitor',
        to: '/admin/leaves',
        icon: ClipboardList,
        allowedRoles: ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'],
      },
      {
        label: 'Personnel Directory',
        to: '/admin/personnel',
        icon: Users,
        allowedRoles: ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'],
      },
      {
        label: 'User Management',
        to: '/admin/users',
        icon: UserCog,
        allowedRoles: ['MHO_ADMIN'],
      },
      {
        label: 'Audit Logs',
        to: '/reports/audit-logs',
        icon: FileText,
        allowedRoles: ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'],
      },
    ],
  },
]

interface SidebarItemProps {
  item: NavItemConfig
  isExpanded: boolean
  onClick?: () => void
}

const SidebarItem: React.FC<SidebarItemProps> = ({ item, isExpanded, onClick }) => {
  const Icon = item.icon

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      aria-label={item.label}
      className={({ isActive }) =>
        `group relative flex items-center h-10 w-full rounded-full transition-colors motion-reduce:transition-none focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
          isActive
            ? 'bg-teal-700 text-white font-semibold dark:bg-white dark:text-teal-950 shadow-soft'
            : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
        }`
      }
    >
      <div className="flex w-16 shrink-0 items-center justify-center">
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      </div>
      <span
        className={`whitespace-nowrap text-xs font-medium pr-4 transition-opacity duration-200 motion-reduce:transition-none ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {item.label}
      </span>
    </NavLink>
  )
}

interface SidebarGroupProps {
  group: NavGroupConfig
  userRole: UserRole
  isExpanded: boolean
  onItemClick?: () => void
  showDivider?: boolean
}

const SidebarGroup: React.FC<SidebarGroupProps> = ({
  group,
  userRole,
  isExpanded,
  onItemClick,
  showDivider,
}) => {
  const accessibleItems = group.items.filter((item) =>
    item.allowedRoles.includes(userRole)
  )

  if (accessibleItems.length === 0) return null

  return (
    <div className="space-y-1">
      {showDivider && (
        <div className="my-2 border-t border-slate-200 dark:border-slate-750 mx-3" />
      )}
      <div
        className={`px-4 pb-1 text-2xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 transition-opacity duration-200 ${
          isExpanded ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden pb-0'
        }`}
      >
        {group.title}
      </div>
      <div className="space-y-1">
        {accessibleItems.map((item) => (
          <SidebarItem
            key={item.to}
            item={item}
            isExpanded={isExpanded}
            onClick={onItemClick}
          />
        ))}
      </div>
    </div>
  )
}

interface ThemeToggleProps {
  isExpanded: boolean
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isExpanded }) => {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="group relative flex items-center h-10 w-full rounded-full text-slate-600 hover:bg-teal-50 hover:text-teal-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white transition-colors motion-reduce:transition-none focus:outline-hidden focus:ring-2 focus:ring-teal-500"
    >
      <div className="flex w-16 shrink-0 items-center justify-center">
        {isDark ? (
          <Moon className="h-5 w-5 text-amber-300 shrink-0" aria-hidden="true" />
        ) : (
          <Sun className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />
        )}
      </div>
      <span
        className={`whitespace-nowrap text-xs font-medium pr-4 transition-opacity duration-200 motion-reduce:transition-none ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {isDark ? 'Dark Mode' : 'Light Mode'}
      </span>
    </button>
  )
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { currentUser, availableProfiles, setCurrentUser } = useDevRole()
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const collapseTimerRef = useRef<number | null>(null)
  const roleDropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()

  const isExpandedDesktop = isHovered || isFocused

  const handleMouseEnter = () => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    if (collapseTimerRef.current) {
      window.clearTimeout(collapseTimerRef.current)
    }
    collapseTimerRef.current = window.setTimeout(() => {
      setIsHovered(false)
      setIsRoleDropdownOpen(false)
    }, 150)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsFocused(false)
      setIsRoleDropdownOpen(false)
    }
  }

  // Close dropdown on click outside
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

  // Auto-close on route change
  useEffect(() => {
    setIsRoleDropdownOpen(false)
    if (onClose) onClose()
  }, [location.pathname])

  const userInitials =
    currentUser.full_name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'

  const renderContent = (expanded: boolean, isMobile: boolean) => (
    <div className="flex h-full flex-col justify-between overflow-hidden">
      {/* Top Section */}
      <div className="flex flex-col min-w-0">
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center w-full min-w-0">
            <div className="flex w-10 shrink-0 items-center justify-center ml-1">
              <img
                src={logoMarkSvg}
                alt="MHO Logo"
                className="h-8 w-8 object-contain shrink-0"
              />
            </div>
            <div
              className={`ml-3 flex flex-col min-w-0 transition-opacity duration-200 motion-reduce:transition-none ${
                expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <span className="text-xs font-bold leading-tight text-slate-900 dark:text-white truncate">
                MHO DSS Portal
              </span>
              <span className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                Municipal Health Office
              </span>
            </div>
          </div>

          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Role Pill Switcher (DevRoleContext) */}
        <div className="px-2 py-3 relative" ref={roleDropdownRef}>
          <button
            type="button"
            onClick={() => setIsRoleDropdownOpen((prev) => !prev)}
            aria-label={`Acting as ${currentUser.full_name} (${currentUser.role}). Click to switch role.`}
            aria-haspopup="listbox"
            aria-expanded={isRoleDropdownOpen}
            className={`group flex items-center transition-all motion-reduce:transition-none focus:outline-hidden focus:ring-2 focus:ring-teal-500 ${
              expanded
                ? 'w-full rounded-full border border-teal-300 dark:border-teal-700/60 bg-teal-50/70 dark:bg-teal-950/40 px-3 py-1.5 text-left'
                : 'mx-auto h-10 w-10 justify-center rounded-full border border-teal-300 dark:border-teal-700/60 bg-teal-50/70 dark:bg-teal-950/40'
            }`}
          >
            <div
              className={`flex shrink-0 items-center justify-center rounded-full font-bold text-2xs ${
                expanded
                  ? 'h-6 w-6 bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950 mr-2'
                  : 'h-7 w-7 bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950'
              }`}
            >
              {userInitials}
            </div>

            {expanded && (
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="truncate pr-1">
                  <div className="text-2xs font-bold text-teal-950 dark:text-teal-100 truncate">
                    {currentUser.full_name}
                  </div>
                  <div className="text-3xs text-teal-800 dark:text-teal-300 truncate">
                    {currentUser.role} &bull; TEMPORARY
                  </div>
                </div>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-teal-700 dark:text-teal-300 shrink-0 transition-transform duration-200 ${
                    isRoleDropdownOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </div>
            )}
          </button>

          {/* Role Dropdown Menu */}
          {isRoleDropdownOpen && (
            <div
              role="listbox"
              aria-label="Select simulated user profile"
              className="absolute left-2 right-2 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-card"
            >
              <div className="px-2 py-1 text-3xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                Switch Role (Dev Preview)
              </div>
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
                        ? 'bg-teal-700 text-white dark:bg-teal-600 font-semibold'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="font-semibold truncate">{p.full_name}</div>
                    <div
                      className={`text-2xs truncate ${
                        isSelected ? 'text-teal-100' : 'text-slate-400 dark:text-slate-400'
                      }`}
                    >
                      {p.role} &bull; {p.position || 'Staff'}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Navigation Groups */}
        <nav
          className="flex-1 overflow-y-auto px-2 space-y-2"
          aria-label="Sidebar Navigation"
        >
          {NAV_GROUPS.map((group, idx) => (
            <SidebarGroup
              key={group.title}
              group={group}
              userRole={currentUser.role}
              isExpanded={expanded}
              onItemClick={isMobile ? onClose : undefined}
              showDivider={idx > 0}
            />
          ))}
        </nav>
      </div>

      {/* Bottom Block */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2 space-y-1">
        {/* Theme Toggle */}
        <ThemeToggle isExpanded={expanded} />

        {/* Sign Out Action */}
        <Link
          to="/login"
          onClick={isMobile ? onClose : undefined}
          aria-label="Sign Out"
          className="group relative flex items-center h-10 w-full rounded-full text-slate-600 hover:bg-red-50 hover:text-red-700 dark:text-slate-300 dark:hover:bg-red-950/40 dark:hover:text-red-300 transition-colors motion-reduce:transition-none focus:outline-hidden focus:ring-2 focus:ring-red-500"
        >
          <div className="flex w-16 shrink-0 items-center justify-center">
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          </div>
          <span
            className={`whitespace-nowrap text-xs font-medium pr-4 transition-opacity duration-200 motion-reduce:transition-none ${
              expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            Sign Out
          </span>
        </Link>

        {/* Avatar block with user info */}
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center h-11 w-full rounded-full px-1">
            <div className="flex w-14 shrink-0 items-center justify-center">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-800 dark:bg-white/10 dark:text-white border border-teal-200 dark:border-white/20 font-bold text-2xs"
                title={currentUser.full_name}
              >
                {userInitials}
              </div>
            </div>
            <div
              className={`flex-1 min-w-0 pl-1 transition-opacity duration-200 motion-reduce:transition-none ${
                expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {currentUser.full_name}
              </div>
              <div className="text-2xs text-slate-500 dark:text-slate-400 truncate">
                {currentUser.role}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Supabase-style Sidebar */}
      <aside
        aria-label="Application sidebar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`hidden md:block fixed inset-y-0 left-0 z-40 bg-white dark:bg-teal-950 border-r border-slate-200 dark:border-teal-900 transition-[width,box-shadow] duration-200 motion-reduce:transition-none ${
          isExpandedDesktop ? 'w-[248px] shadow-soft' : 'w-16'
        }`}
      >
        {renderContent(isExpandedDesktop, false)}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-50 flex h-full w-[248px] flex-col bg-white dark:bg-teal-950 border-r border-slate-200 dark:border-teal-900 shadow-xl">
            {renderContent(true, true)}
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
