import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Plus,
  Search,
  RotateCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  UserCheck,
  Crown,
} from 'lucide-react';
import { adminManagementService } from '@/services/adminManagementService';
import type { AdminProfile, AdminRole } from '@/types/database';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminAdmins() {
  const { user: currentUser, role: currentRole } = useAuth();
  const location = useLocation();

  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | AdminRole>('ALL');

  // Notifications
  const [notification, setNotification] = useState<string | null>(
    (location.state as { notification?: string })?.notification || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog State
  const [deactivateTarget, setDeactivateTarget] = useState<AdminProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProfile | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isOwner = currentRole === 'OWNER';

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage(null);

    try {
      const { data, error } = await adminManagementService.getAllAdmins();
      if (error) {
        setErrorMessage(error.message);
      } else {
        setAdmins(data);
      }
    } catch {
      setErrorMessage('An unexpected error occurred loading administrator records.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Statistics
  const activeOwnersCount = useMemo(
    () => admins.filter((a) => a.role === 'OWNER' && a.is_active).length,
    [admins]
  );
  const totalActiveCount = useMemo(
    () => admins.filter((a) => a.is_active).length,
    [admins]
  );

  const filteredAdmins = useMemo(() => {
    return admins.filter((admin) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = admin.name.toLowerCase().includes(q);
        const matchesRole = admin.role.toLowerCase().includes(q);
        const matchesId = admin.user_id.toLowerCase().includes(q);
        if (!matchesName && !matchesRole && !matchesId) return false;
      }

      if (roleFilter !== 'ALL' && admin.role !== roleFilter) return false;

      return true;
    });
  }, [admins, search, roleFilter]);

  const handleToggleActive = (admin: AdminProfile) => {
    if (admin.role === 'OWNER' && admin.is_active && activeOwnersCount <= 1) {
      setErrorMessage('Safety lock: Cannot deactivate the only active OWNER of the platform.');
      return;
    }

    if (admin.is_active) {
      setDeactivateTarget(admin);
    } else {
      performToggleActive(admin, true);
    }
  };

  const performToggleActive = async (admin: AdminProfile, nextActive: boolean) => {
    setActionLoading(true);
    try {
      const { success, error } = await adminManagementService.toggleActive(
        admin.id,
        nextActive
      );

      if (error || !success) {
        setErrorMessage(error?.message || 'Failed to update administrator status.');
      } else {
        setNotification(`Administrator "${admin.name}" is now ${nextActive ? 'active' : 'inactive'}.`);
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, is_active: nextActive } : a))
        );
      }
    } catch {
      setErrorMessage('An error occurred during status update.');
    } finally {
      setActionLoading(false);
      setDeactivateTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.role === 'OWNER' && activeOwnersCount <= 1) {
      setErrorMessage('Safety lock: Cannot delete the only active OWNER of the platform.');
      setDeleteTarget(null);
      return;
    }

    if (currentUser?.id && deleteTarget.user_id === currentUser.id) {
      setErrorMessage('Safety lock: You cannot delete your own administrator profile while logged in.');
      setDeleteTarget(null);
      return;
    }

    setActionLoading(true);
    try {
      const { success, error } = await adminManagementService.deleteAdmin(
        deleteTarget.id,
        currentUser?.id
      );

      if (error || !success) {
        setErrorMessage(error?.message || 'Failed to delete administrator profile.');
      } else {
        setNotification(`Administrator profile for "${deleteTarget.name}" was removed.`);
        setAdmins((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      }
    } catch {
      setErrorMessage('An unexpected error occurred while deleting administrator.');
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  };

  const getRoleBadge = (role: AdminRole) => {
    switch (role) {
      case 'OWNER':
        return {
          label: 'OWNER',
          className: 'bg-primary-500/20 text-primary-300 border-primary-500/30',
          icon: Crown,
        };
      case 'ADMIN':
        return {
          label: 'ADMIN',
          className: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: Shield,
        };
      case 'MANAGER':
        return {
          label: 'MANAGER',
          className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: ShieldCheck,
        };
      case 'EDITOR':
        return {
          label: 'EDITOR',
          className: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: UserCheck,
        };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOwner) {
    return (
      <div className="mx-auto max-w-2xl py-12 text-center">
        <div className="rounded-3xl border border-error-500/30 bg-ink-900/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-500/10 text-error-500 mb-4">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-ink-50">Owner Access Required</h2>
          <p className="mt-2 text-xs leading-relaxed text-ink-400">
            Administrator role provisioning and security management is restricted to authorized platform{' '}
            <span className="font-semibold text-primary-400">OWNER</span> accounts under Row Level Security.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/admin"
              className="rounded-full bg-primary-500 px-6 py-2.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-primary-400"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ========================================================================= */}
      {/* HEADER                                                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
            <Sparkles className="h-4 w-4" />
            <span>Security & Access Control</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
            Administrator Management
          </h1>
          <p className="mt-0.5 text-xs text-ink-400">
            Manage owner profiles, administrative roles, and staff dashboard permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-ink-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Refresh list"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <Link
            to="/admin/admins/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-ink-950 shadow-md shadow-primary-500/20 transition-all hover:bg-primary-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>New Administrator</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STATS OVERVIEW CARDS                                                      */}
      {/* ========================================================================= */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-ink-900/60 p-5 backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-400 border border-primary-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink-50">{admins.length}</div>
            <div className="text-xs text-ink-400">Total Administrators</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-ink-900/60 p-5 backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink-50">{activeOwnersCount}</div>
            <div className="text-xs text-ink-400">Active Platform Owners</div>
          </div>
        </div>

        <div className="flex items-center gap-4 rounded-3xl border border-white/5 bg-ink-900/60 p-5 backdrop-blur-md">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-ink-50">{totalActiveCount}</div>
            <div className="text-xs text-ink-400">Active Staff Accounts</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOTIFICATIONS & ERRORS                                                    */}
      {/* ========================================================================= */}
      {notification && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-error-500/20 bg-error-500/10 p-4 text-xs font-medium text-error-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FILTERS & SEARCH                                                          */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-ink-900/60 p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, or user ID..."
            className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2 pl-10 pr-4 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
          />
        </div>

        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'OWNER', 'ADMIN', 'MANAGER', 'EDITOR'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                roleFilter === r
                  ? 'bg-primary-500 text-ink-950 shadow-sm'
                  : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADMINS LIST / TABLE                                                       */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-ink-900/40 p-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
          <p className="mt-3 text-xs font-medium text-ink-400">Loading administrator accounts...</p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-ink-900/40 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-ink-400">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-ink-100">No administrators found</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-400">
            {search || roleFilter !== 'ALL'
              ? 'No administrators match your filter criteria.'
              : 'No administrator profiles exist yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAdmins.map((admin) => {
            const roleBadge = getRoleBadge(admin.role);
            const RoleIcon = roleBadge.icon;
            const isCurrentSessionUser = currentUser?.id === admin.user_id;

            return (
              <div
                key={admin.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-ink-900/70 p-5 transition-all duration-300 hover:bg-ink-900/90 ${
                  admin.is_active
                    ? 'border-white/10 hover:border-primary-500/40'
                    : 'border-white/5 opacity-70 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Top Bar: Role Badge & Current User Indicator */}
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-bold ${roleBadge.className}`}
                    >
                      <RoleIcon className="h-3.5 w-3.5" />
                      <span>{roleBadge.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isCurrentSessionUser && (
                        <span className="rounded-full bg-primary-500/10 border border-primary-500/20 px-2 py-0.5 text-[10px] font-bold text-primary-400">
                          You
                        </span>
                      )}

                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          admin.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-ink-800 text-ink-400'
                        }`}
                      >
                        {admin.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Administrator Name */}
                  <div className="mt-4">
                    <h3 className="text-base font-bold text-ink-50 group-hover:text-primary-300 transition-colors flex items-center gap-2">
                      <span>{admin.name}</span>
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-ink-400 break-all">
                      ID: {admin.user_id}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="mt-4 space-y-1.5 border-t border-white/5 pt-3 text-xs text-ink-400">
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Registered:</span>
                      <span className="font-medium text-ink-200">{formatDate(admin.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>Last Updated:</span>
                      <span className="font-medium text-ink-200">{formatDate(admin.updated_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3.5">
                  {/* Active Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={admin.is_active}
                      onChange={() => handleToggleActive(admin)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-ink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary-500 relative transition-colors" />
                    <span className="text-[11px] font-medium text-ink-400">
                      {admin.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </label>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/admin/admins/${admin.id}/edit`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                      title="Edit administrator"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(admin)}
                      disabled={isCurrentSessionUser || (admin.role === 'OWNER' && activeOwnersCount <= 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-error-500/10 text-error-400 transition-colors hover:bg-error-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={
                        isCurrentSessionUser
                          ? 'Cannot delete your own active profile'
                          : admin.role === 'OWNER' && activeOwnersCount <= 1
                          ? 'Cannot delete the last active owner'
                          : 'Delete administrator'
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOGS                                                      */}
      {/* ========================================================================= */}
      {/* Deactivate Dialog */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Disable Administrator Access?"
        message={`Are you sure you want to deactivate "${deactivateTarget?.name}" (${deactivateTarget?.role})? They will immediately lose access to the admin dashboard.`}
        confirmLabel="Disable Access"
        cancelLabel="Keep Active"
        isDestructive={false}
        isLoading={actionLoading}
        onConfirm={() => deactivateTarget && performToggleActive(deactivateTarget, false)}
        onClose={() => setDeactivateTarget(null)}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Administrator Profile?"
        message={`Permanently remove administrative privileges for "${deleteTarget?.name}"? The user will no longer be able to log in to the admin suite.`}
        confirmLabel="Delete Admin Profile"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
