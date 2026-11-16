import React from 'react'
import { NavLink } from 'react-router-dom'
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
} from 'lucide-react'
import { useDevRole } from '../context/DevRoleContext'

export const Sidebar: React.FC = () => {
  const { currentUser } = useDevRole()
  const isManagement = ['MHO_ADMIN', 'MHO_HEAD', 'LGU_HR'].includes(currentUser.role)
  const isHeadOrAdmin = ['MHO_ADMIN', 'MHO_HEAD'].includes(currentUser.role)
  const isAdmin = currentUser.role === 'MHO_ADMIN'

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white shadow-xs'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
        <Activity className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">MHO DSS Portal</h1>
          <p className="text-2xs text-slate-500">Municipal Health Office</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Main Section */}
        <div>
          <div className="px-3 pb-2 text-2xs font-bold tracking-wider text-slate-400 uppercase">
            Main Navigation
          </div>
          <nav className="space-y-1">
            <NavLink to="/dashboard" className={navLinkClass}>
              <LayoutDashboard className="h-4 w-4" />
              Executive Dashboard
            </NavLink>
            <NavLink to="/leaves/apply" className={navLinkClass}>
              <FileSignature className="h-4 w-4" />
              Apply for Leave
            </NavLink>
            {isManagement && (
              <>
                <NavLink to="/admin/leaves" className={navLinkClass}>
                  <ClipboardList className="h-4 w-4" />
                  Leave Monitor
                </NavLink>
                {isHeadOrAdmin && (
                  <NavLink to="/approvals" className={navLinkClass}>
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
                <NavLink to="/admin/leaves/file" className={navLinkClass}>
                  <FilePlus className="h-4 w-4" />
                  File On-Behalf / Walk-in
                </NavLink>
              )}
              <NavLink to="/admin/personnel" className={navLinkClass}>
                <Users className="h-4 w-4" />
                Personnel Directory
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin/users" className={navLinkClass}>
                  <UserCog className="h-4 w-4" />
                  User Provisioning
                </NavLink>
              )}
              <NavLink to="/reports/audit-logs" className={navLinkClass}>
                <FileText className="h-4 w-4" />
                Audit Logs & Analytics
              </NavLink>
            </nav>
          </div>
        )}
      </div>

      {/* Current Dev Status Footer */}
      <div className="border-t border-slate-200 p-4">
        <div className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-600">
          <div className="font-semibold text-slate-800">MHO DSS v2.0 (Supabase)</div>
          <div className="text-2xs text-slate-500">Manolo Fortich, Bukidnon</div>
        </div>
      </div>
    </aside>
  )
}
