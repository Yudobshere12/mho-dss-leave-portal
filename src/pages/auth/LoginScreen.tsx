import React, { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
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
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
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
  // ── All hooks MUST be called before any early return ──
  const { session, signInWithGoogle, signUp } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  })

  // ── Early redirect (after all hooks) ──
  if (session) {
    return <Navigate to="/dashboard" replace />
  }

  // ── Handlers ──
  const onSubmit = async (data: LoginFormValues) => {
    setAuthError(null)
    setSuccessMsg(null)
    setIsSubmitting(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        })
        if (error) throw error
      } else {
        await signUp(data.email, data.password)
        setSuccessMsg('Account created! Check your email to confirm, then sign in.')
        setMode('login')
      }
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setAuthError(null)
    setSuccessMsg(null)
    setIsGoogleSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : 'Failed to initialize Google sign-in. Please try again.'
      )
    } finally {
      setIsGoogleSubmitting(false)
    }
  }

  const toggleMode = () => {
    setAuthError(null)
    setSuccessMsg(null)
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'))
  }

  const anyLoading = isSubmitting || isGoogleSubmitting

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
        {/* Left Half: Visual Image Panel */}
        <div className="relative min-h-[420px] md:min-h-[560px] overflow-hidden flex flex-col justify-start p-6 sm:p-10 text-white">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={visualBesideLogin}
              alt="Municipal Health Office Visual"
              className="h-full w-full object-cover scale-105 blur-[3px]"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-teal-950/85 via-teal-900/65 to-slate-950/85 backdrop-blur-[2px]" />
          </div>

          <div className="relative z-10 space-y-4 pt-1 sm:pt-2">
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

        {/* Right Half: Sign In / Sign Up Form */}
        <div className="p-8 sm:p-12 flex flex-col justify-between bg-white">
          <div>
            {/* Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'login' ? 'Sign In' : 'Create Account'}
              </h2>
              <div className="mt-1.5 h-1 w-12 rounded-full bg-teal-700" />
              <p className="text-xs text-slate-500 mt-2 font-medium">
                {mode === 'login'
                  ? 'Sign in to access your leave dashboard.'
                  : 'Create a new account to get started.'}
              </p>
            </div>

            {/* Success Message */}
            {successMsg && (
              <div
                role="status"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900"
              >
                <div>
                  <span className="font-semibold">Success:</span> {successMsg}
                </div>
              </div>
            )}

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
                    disabled={anyLoading}
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
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="••••••••"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    disabled={anyLoading}
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
                    disabled={anyLoading}
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

              {/* Remember me & Forgot password (login only) */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 select-none">
                    <input
                      type="checkbox"
                      disabled={anyLoading}
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
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={anyLoading}
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-teal-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-hidden focus:ring-2 focus:ring-teal-700/30"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                    </>
                  ) : mode === 'login' ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>

            {/* "or" Divider Line */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="w-full border-t border-slate-200" />
              <span className="absolute bg-white px-3 text-2xs font-medium uppercase tracking-wider text-slate-400">
                or
              </span>
            </div>

            {/* Official Google Sign-In Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 disabled:opacity-60 disabled:cursor-not-allowed transition-all focus:outline-hidden focus:ring-2 focus:ring-slate-300"
            >
              {isGoogleSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                  <span>Connecting to Google...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4 shrink-0"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{mode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}</span>
                </>
              )}
            </button>
          </div>

          {/* Footer: Toggle between Sign In / Sign Up */}
          <div className="pt-6 mt-6 border-t border-slate-100">
            <div className="text-center text-xs text-slate-500">
              {mode === 'login' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    Create account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-semibold text-teal-700 hover:text-teal-800 hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
