import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Save,
  Loader2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Mail,
  KeyRound,
  Crown,
  UserCheck,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  adminManagementService,
  type CreateAdminPayload,
  type UpdateAdminPayload,
} from '@/services/adminManagementService';
import type { AdminRole } from '@/types/database';

type AdminAdminFormProps = {
  mode: 'create' | 'edit';
};

const ROLES: Array<{
  role: AdminRole;
  title: string;
  description: string;
  icon: typeof Crown;
  badgeClass: string;
}> = [
  {
    role: 'OWNER',
    title: 'Owner',
    description: 'Full unrestricted platform access, administrator provisioning, branch management, and settings.',
    icon: Crown,
    badgeClass: 'border-primary-500/40 bg-primary-500/10 text-primary-300',
  },
  {
    role: 'ADMIN',
    title: 'Administrator',
    description: 'Full management of products, branches, promotions, and operations. Cannot manage administrator profiles.',
    icon: Shield,
    badgeClass: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  {
    role: 'MANAGER',
    title: 'Manager',
    description: 'Management of menu products, promotions, discounts, and customer orders.',
    icon: ShieldCheck,
    badgeClass: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
  {
    role: 'EDITOR',
    title: 'Editor',
    description: 'Menu product content and catalog adjustments.',
    icon: UserCheck,
    badgeClass: 'border-blue-500/40 bg-blue-500/10 text-blue-300',
  },
];

export default function AdminAdminForm({ mode }: AdminAdminFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role: currentRole } = useAuth();

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AdminRole>('MANAGER');
  const [isActive, setIsActive] = useState(true);

  // Link existing vs New Auth mode (in Create Mode)
  const [provisionMode, setProvisionMode] = useState<'NEW_AUTH' | 'EXISTING_AUTH_ID'>('NEW_AUTH');
  const [existingUserId, setExistingUserId] = useState('');

  // Loaded metadata for Edit Mode
  const [userIdDisplay, setUserIdDisplay] = useState('');
  const [createdAtDisplay, setCreatedAtDisplay] = useState('');
  const [isTargetCurrentOwner, setIsTargetCurrentOwner] = useState(false);
  const [activeOwnersCount, setActiveOwnersCount] = useState(1);

  // UI state
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isOwner = currentRole === 'OWNER';

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const ownerCount = await adminManagementService.getActiveOwnerCount();
      setActiveOwnersCount(ownerCount);

      if (mode === 'edit' && id) {
        const { data: profile, error } = await adminManagementService.getAdminById(id);
        if (error || !profile) {
          setErrorMessage('Administrator profile not found.');
          setLoading(false);
          return;
        }

        setName(profile.name);
        setRole(profile.role);
        setIsActive(profile.is_active);
        setUserIdDisplay(profile.user_id);
        setCreatedAtDisplay(profile.created_at);
        setIsTargetCurrentOwner(profile.role === 'OWNER' && profile.is_active);
      }
    } catch {
      setErrorMessage('Failed to load administrator details.');
    } finally {
      setLoading(false);
    }
  }, [mode, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const validateForm = (): string | null => {
    if (!name.trim()) {
      return 'Administrator full name is required.';
    }

    if (mode === 'create') {
      if (provisionMode === 'NEW_AUTH') {
        if (!email.trim() || !email.includes('@')) {
          return 'A valid email address is required.';
        }
        if (!password || password.length < 6) {
          return 'Password must be at least 6 characters long.';
        }
      } else {
        if (!existingUserId.trim()) {
          return 'Existing Supabase Auth User ID is required.';
        }
      }
    }

    // Protect last active owner
    if (mode === 'edit' && isTargetCurrentOwner && activeOwnersCount <= 1) {
      if (!isActive) {
        return 'Cannot deactivate the last remaining active OWNER account.';
      }
      if (role !== 'OWNER') {
        return 'Cannot demote the last remaining active OWNER account.';
      }
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const valErr = validateForm();
    if (valErr) {
      setErrorMessage(valErr);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      if (mode === 'create') {
        const payload: CreateAdminPayload = {
          name: name.trim(),
          email: email.trim(),
          password: provisionMode === 'NEW_AUTH' ? password : undefined,
          role,
          is_active: isActive,
          existing_user_id: provisionMode === 'EXISTING_AUTH_ID' ? existingUserId.trim() : undefined,
        };

        const { data, error } = await adminManagementService.createAdmin(payload);
        if (error || !data) {
          setErrorMessage(error?.message || 'Failed to create administrator.');
          setSaving(false);
          return;
        }

        navigate('/admin/admins', {
          state: { notification: `Administrator "${payload.name}" successfully created with ${payload.role} role.` },
        });
      } else if (mode === 'edit' && id) {
        const payload: UpdateAdminPayload = {
          name: name.trim(),
          role,
          is_active: isActive,
        };

        const { success, error } = await adminManagementService.updateAdmin(
          id,
          payload
        );

        if (error || !success) {
          setErrorMessage(error?.message || 'Failed to update administrator profile.');
          setSaving(false);
          return;
        }

        navigate('/admin/admins', {
          state: { notification: `Administrator profile for "${payload.name}" updated successfully.` },
        });
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving administrator.');
      setSaving(false);
    }
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
            Administrator role provisioning is strictly restricted to platform OWNER accounts.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              to="/admin"
              className="rounded-full bg-primary-500 px-6 py-2.5 text-xs font-semibold text-ink-950 hover:bg-primary-400"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-400" />
        <p className="mt-4 text-xs font-medium text-ink-400">Loading administrator profile...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* ========================================================================= */}
      {/* HEADER                                                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/admins"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{mode === 'create' ? 'Provisioning' : 'Access Settings'}</span>
            </div>
            <h1 className="mt-0.5 text-2xl font-bold text-ink-50">
              {mode === 'create' ? 'Add Administrator' : `Edit "${name || 'Administrator'}"`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/admins"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-ink-950 shadow-md shadow-primary-500/20 transition-all hover:bg-primary-400 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : mode === 'create' ? 'Create Administrator' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ERROR ALERT                                                               */}
      {/* ========================================================================= */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-error-500/20 bg-error-500/10 p-4 text-xs font-medium text-error-400 animate-in fade-in duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM BODY                                                                 */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Administrator Information */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <User className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Profile Details</h2>
          </div>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Full Name <span className="text-error-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe, Sarah Khan"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
                required
              />
            </div>

            {/* Readonly info in Edit mode */}
            {mode === 'edit' && (
              <div className="rounded-2xl border border-white/5 bg-ink-950/50 p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-ink-400">
                  <span>Supabase Auth User ID:</span>
                  <span className="font-mono text-ink-200 break-all">{userIdDisplay}</span>
                </div>
                {createdAtDisplay && (
                  <div className="flex items-center justify-between text-ink-400">
                    <span>Registered On:</span>
                    <span className="text-ink-200">
                      {new Date(createdAtDisplay).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Account Credentials (Create Mode Only) */}
        {mode === 'create' && (
          <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary-400" />
                <h2 className="text-sm font-bold text-ink-50">Account Provisioning</h2>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-ink-950 p-1 text-[11px]">
                <button
                  type="button"
                  onClick={() => setProvisionMode('NEW_AUTH')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    provisionMode === 'NEW_AUTH'
                      ? 'bg-primary-500 text-ink-950 shadow-sm'
                      : 'text-ink-400 hover:text-white'
                  }`}
                >
                  Create New Account
                </button>
                <button
                  type="button"
                  onClick={() => setProvisionMode('EXISTING_AUTH_ID')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    provisionMode === 'EXISTING_AUTH_ID'
                      ? 'bg-primary-500 text-ink-950 shadow-sm'
                      : 'text-ink-400 hover:text-white'
                  }`}
                >
                  Link Existing User ID
                </button>
              </div>
            </div>

            {provisionMode === 'NEW_AUTH' ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] text-ink-400 bg-primary-500/10 border border-primary-500/20 rounded-xl p-3">
                  <Info className="h-4 w-4 text-primary-400 shrink-0" />
                  <span>
                    The user will be created in Supabase Auth and assigned administrative permissions immediately.
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                      Email Address <span className="text-error-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@doughncheese.com"
                        className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2.5 pl-10 pr-4 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                      Initial Password <span className="text-error-400">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2.5 pl-10 pr-4 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-ink-400">
                  If you already invited or created this user in the Supabase Dashboard, enter their UUID:
                </p>
                <div>
                  <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                    Supabase User ID (UUID) <span className="text-error-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={existingUserId}
                    onChange={(e) => setExistingUserId(e.target.value)}
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 font-mono text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
                    required
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section 3: Role Assignment */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary-400" />
              <h2 className="text-sm font-bold text-ink-50">Role & Permissions</h2>
            </div>
            <span className="text-[11px] font-semibold text-primary-400">
              Selected: {role}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {ROLES.map((r) => {
              const isSelected = role === r.role;
              const Icon = r.icon;

              return (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => setRole(r.role)}
                  className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                    isSelected
                      ? `${r.badgeClass} ring-1 ring-primary-500 shadow-md`
                      : 'border-white/5 bg-ink-950/40 text-ink-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 shrink-0 text-primary-400" />
                    <span className="font-bold text-ink-50 text-xs">{r.title}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-ink-300 font-normal">
                    {r.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active Status Switch */}
          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-ink-950/40 p-4 mt-2">
            <div>
              <div className="text-xs font-bold text-ink-100">Active Account Status</div>
              <div className="text-[11px] text-ink-400">
                {isActive
                  ? 'Account is active and permitted to sign in to the administration portal.'
                  : 'Account is disabled. Sign-in attempts will be rejected by security policy.'}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-ink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 relative transition-colors" />
            </label>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <Link
            to="/admin/admins"
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-xs font-bold text-ink-950 shadow-md shadow-primary-500/20 transition-all hover:bg-primary-400 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{saving ? 'Saving...' : mode === 'create' ? 'Create Administrator' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
