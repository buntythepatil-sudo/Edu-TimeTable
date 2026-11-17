import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  Mail,
  Shield,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CalendarRange,
  KeyRound,
  X,
  CheckCircle2,
} from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login, loginWithGoogle, sendResetEmail, accessError, clearAccessError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayedError = errorMessage || accessError;

  const handleDismissError = () => {
    setErrorMessage('');
    if (accessError) clearAccessError();
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setResetMessage('');
    if (accessError) clearAccessError();
    setIsSubmitting(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    } catch {
      setErrorMessage('Google sign-in failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage('');
    setResetMessage('');
    if (!email.trim()) {
      setErrorMessage('Enter your Login ID (email) above first, then click Forgot / Reset Password.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await sendResetEmail(email);
      if (res.success) {
        setResetMessage(
          `If an Email/Password login exists for ${email.trim().toLowerCase()}, a password reset link has been sent. (If you previously signed in with Google only, sign in via Google first to create a password.)`
        );
      } else if (res.error) {
        setErrorMessage(res.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setResetMessage('');
    if (accessError) clearAccessError();
    setIsSubmitting(true);

    try {
      const res = await login(email, password);
      if (!res.success && res.error) {
        setErrorMessage(res.error);
      }
    } catch {
      setErrorMessage('An unexpected sign-in error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle architectural grid backdrop */}
      <div
        className="absolute inset-0 opacity-[0.07] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(to right, #818cf8 1px, transparent 1px), linear-gradient(to bottom, #818cf8 1px, transparent 1px)',
          backgroundSize: '36px 36px',
        }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-950/60 flex items-center justify-center text-white mb-3 border border-indigo-400/30">
            <CalendarRange className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">SchoolGrid</h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Authorized School Timetable &amp; Academic Scheduling Portal
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-white tracking-tight">Sign In to Continue</h2>
              <p className="text-[0.7rem] text-slate-300 mt-0.5">
                Restricted to authorized School Admins &amp; Superuser
              </p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Shield className="w-4 h-4" />
            </div>
          </div>

          <div className="p-6">
            {displayedError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                <span className="flex-1 leading-relaxed">{displayedError}</span>
                <button
                  type="button"
                  onClick={handleDismissError}
                  className="text-rose-400 hover:text-rose-700 cursor-pointer shrink-0"
                  aria-label="Dismiss error"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {resetMessage && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                <span className="flex-1 leading-relaxed">{resetMessage}</span>
              </div>
            )}

            {/* Unified Google Sign-In */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleGoogleSignIn}
              className="w-full h-11 px-4 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs shadow-2xs flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-5 flex items-center">
              <div className="flex-1 border-t border-slate-200" />
              <span className="px-3 text-[0.65rem] font-bold uppercase tracking-wider text-slate-400">
                Or Login ID &amp; Password
              </span>
              <div className="flex-1 border-t border-slate-200" />
            </div>

            {/* ID & Password Form (Issued by Superuser) */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Login ID (Email)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="admin@school.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-200 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[0.68rem] font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleResetPassword}
                    className="text-[0.68rem] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer disabled:opacity-50"
                  >
                    Forgot / Reset password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 pl-9 pr-10 rounded-lg border border-slate-200 text-sm text-slate-900 outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Signing In...' : 'Sign In with Login ID'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Provisioning Notice */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[0.7rem] text-slate-500 leading-relaxed">
              <KeyRound className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                School Admin Login IDs and passwords are issued exclusively by the System Superuser. Superuser can set or change their Login ID password inside Superuser Console or Security &amp; Password after signing in with Google.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
