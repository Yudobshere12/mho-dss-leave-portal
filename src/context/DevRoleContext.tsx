import React, { createContext, useContext, useState, useEffect } from 'react'
import type { Database } from '../types/database.types'
import { supabase } from '../lib/supabase'

export type Profile = Database['public']['Tables']['profiles']['Row']

export const FALLBACK_PROFILES: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Dr. Maria Clara Salcedo',
    email: 'head@mho.gov.ph',
    role: 'MHO_HEAD',
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
  const [availableProfiles, setAvailableProfiles] = useState<Profile[]>(FALLBACK_PROFILES)
  const [currentUser, setCurrentUserState] = useState<Profile>(FALLBACK_PROFILES[1]) // Default to Admin
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProfiles() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('role', { ascending: false })

        if (error) {
          console.warn('Could not load profiles from Supabase, using fallback roster:', error.message)
          setAvailableProfiles(FALLBACK_PROFILES)
        } else if (data && data.length > 0) {
          setAvailableProfiles(data)
          const savedId = localStorage.getItem(LOCAL_STORAGE_KEY)
          const found = data.find((p) => p.id === savedId)
          if (found) {
            setCurrentUserState(found)
          } else {
            setCurrentUserState(data[0])
          }
        }
      } catch (err) {
        console.warn('Profiles fetch error, using fallback roster:', err)
        setAvailableProfiles(FALLBACK_PROFILES)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfiles()
  }, [])

  const setCurrentUser = (user: Profile) => {
    setCurrentUserState(user)
    localStorage.setItem(LOCAL_STORAGE_KEY, user.id)
  }

  return (
    <DevRoleContext.Provider
      value={{
        currentUser,
        availableProfiles,
        setCurrentUser,
        isLoading,
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
