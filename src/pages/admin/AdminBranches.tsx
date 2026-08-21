import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  RotateCw,
  MapPin,
  Phone,
  MessageCircle,
  Clock,
  ExternalLink,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  branchAdminService,
} from '@/services/branchAdminService';
import type { DatabaseBranch } from '@/types/database';
import { formatTime12h } from '@/services/branchService';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminBranches() {
  const location = useLocation();
  const [branches, setBranches] = useState<DatabaseBranch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Notifications
  const [notification, setNotification] = useState<string | null>(
    (location.state as { notification?: string })?.notification || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog State
  const [deactivateTarget, setDeactivateTarget] = useState<DatabaseBranch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DatabaseBranch | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage(null);

    try {
      const { data, error } = await branchAdminService.getAllBranches();
      if (error) {
        setErrorMessage('Failed to load branches: ' + error.message);
      } else {
        setBranches(data);
      }
    } catch {
      setErrorMessage('An unexpected error occurred while loading branches.');
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

  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = b.name.toLowerCase().includes(q);
        const matchesCity = b.city.toLowerCase().includes(q);
        const matchesAddress = b.address.toLowerCase().includes(q);
        const matchesPhone = b.phone.includes(q);
        if (!matchesName && !matchesCity && !matchesAddress && !matchesPhone) return false;
      }

      if (statusFilter === 'ACTIVE' && !b.is_active) return false;
      if (statusFilter === 'INACTIVE' && b.is_active) return false;

      return true;
    });
  }, [branches, search, statusFilter]);

  const handleToggleActive = (branch: DatabaseBranch) => {
    if (branch.is_active) {
      setDeactivateTarget(branch);
    } else {
      performToggleActive(branch, true);
    }
  };

  const performToggleActive = async (branch: DatabaseBranch, newActive: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await branchAdminService.toggleActive(branch.id, newActive);
      if (error) {
        setErrorMessage('Failed to update status: ' + error.message);
      } else {
        setBranches((prev) =>
          prev.map((item) =>
            item.id === branch.id ? { ...item, is_active: newActive } : item
          )
        );
        setNotification(
          newActive
            ? `Branch "${branch.name}" is now active.`
            : `Branch "${branch.name}" has been deactivated.`
        );
      }
    } finally {
      setActionLoading(false);
      setDeactivateTarget(null);
    }
  };

  const performDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const { error } = await branchAdminService.deleteBranch(deleteTarget.id);
      if (error) {
        setErrorMessage('Failed to delete branch: ' + error.message);
      } else {
        setBranches((prev) => prev.filter((b) => b.id !== deleteTarget.id));
        setNotification(`Branch "${deleteTarget.name}" was permanently deleted.`);
      }
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
            Branch Locations
          </h1>
          <p className="text-xs text-ink-400 mt-1">
            Manage restaurant branches, operating hours, and branch-specific WhatsApp routing
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            to="/admin/branches/new"
            className="btn-primary shadow-lg shadow-primary-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Branch</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div className="flex items-center gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 p-4 text-xs text-success-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-400" />
          <span>{notification}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-error-500/30 bg-error-500/10 p-4 text-xs text-error-200">
          <AlertCircle className="h-4 w-4 shrink-0 text-error-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-white/5 bg-ink-900/60 p-4 backdrop-blur-md">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search branches by city, name, address, or phone..."
            className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2 pl-9 pr-3 text-xs text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
            className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2 px-3 text-xs text-ink-200 outline-none focus:border-primary-500/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-ink-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading branches...</p>
        </div>
      ) : filteredBranches.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/5 bg-ink-900/40 p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-ink-500 mb-3">
            <MapPin className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-ink-50">No branches found</h3>
          <p className="mt-1 text-xs text-ink-400 max-w-sm mx-auto">
            {branches.length === 0
              ? 'Your database currently has no branches recorded. Click "Add Branch" above to create your first location.'
              : 'No branches match your active filter criteria.'}
          </p>
          {branches.length === 0 && (
            <Link
              to="/admin/branches/new"
              className="btn-primary mt-6 text-xs inline-flex"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Branch</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredBranches.map((branch) => {
            const openTimeFormatted = formatTime12h(branch.opening_time);
            const closeTimeFormatted = formatTime12h(branch.closing_time);

            return (
              <div
                key={branch.id}
                className="flex flex-col justify-between rounded-2xl border border-white/5 bg-ink-900/60 p-5 shadow-xl backdrop-blur-md transition-all hover:border-primary-500/20"
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-ink-50 text-base">{branch.name}</h3>
                        <span className="inline-block text-[11px] font-semibold text-primary-400">
                          {branch.city}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleActive(branch)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                        branch.is_active
                          ? 'bg-success-500/15 text-success-500 hover:bg-success-500/25'
                          : 'bg-ink-800 text-ink-400 hover:bg-ink-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          branch.is_active ? 'bg-success-500' : 'bg-ink-500'
                        }`}
                      />
                      <span>{branch.is_active ? 'Active' : 'Inactive'}</span>
                    </button>
                  </div>

                  {/* Branch Details */}
                  <div className="mt-5 space-y-2.5 text-xs text-ink-300">
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" />
                      <span className="leading-relaxed text-ink-300">{branch.address}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-ink-500" />
                      <span>{branch.phone}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="font-mono text-emerald-300">+{branch.whatsapp_number}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-ink-500" />
                      <span>
                        {branch.days_open} · {openTimeFormatted} – {closeTimeFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 flex items-center justify-between border-t border-white/5 pt-3.5">
                  <div>
                    {branch.google_maps_url && (
                      <a
                        href={branch.google_maps_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-ink-400 hover:text-primary-400 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>Maps Link</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <Link
                      to={`/admin/branches/${branch.id}/edit`}
                      className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white transition-colors"
                      title="Edit branch"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>

                    <button
                      onClick={() => setDeleteTarget(branch)}
                      className="rounded-lg p-2 text-ink-400 hover:bg-error-500/10 hover:text-error-400 transition-colors"
                      title="Delete branch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deactivate Dialog */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Deactivate Branch?"
        message={`Are you sure you want to deactivate "${deactivateTarget?.name}"? It will immediately stop appearing in the customer branch picker.`}
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        isLoading={actionLoading}
        onConfirm={() => deactivateTarget && performToggleActive(deactivateTarget, false)}
        onClose={() => setDeactivateTarget(null)}
      />

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Permanently Delete Branch?"
        message={`Warning: Deleting "${deleteTarget?.name}" will remove this branch record. If orders are tied to this branch, deletion may be restricted.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={performDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
