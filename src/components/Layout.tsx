import React, { useState, useCallback } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const handleClose = useCallback(() => setSidebarOpen(false), [])

  return (
    <div className="flex min-h-[100dvh] h-[100dvh] w-full overflow-hidden bg-slate-50 text-slate-900">
      <Sidebar isOpen={sidebarOpen} onClose={handleClose} />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 lg:pl-16">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
