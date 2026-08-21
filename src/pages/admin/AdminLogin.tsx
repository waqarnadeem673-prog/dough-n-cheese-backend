import { useState, type FormEvent, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { site } from '@/data/site';
import { Lock, Mail, Eye, EyeOff, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { signIn, session, profile, isInitializingAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in with active admin profile
  useEffect(() => {
    if (!isInitializingAuth && session && profile?.is_active) {
      const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';
      navigate(from, { replace: true });
    }
  }, [isInitializingAuth, session, profile, navigate, location]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await signIn(trimmedEmail, password);

      if (error) {
        setErrorMessage(error.message || 'Invalid credentials or unauthorized account.');
      } else {
        const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/admin';
        navigate(from, { replace: true });
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'A network error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitializingAuth) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center text-ink-100">
        <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 px-4 py-12 selection:bg-primary-500/30 selection:text-white">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-primary-500/10 blur-[140px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent-500/8 blur-[140px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-ink-900/90 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-ink-950/80 p-3 shadow-inner border border-white/5">
              <img
                src={site.logo}
                alt="Dough N Cheese Logo"
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex items-center gap-1.5 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Admin Portal</span>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-ink-50 sm:text-3xl">
              Welcome Back
            </h1>
            <p className="mt-1.5 text-xs text-ink-400 sm:text-sm">
              Sign in with your authorized administrator credentials
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex items-start gap-3 rounded-2xl border border-error-500/30 bg-error-500/10 p-4 text-xs leading-relaxed text-error-200"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
              <div>{errorMessage}</div>
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {/* Email Field */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Email Address
              </label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@doughncheese.pk"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-3 pl-11 pr-4 text-sm text-ink-100 placeholder-ink-600 outline-none transition-colors focus:border-primary-500/50 focus:bg-ink-950"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Password
              </label>
              <div className="relative mt-2">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-3 pl-11 pr-11 text-sm text-ink-100 placeholder-ink-600 outline-none transition-colors focus:border-primary-500/50 focus:bg-ink-950"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-ink-400 transition-colors hover:text-ink-200"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full shadow-lg shadow-primary-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Access Dashboard</span>
                )}
              </button>
            </div>
          </form>

          {/* Footer note */}
          <div className="mt-8 border-t border-white/5 pt-4 text-center">
            <p className="text-[11px] text-ink-500">
              Restricted management zone. All access attempts are monitored and recorded.
            </p>
          </div>
        </div>

        {/* Back to website link */}
        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-xs text-ink-400 transition-colors hover:text-primary-400"
          >
            ← Return to public website
          </a>
        </div>
      </motion.div>
    </div>
  );
}
