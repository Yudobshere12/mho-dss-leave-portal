import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'

interface NotAuthorizedFallbackProps {
  message?: string
}

export const NotAuthorizedFallback: React.FC<NotAuthorizedFallbackProps> = ({
  message = "You don't have permission to access this resource under your current role.",
}) => {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50/50 p-8 text-center max-w-lg mx-auto shadow-2xs">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700 mb-3 border border-red-200">
        <ShieldAlert className="h-6 w-6" />
      </div>
      <h2 className="text-base font-bold text-slate-900 mb-1.5">Not Authorized</h2>
      <p className="text-xs text-slate-600 leading-relaxed mb-5">
        {message}
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Return to Dashboard
      </Link>
    </div>
  )
}

export default NotAuthorizedFallback
