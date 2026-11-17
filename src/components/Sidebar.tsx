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
  LogOut,
  X,
} from 'lucide-react'
import { useDevRole } from '../context/DevRoleContext'
import mhoLogoPng from '../assets/MHO_logo_cropped.png'
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
      title={!isExpanded ? item.label : undefined}
      className={({ isActive }) =>
        `group relative flex items-center h-10 rounded-full transition-colors motion-reduce:transition-none focus:outline-hidden focus:ring-2 focus:ring-teal-700 ${
          isExpanded ? 'w-full' : 'w-10 mx-auto justify-center'
        } ${
          isActive
            ? 'bg-teal-700 text-white font-semibold shadow-soft'
            : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
        }`
      }
    >
      <div className={`flex shrink-0 items-center justify-center ${isExpanded ? 'w-12 ml-1' : 'w-10'}`}>
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      </div>
      <span
        className={`whitespace-nowrap text-xs font-medium pr-4 transition-opacity duration-200 motion-reduce:transition-none ${
          isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
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
        <div className="my-2 border-t border-slate-200 mx-3" />
      )}
      <div
        className={`px-4 pb-1 text-3xs font-semibold uppercase tracking-widest text-slate-400 transition-opacity duration-150 ${
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

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { currentUser } = useDevRole()
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const collapseTimerRef = useRef<number | null>(null)
  const location = useLocation()

  const isExpandedDesktop = isHovered

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
  }

  const handleFocus = () => {
    setIsHovered(true)
  }

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsHovered(false)
    }
  }

  // Auto-close on route change
  useEffect(() => {
    setIsHovered(false)
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
    <div className="flex h-full flex-col justify-between overflow-x-hidden overflow-y-auto">
      {/* Top Section */}
      <div className="flex flex-col min-w-0">
        {/* Logo Section */}
        <div className="flex h-16 items-center px-3 border-b border-slate-200">
          <div className={`flex items-center ${expanded ? 'w-full' : 'w-10 mx-auto justify-center'}`}>
            <div className="flex w-10 shrink-0 items-center justify-center">
              <img
                src={mhoLogoPng}
                alt="MHO Logo"
                className="h-9 w-9 object-contain shrink-0 drop-shadow-xs"
              />
            </div>
            <div
              className={`ml-2.5 flex flex-col min-w-0 transition-opacity duration-150 motion-reduce:transition-none ${
                expanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
              }`}
            >
              <span className="text-sm font-bold leading-tight text-slate-900 tracking-tight truncate">
                MHO DSS Portal
              </span>
            </div>
          </div>

          {isMobile && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 ml-auto"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Groups */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 pt-3 space-y-2"
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
      <div className="border-t border-slate-200 p-2 space-y-1">
        {/* Sign Out Action */}
        <Link
          to="/login"
          onClick={isMobile ? onClose : undefined}
          aria-label="Sign Out"
          title={!expanded ? 'Sign Out' : undefined}
          className={`group relative flex items-center h-10 rounded-full text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors motion-reduce:transition-none focus:outline-hidden focus:ring-2 focus:ring-red-500 ${
            expanded ? 'w-full' : 'w-10 mx-auto justify-center'
          }`}
        >
          <div className={`flex shrink-0 items-center justify-center ${expanded ? 'w-12 ml-1' : 'w-10'}`}>
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          </div>
          <span
            className={`whitespace-nowrap text-xs font-medium pr-4 transition-opacity duration-200 motion-reduce:transition-none ${
              expanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
            }`}
          >
            Sign Out
          </span>
        </Link>

        {/* Avatar block with user info */}
        <div className="pt-1 border-t border-slate-100">
          <div className={`flex items-center h-11 rounded-full ${expanded ? 'w-full px-1' : 'w-10 mx-auto justify-center'}`}>
            <div className={`flex shrink-0 items-center justify-center ${expanded ? 'w-10' : 'w-10'}`}>
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-teal-800 border border-teal-200 font-bold text-2xs"
                title={currentUser.full_name}
              >
                {userInitials}
              </div>
            </div>
            <div
              className={`flex-1 min-w-0 pl-1.5 transition-opacity duration-200 motion-reduce:transition-none ${
                expanded ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
              }`}
            >
              <div className="text-xs font-semibold text-slate-900 truncate">
                {currentUser.full_name}
              </div>
              <div className="text-2xs text-slate-500 truncate">
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
      {/* Desktop Supabase-style Sidebar: White with teal active pill, no dark sidebar */}
      <aside
        aria-label="Application sidebar"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`hidden md:block fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-[width,box-shadow] duration-200 motion-reduce:transition-none overflow-x-hidden ${
          isExpandedDesktop ? 'w-[248px] shadow-soft' : 'w-16'
        }`}
      >
        {renderContent(isExpandedDesktop, false)}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="relative z-50 flex h-full w-[248px] flex-col bg-white border-r border-slate-200 shadow-xl overflow-x-hidden">
            {renderContent(true, true)}
          </aside>
        </div>
      )}
    </>
  )
}

export default Sidebar
