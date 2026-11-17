import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import { DevRoleProvider } from './context/DevRoleContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ApprovalGateRoute } from './components/ApprovalGateRoute'
import { Layout } from './components/Layout'

// Screens
import { LoginScreen } from './pages/auth/LoginScreen'
import { ForgotPasswordScreen, RegisterScreen } from './pages/auth/PlaceholderScreens'
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
      <AuthProvider>
        <DevRoleProvider>
          <BrowserRouter>
            <Routes>
              {/* Default entry redirects to /login */}
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Public routes */}
              <Route path="/login" element={<LoginScreen />} />
              <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
              <Route path="/register" element={<RegisterScreen />} />

              {/* Approval Gate Routes (pending / denied accounts) */}
              <Route path="/pending" element={<ApprovalGateRoute type="pending" />} />
              <Route path="/denied" element={<ApprovalGateRoute type="denied" />} />

              {/* Protected Portal Layout (approved accounts only) */}
              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                {/* /dashboard - STAFF, MHO_ADMIN, MHO_HEAD, LGU_HR */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute requiredRoute="/dashboard">
                      <ExecutiveDashboard />
                    </ProtectedRoute>
                  }
                />

                {/* Leave Filing - STAFF, MHO_ADMIN, MHO_HEAD */}
                <Route
                  path="/leaves/apply"
                  element={
                    <ProtectedRoute requiredRoute="/leaves/apply">
                      <LeaveFilingPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/leaves/file"
                  element={
                    <ProtectedRoute requiredRoute="/admin/leaves/file">
                      <LeaveFilingPage />
                    </ProtectedRoute>
                  }
                />

                {/* Approval Queue - MHO_HEAD only */}
                <Route
                  path="/approvals"
                  element={
                    <ProtectedRoute requiredRoute="/approvals">
                      <ApprovalQueueScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Leave Monitor - MHO_ADMIN, MHO_HEAD, LGU_HR */}
                <Route
                  path="/admin/leaves"
                  element={
                    <ProtectedRoute requiredRoute="/admin/leaves">
                      <LeaveMonitorHub />
                    </ProtectedRoute>
                  }
                />

                {/* Personnel Directory - MHO_ADMIN, MHO_HEAD, LGU_HR */}
                <Route
                  path="/admin/personnel"
                  element={
                    <ProtectedRoute requiredRoute="/admin/personnel">
                      <PersonnelDirectoryScreen />
                    </ProtectedRoute>
                  }
                />

                {/* User Management - MHO_ADMIN only */}
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requiredRoute="/admin/users">
                      <UserManagementScreen />
                    </ProtectedRoute>
                  }
                />

                {/* Audit Logs - MHO_HEAD, LGU_HR only */}
                <Route
                  path="/reports/audit-logs"
                  element={
                    <ProtectedRoute requiredRoute="/reports/audit-logs">
                      <AuditLogsScreen />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </DevRoleProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
