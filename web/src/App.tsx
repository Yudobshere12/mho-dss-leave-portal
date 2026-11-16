import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DevRoleProvider } from './context/DevRoleContext'
import { Layout } from './components/Layout'

// Screens
import { LoginScreen } from './pages/auth/LoginScreen'
import { ExecutiveDashboard } from './pages/dashboard/ExecutiveDashboard'
import { LeaveFilingPage } from './pages/leaves/LeaveFilingPage'
import { ApprovalQueueScreen } from './pages/leaves/ApprovalQueueScreen'
import { LeaveMonitorHub } from './pages/admin/LeaveMonitorHub'
import { PersonnelDirectoryScreen } from './pages/admin/PersonnelDirectoryScreen'
import { UserManagementScreen } from './pages/admin/UserManagementScreen'
import { AuditLogsScreen } from './pages/reports/AuditLogsScreen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DevRoleProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginScreen />} />

            {/* Protected Portal Layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ExecutiveDashboard />} />
              
              {/* Leave Filing (Self & Admin On-Behalf) */}
              <Route path="/leaves/apply" element={<LeaveFilingPage />} />
              <Route path="/admin/leaves/file" element={<LeaveFilingPage />} />
              
              {/* Approval & Monitor */}
              <Route path="/approvals" element={<ApprovalQueueScreen />} />
              <Route path="/admin/leaves" element={<LeaveMonitorHub />} />
              
              {/* Personnel & Administration */}
              <Route path="/admin/personnel" element={<PersonnelDirectoryScreen />} />
              <Route path="/admin/users" element={<UserManagementScreen />} />
              <Route path="/reports/audit-logs" element={<AuditLogsScreen />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </DevRoleProvider>
    </QueryClientProvider>
  )
}

export default App
