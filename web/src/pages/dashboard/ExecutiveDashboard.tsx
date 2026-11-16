import React from 'react'
import { LayoutDashboard, CheckCircle, Clock, XCircle, Users } from 'lucide-react'
import { useDevRole } from '../../context/DevRoleContext'

export const ExecutiveDashboard: React.FC = () => {
  const { currentUser } = useDevRole()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Executive Dashboard</h1>
        <p className="text-sm text-slate-500">
          Decision Support System (DSS) operational analytics and leave metrics.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Pending Requests</span>
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">2</div>
          <p className="mt-1 text-xs text-slate-500">Awaiting executive review</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Approved Leaves</span>
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">2</div>
          <p className="mt-1 text-xs text-slate-500">Scheduled active / past</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Rejected Filings</span>
            <XCircle className="h-5 w-5 text-rose-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">1</div>
          <p className="mt-1 text-xs text-slate-500">Duty coverage constraint</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Registered Personnel</span>
            <Users className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-3 text-3xl font-extrabold text-slate-900">6</div>
          <p className="mt-1 text-xs text-slate-500">Manolo Fortich MHO roster</p>
        </div>
      </div>

      {/* Placeholder Overview Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
        <div className="flex items-center gap-2 mb-4">
          <LayoutDashboard className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">DSS Decision Health & Staffing Coverage</h2>
        </div>
        <p className="text-sm text-slate-600">
          Currently reviewing as <span className="font-semibold text-slate-900">{currentUser.full_name}</span> ({currentUser.role}).
          In the completed portal, this section visualizes active personnel schedules and real-time minimum duty staffing levels.
        </p>
      </div>
    </div>
  )
}
