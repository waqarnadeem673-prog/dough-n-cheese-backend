import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  RotateCw,
  Tag,
  Percent,
  Calendar,
  Layers,
  MapPin,
  Edit,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  discountAdminService,
  type AdminDiscountWithRelations,
} from '@/services/discountAdminService';
import { getDiscountStatus } from '@/services/discountService';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

type FilterStatus = 'ALL' | 'LIVE_NOW' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';

export default function AdminDiscounts() {
  const location = useLocation();
  const [discounts, setDiscounts] = useState<AdminDiscountWithRelations[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('ALL');

  // Notifications
  const [notification, setNotification] = useState<string | null>(
    (location.state as { notification?: string })?.notification || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog State
  const [deactivateTarget, setDeactivateTarget] = useState<AdminDiscountWithRelations | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDiscountWithRelations | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage(null);

    try {
      const { data, error } = await discountAdminService.getAllDiscounts();
      if (error) {
        setErrorMessage('Failed to load discounts: ' + error.message);
      } else {
        setDiscounts(data);
      }
    } catch {
      setErrorMessage('An unexpected error occurred while loading discounts.');
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

  const filteredDiscounts = useMemo(() => {
    return discounts.filter((d) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesTitle = d.title.toLowerCase().includes(q);
        const matchesDesc = (d.description || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      if (statusFilter !== 'ALL') {
        const { status } = getDiscountStatus({
          is_active: d.is_active,
          starts_at: d.starts_at,
          ends_at: d.ends_at,
        });

        if (statusFilter === 'LIVE_NOW' && status !== 'ACTIVE') return false;
        if (statusFilter === 'SCHEDULED' && status !== 'SCHEDULED') return false;
        if (statusFilter === 'EXPIRED' && status !== 'EXPIRED') return false;
        if (statusFilter === 'INACTIVE' && status !== 'INACTIVE') return false;
      }

      return true;
    });
  }, [discounts, search, statusFilter]);

  const handleToggleActive = (discount: AdminDiscountWithRelations) => {
    if (discount.is_active) {
      setDeactivateTarget(discount);
    } else {
      performToggleActive(discount, true);
    }
  };

  const performToggleActive = async (
    discount: AdminDiscountWithRelations,
    nextActive: boolean
  ) => {
    setActionLoading(true);
    try {
      const { success, error } = await discountAdminService.toggleActive(discount.id, nextActive);
      if (error || !success) {
        setErrorMessage(error?.message || 'Failed to update discount status.');
      } else {
        setNotification(
          `Discount "${discount.title}" is now ${nextActive ? 'active' : 'inactive'}.`
        );
        setDiscounts((prev) =>
          prev.map((d) => (d.id === discount.id ? { ...d, is_active: nextActive } : d))
        );
      }
    } catch {
      setErrorMessage('An unexpected error occurred.');
    } finally {
      setActionLoading(false);
      setDeactivateTarget(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      const { success, error } = await discountAdminService.deleteDiscount(deleteTarget.id);
      if (error || !success) {
        setErrorMessage(error?.message || 'Failed to delete discount.');
      } else {
        setNotification(`Discount "${deleteTarget.title}" was permanently removed.`);
        setDiscounts((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      }
    } catch {
      setErrorMessage('An unexpected error occurred while deleting discount.');
    } finally {
      setActionLoading(false);
      setDeleteTarget(null);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* ========================================================================= */}
      {/* HEADER BAR                                                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
            <Sparkles className="h-4 w-4" />
            <span>Promotion Management</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
            Discounts & Deals
          </h1>
          <p className="mt-0.5 text-xs text-ink-400">
            Configure percentage deals, fixed-price vouchers, branch limitations, and timed promotions.
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
            to="/admin/discounts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-ink-950 shadow-md shadow-primary-500/20 transition-all hover:bg-primary-400 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Create Discount</span>
          </Link>
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
            placeholder="Search deals by title or description..."
            className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2 pl-10 pr-4 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
          />
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'LIVE_NOW', label: 'Live Now' },
              { id: 'SCHEDULED', label: 'Scheduled' },
              { id: 'EXPIRED', label: 'Expired' },
              { id: 'INACTIVE', label: 'Inactive' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === tab.id
                  ? 'bg-primary-500 text-ink-950 shadow-sm'
                  : 'bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIST CONTENT                                                              */}
      {/* ========================================================================= */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-ink-900/40 p-16 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-400" />
          <p className="mt-3 text-xs font-medium text-ink-400">Loading promotions...</p>
        </div>
      ) : filteredDiscounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-white/5 bg-ink-900/40 p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-ink-400">
            <Tag className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-ink-100">No discounts found</h3>
          <p className="mt-1 max-w-sm text-xs text-ink-400">
            {search || statusFilter !== 'ALL'
              ? 'No promotions match your search or filter criteria. Try adjusting your filters.'
              : 'You have not added any promotional deals or discount vouchers yet.'}
          </p>
          {search || statusFilter !== 'ALL' ? (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="mt-5 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-ink-200 hover:bg-white/10 hover:text-white"
            >
              Reset Filters
            </button>
          ) : (
            <Link
              to="/admin/discounts/new"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary-500 px-5 py-2.5 text-xs font-bold text-ink-950 transition-all hover:bg-primary-400"
            >
              <Plus className="h-4 w-4" />
              <span>Create Your First Discount</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDiscounts.map((discount) => {
            const statusInfo = getDiscountStatus({
              is_active: discount.is_active,
              starts_at: discount.starts_at,
              ends_at: discount.ends_at,
            });

            const branchCount = discount.discount_branches?.length || 0;
            const categoryCount = discount.discount_categories?.length || 0;
            const productCount = discount.discount_products?.length || 0;

            return (
              <div
                key={discount.id}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-ink-900/70 p-5 transition-all duration-300 hover:bg-ink-900/90 ${
                  discount.is_active
                    ? 'border-white/10 hover:border-primary-500/40'
                    : 'border-white/5 opacity-75 hover:opacity-100'
                }`}
              >
                <div>
                  {/* Top Row: Value Badge & Status */}
                  <div className="flex items-start justify-between gap-3">
                    {/* Value Pill */}
                    <div className="inline-flex items-center gap-1.5 rounded-2xl bg-primary-500/15 border border-primary-500/30 px-3.5 py-1.5 text-primary-400 font-extrabold text-sm">
                      {discount.discount_type === 'PERCENTAGE' ? (
                        <>
                          <Percent className="h-4 w-4" />
                          <span>{discount.discount_value}% OFF</span>
                        </>
                      ) : (
                        <>
                          <Tag className="h-4 w-4" />
                          <span>Rs. {discount.discount_value.toLocaleString('en-PK')} OFF</span>
                        </>
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusInfo.badgeClass}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-4">
                    <h3 className="text-base font-bold text-ink-50 group-hover:text-primary-300 transition-colors">
                      {discount.title}
                    </h3>
                    {discount.description && (
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-400">
                        {discount.description}
                      </p>
                    )}
                  </div>

                  {/* Metadata Chips */}
                  <div className="mt-4 space-y-2 border-t border-white/5 pt-3 text-xs text-ink-300">
                    {/* Scope */}
                    <div className="flex items-center gap-2 text-[11px] text-ink-300">
                      <Layers className="h-3.5 w-3.5 text-primary-400/80 shrink-0" />
                      <span className="text-ink-400">Scope:</span>
                      <span className="font-semibold text-ink-100">
                        {discount.scope === 'ALL_PRODUCTS' && 'All Menu Items'}
                        {discount.scope === 'SELECTED_CATEGORIES' &&
                          `${categoryCount} Selected ${categoryCount === 1 ? 'Category' : 'Categories'}`}
                        {discount.scope === 'SELECTED_PRODUCTS' &&
                          `${productCount} Selected ${productCount === 1 ? 'Product' : 'Products'}`}
                      </span>
                    </div>

                    {/* Branches */}
                    <div className="flex items-center gap-2 text-[11px] text-ink-300">
                      <MapPin className="h-3.5 w-3.5 text-primary-400/80 shrink-0" />
                      <span className="text-ink-400">Branches:</span>
                      <span className="font-semibold text-ink-100">
                        {branchCount === 0
                          ? 'All Branches'
                          : `${branchCount} Specific ${branchCount === 1 ? 'Branch' : 'Branches'}`}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-[11px] text-ink-300">
                      <Calendar className="h-3.5 w-3.5 text-primary-400/80 shrink-0" />
                      <span className="text-ink-400">Validity:</span>
                      <span className="font-medium text-ink-200">
                        {discount.starts_at || discount.ends_at ? (
                          <span>
                            {discount.starts_at ? formatDateTime(discount.starts_at) : 'Immediate'}
                            {' → '}
                            {discount.ends_at ? formatDateTime(discount.ends_at) : 'Open-ended'}
                          </span>
                        ) : (
                          'Always active'
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3.5">
                  {/* Active Toggle Switch */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={discount.is_active}
                      onChange={() => handleToggleActive(discount)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-ink-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary-500 relative transition-colors" />
                    <span className="text-[11px] font-medium text-ink-400">
                      {discount.is_active ? 'Active' : 'Paused'}
                    </span>
                  </label>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/admin/discounts/${discount.id}/edit`}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                      title="Edit promotion"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Link>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(discount)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-error-500/10 text-error-400 transition-colors hover:bg-error-500/20"
                      title="Delete promotion"
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
      {/* DIALOGS                                                                   */}
      {/* ========================================================================= */}
      {/* Deactivate Confirmation */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Pause Promotion?"
        message={`Are you sure you want to deactivate "${deactivateTarget?.title}"? It will no longer apply to customer orders.`}
        confirmLabel="Pause Promotion"
        cancelLabel="Keep Active"
        isDestructive={false}
        isLoading={actionLoading}
        onConfirm={() => deactivateTarget && performToggleActive(deactivateTarget, false)}
        onClose={() => setDeactivateTarget(null)}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Promotion?"
        message={`Permanently remove "${deleteTarget?.title}"? All branch and product targeting records for this discount will be removed.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
