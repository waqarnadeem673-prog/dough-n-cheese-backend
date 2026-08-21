import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import type { AdminRole } from '@/types/database';

type ProtectedRouteProps = {
  allowedRoles?: AdminRole[];
};

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, role, isInitializingAuth, loading } = useAuth();
  const location = useLocation();

  if (isInitializingAuth || loading) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center text-ink-100">
        <div className="relative flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500" />
          <p className="text-sm font-medium tracking-wide text-ink-400 animate-pulse">
            Verifying administrative access...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated or profile not active
  if (!session || !profile || !profile.is_active) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // Role check if specific roles are required
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md rounded-2xl border border-error-500/30 bg-ink-900/80 p-8 shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-500/10 text-error-500 mb-4">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-xl font-bold text-ink-50">Access Restricted</h2>
          <p className="mt-2 text-sm text-ink-400">
            Your current role (<span className="font-semibold text-primary-400">{role}</span>) does not have permission to view this section.
          </p>
          <a
            href="/admin"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary-500 px-6 py-2.5 text-sm font-semibold text-ink-950 transition-all hover:bg-primary-400"
          >
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
