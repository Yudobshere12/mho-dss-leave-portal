import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Database } from '../types/database.types'
import { useAuth } from './AuthContext'

export type Profile = Database['public']['Tables']['profiles']['Row']

export const FALLBACK_PROFILES: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Dr. Maria Clara Salcedo',
    email: 'head@mho.gov.ph',
    role: 'MHO_HEAD',
    status: 'approved',
    position: 'Municipal Health Officer',
    vacation_credits: 15.0,
    sick_credits: 15.0,
    emergency_credits: 5.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    full_name: 'Roberto Gomez',
    email: 'admin@mho.gov.ph',
    role: 'MHO_ADMIN',
    status: 'approved',
    position: 'Administrative Officer V',
    vacation_credits: 15.0,
    sick_credits: 15.0,
    emergency_credits: 5.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    full_name: 'Elena Rostata',
    email: 'hr@mho.gov.ph',
    role: 'LGU_HR',
    status: 'approved',
    position: 'Human Resource Management Officer II',
    vacation_credits: 15.0,
    sick_credits: 15.0,
    emergency_credits: 5.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    full_name: 'Juan dela Cruz',
    email: 'staff1@mho.gov.ph',
    role: 'STAFF',
    status: 'approved',
    position: 'Staff Nurse II',
    vacation_credits: 12.0,
    sick_credits: 15.0,
    emergency_credits: 5.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    full_name: 'Maria Santos',
    email: 'staff2@mho.gov.ph',
    role: 'STAFF',
    status: 'approved',
    position: 'Rural Health Midwife I',
    vacation_credits: 15.0,
    sick_credits: 13.0,
    emergency_credits: 5.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'a0000000-0000-0000-0000-000000000006',
    full_name: 'Antonio Luna',
    email: 'staff3@mho.gov.ph',
    role: 'STAFF',
    status: 'approved',
    position: 'Medical Technologist I',
    vacation_credits: 15.0,
    sick_credits: 15.0,
    emergency_credits: 5.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

interface DevRoleContextType {
  currentUser: Profile
  availableProfiles: Profile[]
  setCurrentUser: (user: Profile) => void
  isLoading: boolean
}

const DevRoleContext = createContext<DevRoleContextType | undefined>(undefined)

const LOCAL_STORAGE_KEY = 'mho_dss_dev_acting_user_id'

export const DevRoleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile: authProfile, loading: authLoading } = useAuth()
  const [availableProfiles] = useState<Profile[]>(FALLBACK_PROFILES)
  const [devSimulatedUser, setDevSimulatedUser] = useState<Profile | null>(null)

  // In development, check if developer manually chose a simulated user in localStorage
  useEffect(() => {
    if (import.meta.env.DEV) {
      const savedId = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (savedId) {
        const found = FALLBACK_PROFILES.find((p) => p.id === savedId)
        if (found) {
          setDevSimulatedUser(found)
        }
      }
    }
  }, [])

  // Production or when real authenticated profile exists: Real profile drives the user role!
  // In DEV: allows simulated user only if explicit dev setting was saved and no real session,
  // or user selects one in dev mode.
  const resolvedCurrentUser: Profile =
    authProfile ??
    (import.meta.env.DEV && devSimulatedUser ? devSimulatedUser : FALLBACK_PROFILES[0])

  const setCurrentUser = (user: Profile) => {
    if (import.meta.env.DEV) {
      setDevSimulatedUser(user)
      localStorage.setItem(LOCAL_STORAGE_KEY, user.id)
    }
  }

  return (
    <DevRoleContext.Provider
      value={{
        currentUser: resolvedCurrentUser,
        availableProfiles,
        setCurrentUser,
        isLoading: authLoading,
      }}
    >
      {children}
    </DevRoleContext.Provider>
  )
}

export function useDevRole() {
  const context = useContext(DevRoleContext)
  if (!context) {
    throw new Error('useDevRole must be used within a DevRoleProvider')
  }
  return context
}
