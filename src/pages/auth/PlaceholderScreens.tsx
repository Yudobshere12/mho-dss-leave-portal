import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'

interface PlaceholderCardProps {
  title: string
  description: string
}

export const PlaceholderCard: React.FC<PlaceholderCardProps> = ({ title, description }) => {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-50/70 via-slate-50 to-white flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-soft border border-slate-100 p-8 text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 border border-teal-100">
          <Clock className="h-7 w-7" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <div className="mt-1.5 mx-auto h-1 w-10 rounded-full bg-teal-700" />
          <p className="text-xs text-slate-500 mt-3 leading-relaxed">{description}</p>
        </div>

        <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-3.5 text-xs text-teal-900 font-medium">
          This feature is scheduled for implementation in the next release phase.
        </div>

        <div className="pt-2">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 px-5 py-2.5 text-xs font-semibold text-white shadow-soft hover:bg-teal-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}

export const ForgotPasswordScreen: React.FC = () => {
  return (
    <PlaceholderCard
      title="Reset Password"
      description="Password self-service recovery will be powered by Supabase Authentication."
    />
  )
}

export const RegisterScreen: React.FC = () => {
  return (
    <PlaceholderCard
      title="Create Account"
      description="Personnel self-registration with employee ID verification is coming soon."
    />
  )
}
