import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingState } from './LoadingState'
import { PendingApprovalScreen } from '../pages/auth/PendingApprovalScreen'
import { AccessDeniedScreen } from '../pages/auth/AccessDeniedScreen'

interface ApprovalGateRouteProps {
  type: 'pending' | 'denied'
}

export const ApprovalGateRoute: React.FC<ApprovalGateRouteProps> = ({ type }) => {
  const { session, status, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-50">
        <LoadingState message="Checking account status..." />
      </div>
    )
  }

  // Not signed in -> login
  if (!session) {
    return <Navigate to="/login" replace />
  }

  // Approved users should not be stuck on /pending or /denied
  if (status === 'approved') {
    return <Navigate to="/dashboard" replace />
  }

  if (type === 'pending') {
    // If user is actually rejected, redirect to /denied
    if (status === 'rejected') {
      return <Navigate to="/denied" replace />
    }
    return <PendingApprovalScreen />
  }

  if (type === 'denied') {
    // If user is actually pending, redirect to /pending
    if (status === 'pending') {
      return <Navigate to="/pending" replace />
    }
    return <AccessDeniedScreen />
  }

  return <Navigate to="/login" replace />
}

export default ApprovalGateRoute
