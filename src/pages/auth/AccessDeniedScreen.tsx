import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import mhoLogoPng from '../../assets/MHO_logo_cropped.png'

export const AccessDeniedScreen: React.FC = () => {
  const { user, profile, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-radial from-slate-50 via-red-50/20 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-card text-center"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600 mb-5 border border-red-200">
          <ShieldAlert className="h-8 w-8" />
        </div>

        <div className="flex items-center justify-center gap-2 mb-3">
          <img src={mhoLogoPng} alt="MHO Logo" className="h-6 w-6 object-contain" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            MHO DSS Leave Portal
          </span>
        </div>

        <h1 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Your account request has been reviewed and rejected by the administration, or you do not have permission to access this portal. Please contact your MHO Administrator or HR department for assistance.
        </p>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 mb-6 text-left text-xs space-y-1.5">
          <div className="flex justify-between">
            <span className="text-slate-500">Account:</span>
            <span className="font-semibold text-slate-800">
              {profile?.full_name || user?.user_metadata?.full_name || 'Staff Member'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Email:</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px]">
              {user?.email}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-red-100 text-red-800">
              REJECTED
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-60"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : (
            <LogOut className="h-4 w-4 text-slate-500" />
          )}
          <span>Sign Out</span>
        </button>
      </motion.div>
    </div>
  )
}

export default AccessDeniedScreen
