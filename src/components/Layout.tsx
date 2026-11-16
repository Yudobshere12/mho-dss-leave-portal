import React, { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

const getPageTitle = (pathname: string): string => {
  if (pathname.includes('/dashboard')) return 'Executive Dashboard'
  if (pathname.includes('/leaves/apply')) return 'Apply for Leave'
  if (pathname.includes('/admin/leaves/file')) return 'File On-Behalf / Walk-in'
  if (pathname.includes('/admin/leaves')) return 'Leave Monitor Hub'
  if (pathname.includes('/approvals')) return 'Approval Queue'
  if (pathname.includes('/admin/personnel')) return 'Personnel Directory'
  if (pathname.includes('/admin/users')) return 'User Management'
  if (pathname.includes('/reports/audit-logs')) return 'Audit Logs & Analytics'
  return 'MHO Portal'
}

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-50 transition-colors">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 md:pl-16">
        <Header
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
          title={pageTitle}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
