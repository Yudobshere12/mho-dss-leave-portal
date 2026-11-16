import React from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  FilePlus,
  FileSignature,
  Users,
  UserCog,
  FileText,
  Activity,
  LogOut,
  X,
} from 'lucide-react'
import { useDevRole } from '../context/DevRoleContext'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
  const { currentUser } = useDevRole()
  const isManagement = ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'].includes(currentUser.role)
  const isHeadOrAdmin = ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)
  const isAdmin = currentUser.role === 'MHO_ADMIN'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-full px-3.5 py-2 text-sm font-medium transition-all ${
      isActive
        ? 'bg-teal-700 text-white shadow-soft font-semibold'
        : 'text-slate-600 hover:bg-teal-50 hover:text-teal-900'
    }`

  const sidebarContent = (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">MHO DSS Portal</h1>
            <p className="text-2xs text-slate-500">Municipal Health Office</p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Main Section */}
        <div>
          <div className="px-3 pb-2 text-2xs font-bold tracking-wider text-slate-400 uppercase">
            Main Navigation
          </div>
          <nav className="space-y-1">
            <NavLink to="/dashboard" onClick={onClose} className={navLinkClass}>
              <LayoutDashboard className="h-4 w-4" />
              Executive Dashboard
            </NavLink>
            <NavLink to="/leaves/apply" onClick={onClose} className={navLinkClass}>
              <FileSignature className="h-4 w-4" />
              Apply for Leave
            </NavLink>
            {isManagement && (
              <>
                <NavLink to="/admin/leaves" onClick={onClose} className={navLinkClass}>
                  <ClipboardList className="h-4 w-4" />
                  Leave Monitor
                </NavLink>
                {isHeadOrAdmin && (
                  <NavLink to="/approvals" onClick={onClose} className={navLinkClass}>
                    <CalendarCheck className="h-4 w-4" />
                    Approval Queue
                  </NavLink>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Administration Section */}
        {isManagement && (
          <div>
            <div className="px-3 pb-2 text-2xs font-bold tracking-wider text-slate-400 uppercase">
              Management & Records
            </div>
            <nav className="space-y-1">
              {isAdmin && (
                <NavLink to="/admin/leaves/file" onClick={onClose} className={navLinkClass}>
                  <FilePlus className="h-4 w-4" />
                  File On-Behalf / Walk-in
                </NavLink>
              )}
              <NavLink to="/admin/personnel" onClick={onClose} className={navLinkClass}>
                <Users className="h-4 w-4" />
                Personnel Directory
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin/users" onClick={onClose} className={navLinkClass}>
                  <UserCog className="h-4 w-4" />
                  User Provisioning
                </NavLink>
              )}
              <NavLink to="/reports/audit-logs" onClick={onClose} className={navLinkClass}>
                <FileText className="h-4 w-4" />
                Audit Logs & Analytics
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Footer & Logout */}
      <div className="border-t border-slate-200 p-4 space-y-2">
        <Link
          to="/login"
          onClick={onClose}
          className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-700 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </Link>
        <div className="rounded-xl bg-teal-50/60 border border-teal-100 p-2.5 text-xs text-slate-600">
          <div className="font-semibold text-teal-900">MHO DSS v2.0</div>
          <div className="text-2xs text-teal-700">Manolo Fortich, Bukidnon</div>
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex h-screen shrink-0">{sidebarContent}</div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="relative z-50 flex flex-col">{sidebarContent}</div>
        </div>
      )}
    </>
  )
}
