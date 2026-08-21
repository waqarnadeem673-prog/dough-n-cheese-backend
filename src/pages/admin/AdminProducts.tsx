import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Plus,
  Search,
  RotateCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
} from 'lucide-react';
import {
  productAdminService,
  type AdminProductListItem,
} from '@/services/productAdminService';
import type { DatabaseCategory } from '@/types/database';
import ProductTable from '@/components/admin/ProductTable';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export default function AdminProducts() {
  const location = useLocation();
  const [products, setProducts] = useState<AdminProductListItem[]>([]);
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [popularFilter, setPopularFilter] = useState(false);

  // Alerts
  const [notification, setNotification] = useState<string | null>(
    (location.state as { notification?: string })?.notification || null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog State
  const [deactivateTarget, setDeactivateTarget] = useState<AdminProductListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProductListItem | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage(null);

    try {
      const [prodRes, catRes] = await Promise.all([
        productAdminService.getAdminProducts(),
        productAdminService.getCategories(),
      ]);

      if (prodRes.error) {
        setErrorMessage('Failed to load products: ' + prodRes.error.message);
      } else {
        setProducts(prodRes.data);
      }

      if (catRes.error) {
        console.warn('Failed to load categories:', catRes.error.message);
      } else {
        setCategories(catRes.data);
      }
    } catch {
      setErrorMessage('An unexpected error occurred while loading products.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Clear toast after timeout
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesSlug = p.slug.toLowerCase().includes(q);
        const matchesCategory = p.categories?.name.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesSlug && !matchesCategory) return false;
      }

      // Category
      if (selectedCategory !== 'ALL') {
        if (p.category_id !== selectedCategory) return false;
      }

      // Status
      if (statusFilter === 'ACTIVE' && !p.is_active) return false;
      if (statusFilter === 'INACTIVE' && p.is_active) return false;

      // Popular
      if (popularFilter && !p.is_popular) return false;

      return true;
    });
  }, [products, search, selectedCategory, statusFilter, popularFilter]);

  // Actions
  const handleToggleActive = (product: AdminProductListItem) => {
    if (product.is_active) {
      // Prompt before deactivation
      setDeactivateTarget(product);
    } else {
      // Direct reactivation
      performToggleActive(product, true);
    }
  };

  const performToggleActive = async (product: AdminProductListItem, newActive: boolean) => {
    setActionLoading(true);
    try {
      const { error } = await productAdminService.toggleActive(product.id, newActive);
      if (error) {
        setErrorMessage('Failed to update status: ' + error.message);
      } else {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === product.id ? { ...item, is_active: newActive } : item
          )
        );
        setNotification(
          newActive
            ? `"${product.name}" is now active on the public menu.`
            : `"${product.name}" has been deactivated.`
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
      const { error } = await productAdminService.deleteProduct(deleteTarget.id);
      if (error) {
        setErrorMessage('Failed to delete product: ' + error.message);
      } else {
        setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        setNotification(`Product "${deleteTarget.name}" was permanently deleted.`);
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
            Product Management
          </h1>
          <p className="text-xs text-ink-400 mt-1">
            Manage your restaurant catalog, pricing, variants, and active status
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
            to="/admin/products/new"
            className="btn-primary shadow-lg shadow-primary-500/20"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-white/5 bg-ink-900/60 p-4 backdrop-blur-md">
        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2 pl-9 pr-3 text-xs text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50"
          />
        </div>

        {/* Category Dropdown */}
        <div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2 px-3 text-xs text-ink-200 outline-none focus:border-primary-500/50"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
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

        {/* Popular Filter */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink-300">
            <input
              type="checkbox"
              checked={popularFilter}
              onChange={(e) => setPopularFilter(e.target.checked)}
              className="rounded border-white/20 bg-ink-900 text-primary-500 focus:ring-0"
            />
            <span>Popular Items Only</span>
          </label>
        </div>
      </div>

      {/* Main Content View */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3 text-ink-400">
          <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          <p className="text-xs font-semibold uppercase tracking-wider">Loading catalog products...</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-white/5 bg-ink-900/40 p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 text-ink-500 mb-3">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-ink-50">No products found</h3>
          <p className="mt-1 text-xs text-ink-400 max-w-sm mx-auto">
            {products.length === 0
              ? 'Your database catalog is currently empty. Click "Add Product" above to create your first item.'
              : 'No items match your active search or filter criteria.'}
          </p>
          {products.length === 0 && (
            <Link
              to="/admin/products/new"
              className="btn-primary mt-6 text-xs inline-flex"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Product</span>
            </Link>
          )}
        </div>
      ) : (
        <ProductTable
          products={filteredProducts}
          onToggleActive={handleToggleActive}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title="Deactivate Product?"
        message={`Are you sure you want to deactivate "${deactivateTarget?.name}"? It will be hidden immediately from the customer-facing website.`}
        confirmLabel="Deactivate"
        cancelLabel="Keep Active"
        isDestructive={false}
        isLoading={actionLoading}
        onConfirm={() => deactivateTarget && performToggleActive(deactivateTarget, false)}
        onClose={() => setDeactivateTarget(null)}
      />

      {/* Permanent Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Permanently Delete Product?"
        message={`Warning: Permanently deleting "${deleteTarget?.name}" will remove this record and its sizes/variants from the database. Historical orders will safely retain snapshots, but this cannot be undone.`}
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
