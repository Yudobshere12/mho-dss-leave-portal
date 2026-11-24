import type { Session, User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Database, UserRole, UserStatus } from '../types/database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']

export interface AuthContextType {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  status: UserStatus | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<Profile | null>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchProfileForUser = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching profile:', error.message)
        return null
      }
      if (!data) return null

      // Also fetch live credits from leave_balances table if available
      try {
        const { data: balanceData } = await supabase
          .from('leave_balances')
          .select('vacation_credits, sick_credits, emergency_credits')
          .eq('user_id', userId)
          .maybeSingle()

        if (balanceData) {
          return {
            ...data,
            vacation_credits: Number(balanceData.vacation_credits),
            sick_credits: Number(balanceData.sick_credits),
            emergency_credits: Number(balanceData.emergency_credits),
          }
        }
      } catch (balErr) {
        console.warn('Could not fetch separate leave_balances record:', balErr)
      }

      return data
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      return null
    }
  }, [])

  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    if (!user) {
      setProfile(null)
      return null
    }
    const updated = await fetchProfileForUser(user.id)
    setProfile(updated)
    return updated
  }, [user, fetchProfileForUser])

  useEffect(() => {
    let isMounted = true

    // 1. Initial active session check
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession }, error }) => {
        if (!isMounted) return
        if (error) {
          console.error('Error fetching initial session:', error.message)
        }
        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          const userProfile = await fetchProfileForUser(initialSession.user.id)
          if (isMounted) {
            setProfile(userProfile)
            setLoading(false)
          }
        } else {
          if (isMounted) {
            setProfile(null)
            setLoading(false)
          }
        }
      })
      .catch((err) => {
        console.error('Unexpected error fetching initial session:', err)
        if (isMounted) {
          setLoading(false)
        }
      })

    // 2. Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!isMounted) return
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        const userProfile = await fetchProfileForUser(currentSession.user.id)
        if (isMounted) {
          setProfile(userProfile)
          setLoading(false)
        }
      } else {
        if (isMounted) {
          setProfile(null)
          setLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfileForUser])

  const signInWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) throw error
  }

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setProfile(null)
    if (error) throw error
  }

  const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  const role = profile?.role ?? null
  const status = profile?.status ?? null

  const value: AuthContextType = {
    session,
    user,
    profile,
    role,
    status,
    loading,
    signInWithGoogle,
    signUp,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
