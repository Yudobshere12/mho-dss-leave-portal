import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  HeartPulse,
  Calendar,
  Users,
  ClipboardList,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { signIn } from '../../lib/auth'
import mhoLogoPng from '../../assets/MHO_logo.png'
import lguSeal from '../../assets/lgu-seal.svg'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  remember: z.boolean(),
})

type LoginFormValues = z.infer<typeof loginSchema>

export const LoginScreen: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  })

  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null)
    setIsSubmitting(true)
    try {
      await signIn(data.email, data.password, data.remember)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setAuthError(err.message)
      } else {
        setAuthError('An unexpected error occurred.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-teal-50/70 via-slate-50 to-white flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
      {/* Top Header Section */}
      <div className="flex flex-col items-center text-center mb-8 max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-16 w-16 rounded-full bg-white shadow-soft p-1.5 flex items-center justify-center border border-slate-100 overflow-hidden">
            <img src={mhoLogoPng} alt="MHO Logo" className="h-full w-full object-contain" />
          </div>
          <span className="text-xl font-bold text-slate-300">/</span>
          <div className="h-16 w-16 rounded-full bg-white shadow-soft p-2 flex items-center justify-center border border-slate-100">
            <img src={lguSeal} alt="LGU Seal" className="h-full w-full object-contain" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          MHO Leave DSS Portal
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
          Municipal Health Office Leave Management & Decision Support
        </p>
      </div>

      {/* Main Split Card */}
      <div className="w-full max-w-[1100px] rounded-2xl bg-white shadow-soft border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Left Half: Teal Gradient Panel */}
        <div className="relative bg-gradient-to-br from-teal-700 to-teal-800 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden min-h-[380px] md:min-h-[520px]">
          {/* Subtle Background Pattern Elements */}
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-teal-600/20 pointer-events-none blur-2xl" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-teal-900/30 pointer-events-none blur-2xl" />

          {/* Top Pill Badge */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-teal-50 border border-white/20">
              <Shield className="h-3.5 w-3.5 text-teal-200" />
              <span>Municipal Health Office</span>
            </div>
          </div>

          {/* Center Cluster: Health-themed central circle + 4 satellite orbs */}
          <div className="relative z-10 my-8 flex items-center justify-center">
            <div className="relative flex items-center justify-center">
              {/* Central White Circle */}
              <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-white text-teal-700 shadow-soft flex items-center justify-center border-4 border-teal-500/30">
                <HeartPulse className="h-14 w-14 sm:h-16 sm:w-16 animate-pulse" />
              </div>

              {/* 4 Satellite Orbs */}
              {/* Top: Calendar */}
              <div
                className="absolute -top-4 sm:-top-5 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-teal-700 shadow-soft border border-teal-100"
                title="Scheduling & Calendar"
              >
                <Calendar className="h-5 w-5" />
              </div>

              {/* Right: Users */}
              <div
                className="absolute -right-4 sm:-right-5 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-teal-700 shadow-soft border border-teal-100"
                title="Duty Staff Coverage"
              >
                <Users className="h-5 w-5" />
              </div>

              {/* Bottom: ClipboardList */}
              <div
                className="absolute -bottom-4 sm:-bottom-5 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-teal-700 shadow-soft border border-teal-100"
                title="Leave Application Logging"
              >
                <ClipboardList className="h-5 w-5" />
              </div>

              {/* Left: HeartPulse */}
              <div
                className="absolute -left-4 sm:-left-5 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white text-teal-700 shadow-soft border border-teal-100"
                title="Clinical Decision Support"
              >
                <HeartPulse className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Bottom Narrative */}
          <div className="relative z-10 border-t border-teal-600/60 pt-4">
            <div className="font-bold text-sm sm:text-base text-white">
              Empowering health office staff
            </div>
            <div className="text-xs text-teal-100 mt-1 leading-relaxed">
              Streamlining leave approvals and staffing coverage for the health office.
            </div>
          </div>
        </div>

        {/* Right Half: Sign In Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</h2>
              <div className="mt-1.5 h-1 w-12 rounded-full bg-teal-700" />
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Sign in to access your leave dashboard.
              </p>
            </div>

            {/* Error Alert */}
            {authError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-900"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <div>
                  <span className="font-semibold">Authentication Error:</span> {authError}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Email Address */}
              <div>
                <label
                  htmlFor="email-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    id="email-input"
                    type="email"
                    autoComplete="email"
                    placeholder="name@example.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    disabled={isSubmitting}
                    {...register('email')}
                    className={`w-full rounded-xl border bg-slate-50 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 disabled:opacity-60 ${
                      errors.email
                        ? 'border-red-300 focus:border-red-600 focus:ring-red-600/20'
                        : 'border-slate-300 focus:border-teal-700'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" className="mt-1 text-2xs text-red-600 font-medium">
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password-input"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    disabled={isSubmitting}
                    {...register('password')}
                    className={`w-full rounded-xl border bg-slate-50 pl-10 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-teal-700/20 disabled:opacity-60 ${
                      errors.password
                        ? 'border-red-300 focus:border-red-600 focus:ring-red-600/20'
                        : 'border-slate-300 focus:border-teal-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isSubmitting}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-hidden focus:ring-2 focus:ring-teal-700 rounded p-0.5"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p id="password-error" className="mt-1 text-2xs text-red-600 font-medium">
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                  <input
                    type="checkbox"
                    disabled={isSubmitting}
                    {...register('remember')}
                    className="rounded text-teal-700 focus:ring-teal-700 accent-teal-700 cursor-pointer"
                  />
                  Remember me
                </label>
                <Link
                  to="/forgot-password"
                  className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {/* Sign In CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-hidden focus:ring-2 focus:ring-teal-700/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Footer Divider & Account Creation */}
          <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col gap-3">
            <div className="text-center text-xs text-slate-500">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
              >
                Create account
              </Link>
            </div>

            {/* Quick dev shortcut back into portal */}
            <div className="text-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1 text-2xs font-semibold text-slate-400 hover:text-teal-700 transition-colors"
              >
                Proceed to Dev Dashboard <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
