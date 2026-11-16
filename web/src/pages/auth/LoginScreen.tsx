import React from 'react'
import { Activity, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export const LoginScreen: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Activity className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">MHO DSS Leave Portal</h1>
          <p className="text-xs text-slate-500">Municipal Health Office of Manolo Fortich</p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900">
          <div className="flex items-center gap-1.5 font-bold mb-1">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            Auth Deferred Mode
          </div>
          Authentication is currently bypassed. Enter the portal directly using the development user switcher in the header.
        </div>

        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email / Username</label>
            <input
              type="text"
              disabled
              defaultValue="admin@mho.gov.ph"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              disabled
              defaultValue="password123"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
            />
          </div>

          <Link
            to="/dashboard"
            className="block w-full text-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            Enter Portal (Dev Mode)
          </Link>
        </form>
      </div>
    </div>
  )
}
