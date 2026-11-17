import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { signIn } from '../../lib/auth'
import mhoLogoPng from '../../assets/MHO_logo_cropped.png'
import lguMhoLogo from '../../assets/LGU_MHO_logo.jpg'
import visualBesideLogin from '../../assets/Visual_beside_login.jpg'

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
    <div className="relative min-h-screen w-full bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* Animated Glowing / Floating Background Orbs */}
      <motion.div
        animate={{
          x: [0, 60, -40, 0],
          y: [0, -70, 30, 0],
          scale: [1, 1.25, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-teal-500/25 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          x: [0, -80, 50, 0],
          y: [0, 80, -40, 0],
          scale: [1, 1.3, 0.95, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] rounded-full bg-emerald-500/20 blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.15, 0.3, 0.15],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] rounded-full bg-teal-700/20 blur-[120px] pointer-events-none"
      />

      {/* Decorative Grid Mesh */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.7) 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Split Card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-[1100px] rounded-3xl bg-white shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2"
      >
        {/* Left Half: Visual Image Panel with Blurred Image & Overlaid Title */}
        <div className="relative min-h-[420px] md:min-h-[560px] overflow-hidden flex flex-col justify-start p-6 sm:p-10 text-white">
          {/* Background Image with blur, zoom scale, and dark teal gradient overlay */}
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={visualBesideLogin}
              alt="Municipal Health Office Visual"
              className="h-full w-full object-cover scale-105 blur-[3px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-teal-950/85 via-teal-900/65 to-slate-950/85 backdrop-blur-[2px]" />
          </div>

          {/* Overlaid Logos & Narrative */}
          <div className="relative z-10 space-y-4 pt-1 sm:pt-2">
            {/* Icon-style logos above texts */}
            <div className="inline-flex items-center gap-3">
              <img
                src={mhoLogoPng}
                alt="MHO Logo"
                className="h-14 w-auto object-contain drop-shadow-lg"
              />
              <span className="text-sm font-semibold text-white/40">/</span>
              <img
                src={lguMhoLogo}
                alt="LGU MHO Logo"
                className="h-10 w-10 object-contain rounded-full drop-shadow-md"
              />
            </div>

            <div className="space-y-3">
              <div className="inline-block px-3 py-0.5 rounded-full bg-teal-400/20 border border-teal-300/30 text-teal-200 text-2xs font-semibold backdrop-blur-sm tracking-wide uppercase">
                Municipal Health Office
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight drop-shadow-md leading-tight">
                MHO Leave DSS Portal
              </h1>
              <p className="text-sm sm:text-base text-teal-100/90 font-normal leading-relaxed drop-shadow-sm max-w-sm">
                Municipal Health Office Leave Management &amp; Decision Support System
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs text-teal-200/80">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Streamlining duty coverage &amp; leave logging</span>
              </div>
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
      </motion.div>
    </div>
  )
}
