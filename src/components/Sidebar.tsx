import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  FileSignature,
  CalendarCheck,
  ClipboardList,
  Users,
  UserCog,
  FileText,
  LogOut,
  X,
} from 'lucide-react'
import { useDevRole } from '../context/DevRoleContext'
import { useAuth } from '../context/AuthContext'
import { isRouteAllowed } from '../lib/permissions'
import { supabase } from '../lib/supabase'
import mhoLogoPng from '../assets/MHO_logo_cropped.png'
import type { UserRole } from '../types/database.types'

interface NavItemConfig {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
  badge?: number | null
}

interface NavGroupConfig {
  title: string
  items: NavItemConfig[]
}

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
      <div className={`relative flex shrink-0 items-center justify-center ${isExpanded ? 'w-12 ml-1' : 'w-10'}`}>
        <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
        {/* Collapsed Badge indicator */}
        {!isExpanded && item.badge != null && item.badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-3xs font-extrabold text-white ring-2 ring-white">
            {item.badge}
          </span>
        )}
      </div>
      <span
        className={`flex-1 whitespace-nowrap text-xs font-medium pr-3 transition-opacity duration-200 motion-reduce:transition-none ${
          isExpanded ? 'opacity-100 flex items-center justify-between' : 'opacity-0 pointer-events-none hidden'
        }`}
      >
        <span>{item.label}</span>
        {isExpanded && item.badge != null && item.badge > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-3xs font-extrabold text-white">
            {item.badge}
          </span>
        )}
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
  // Rebuilt: checks the central permissions configuration directly
  const accessibleItems = group.items.filter((item) =>
    isRouteAllowed(userRole, item.to)
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
  const { role: authRole, signOut } = useAuth()
  const activeRole: UserRole = authRole || currentUser.role

  const [isHovered, setIsHovered] = useState(false)
  const [pendingUserCount, setPendingUserCount] = useState<number>(0)
  const location = useLocation()

  // Fetch pending users count for MHO_ADMIN badge
  useEffect(() => {
    if (activeRole !== 'MHO_ADMIN') {
      setPendingUserCount(0)
      return
    }

    let isMounted = true

    const fetchPendingCount = async () => {
      try {
        const { count, error } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (!error && count !== null && isMounted) {
          setPendingUserCount(count)
        }
      } catch (e) {
        console.warn('Error fetching pending users count:', e)
      }
    }

    fetchPendingCount()

    const interval = setInterval(fetchPendingCount, 30000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [activeRole])

  // Navigation definition (allowedRoles property removed; filtering reads centrally from permissions.ts)
  const navGroups: NavGroupConfig[] = [
    {
      title: 'Main',
      items: [
        {
          label: 'Dashboard',
          to: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          label: 'File Leave',
          to: '/leaves/apply',
          icon: FileSignature,
        },
        {
          label: 'Approval Queue',
          to: '/approvals',
          icon: CalendarCheck,
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
        },
        {
          label: 'Personnel Directory',
          to: '/admin/personnel',
          icon: Users,
        },
        {
          label: 'User Management',
          to: '/admin/users',
          icon: UserCog,
          badge: pendingUserCount,
        },
        {
          label: 'Audit Logs',
          to: '/reports/audit-logs',
          icon: FileText,
        },
      ],
    },
  ]

  // Auto-close on route change
  useEffect(() => {
    setIsHovered(false)
    if (onClose) onClose()
  }, [location.pathname])

  // Lock body scroll on mobile and handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

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
          {navGroups.map((group, idx) => (
            <SidebarGroup
              key={group.title}
              group={group}
              userRole={activeRole}
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
        <button
          type="button"
          onClick={async () => {
            try {
              await signOut()
            } catch (e) {
              console.error('Sign out error:', e)
            }
            if (isMobile && onClose) onClose()
          }}
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
        </button>

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
              <div className="truncate text-xs font-bold text-slate-800 leading-tight">
                {currentUser.full_name}
              </div>
              <div className="truncate text-3xs font-medium text-slate-500">
                {currentUser.role} &bull; {currentUser.position || 'Staff'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Mobile Navigation"
        aria-hidden={!isOpen}
      >
        {renderContent(true, true)}
      </aside>

      {/* Desktop Persistent Sidebar with Hover Expand (at and above lg: 1024px) */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 bg-white border-r border-slate-200 transition-[width] duration-200 ease-in-out ${
          isHovered ? 'w-64 shadow-xl' : 'w-16 shadow-xs'
        }`}
        aria-label="Desktop Navigation"
      >
        {renderContent(isHovered, false)}
      </aside>
    </>
  )
}

export default Sidebar
