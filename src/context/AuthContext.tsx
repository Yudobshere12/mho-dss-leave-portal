import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export interface AuthContextType {
  session: Session | null
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    // 1. Fetch current active session on mount
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        if (error) {
          console.error('Error fetching initial session:', error.message)
        }
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Unexpected error fetching session:', err)
        setLoading(false)
      })

    // 2. Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      setLoading(false)
    })

    // 3. Unsubscribe on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signInWithGoogle = async (): Promise<void> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      throw error
    }
  }

  const signOut = async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }

  // Email/password sign‑up using Supabase
  const signUp = async (email: string, password: string): Promise<void> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      throw error
    }
  }

  const value = {
    session,
    user,
    loading,
    signInWithGoogle,
    signUp,
    signOut,
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
