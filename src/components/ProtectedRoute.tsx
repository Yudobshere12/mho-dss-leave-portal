import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useDevRole } from '../context/DevRoleContext'
import { isRouteAllowed } from '../lib/permissions'
import { LoadingState } from './LoadingState'
import type { UserRole } from '../types/database.types'

interface ProtectedRouteProps {
  children?: React.ReactNode
  requiredRoute?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRoute }) => {
  const { session, status, role: authRole, loading } = useAuth()
  const { currentUser } = useDevRole()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <LoadingState message="Checking authentication & access permissions..." />
      </div>
    )
  }

  // 1. Not signed in -> redirect to /login
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 2. Pending approval -> redirect to /pending
  if (status === 'pending') {
    return <Navigate to="/pending" replace />
  }

  // 3. Rejected -> redirect to /denied
  if (status === 'rejected') {
    return <Navigate to="/denied" replace />
  }

  // Active role is driven by authentic authenticated profile (or dev mode fallback)
  const activeRole: UserRole = authRole || currentUser.role

  // 4. Role-based route permission check
  const routeToCheck = requiredRoute || location.pathname
  if (routeToCheck && routeToCheck !== '/' && routeToCheck !== '/unauthorized') {
    if (!isRouteAllowed(activeRole, routeToCheck)) {
      // User is not authorized for this specific route -> redirect to /dashboard
      // Include state so dashboard or layout can display an unauthorized toast/fallback if needed
      return <Navigate to="/dashboard" state={{ unauthorizedRoute: routeToCheck }} replace />
    }
  }

  return children ? <>{children}</> : null
}

export default ProtectedRoute
