import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  Percent,
  Tag,
  Calendar,
  Layers,
  MapPin,
  Check,
  AlertCircle,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  discountAdminService,
  type DiscountFormPayload,
} from '@/services/discountAdminService';
import type { DiscountType, DiscountScope } from '@/types/database';

type AdminDiscountFormProps = {
  mode: 'create' | 'edit';
};

// Convert ISO string from Supabase (e.g. 2026-08-20T19:00:00Z) to datetime-local input format (YYYY-MM-DDTHH:mm)
function isoToDatetimeLocal(isoStr: string | null): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '';
    const pad = (num: number) => String(num).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

// Convert datetime-local input value to ISO string or null
function datetimeLocalToIso(val: string): string | null {
  if (!val.trim()) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export default function AdminDiscountForm({ mode }: AdminDiscountFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<string>('15');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [scope, setScope] = useState<DiscountScope>('ALL_PRODUCTS');

  // Targeting Selections
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [allBranchesSelected, setAllBranchesSelected] = useState(true);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Available targeting datasets
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [products, setProducts] = useState<
    Array<{ id: string; name: string; category_name: string }>
  >([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string; city: string }>>([]);

  // UI state
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load available target entities & existing discount (if edit mode)
  const initializeData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch form options
      const { data: optionsData, error: optionsError } =
        await discountAdminService.getFormTargetingOptions();
      if (optionsError) {
        setErrorMessage('Failed to load selection options: ' + optionsError.message);
      } else {
        setCategories(optionsData.categories);
        setProducts(optionsData.products);
        setBranches(optionsData.branches);
      }

      // 2. If editing, fetch discount details
      if (mode === 'edit' && id) {
        const { data: discount, error: discountError } =
          await discountAdminService.getDiscountById(id);
        if (discountError || !discount) {
          setErrorMessage('Discount not found or failed to load.');
          setLoading(false);
          return;
        }

        setTitle(discount.title);
        setDescription(discount.description || '');
        setImageUrl(discount.image_url || '');
        setDiscountType(discount.discount_type);
        setDiscountValue(String(discount.discount_value));
        setStartsAt(isoToDatetimeLocal(discount.starts_at));
        setEndsAt(isoToDatetimeLocal(discount.ends_at));
        setIsActive(discount.is_active);
        setScope(discount.scope);

        // Branch targeting
        const branchIds = (discount.discount_branches || []).map((b) => b.branch_id);
        if (branchIds.length === 0) {
          setAllBranchesSelected(true);
          setSelectedBranchIds([]);
        } else {
          setAllBranchesSelected(false);
          setSelectedBranchIds(branchIds);
        }

        // Category targeting
        const catIds = (discount.discount_categories || []).map((c) => c.category_id);
        setSelectedCategoryIds(catIds);

        // Product targeting
        const prodIds = (discount.discount_products || []).map((p) => p.product_id);
        setSelectedProductIds(prodIds);
      }
    } catch {
      setErrorMessage('An unexpected error occurred while loading form data.');
    } finally {
      setLoading(false);
    }
  }, [mode, id]);

  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // Branch Selection Toggles
  const handleToggleAllBranches = () => {
    if (!allBranchesSelected) {
      setAllBranchesSelected(true);
      setSelectedBranchIds([]);
    } else {
      setAllBranchesSelected(false);
      // Select all available as initial starting point if turning off global
      setSelectedBranchIds(branches.map((b) => b.id));
    }
  };

  const handleToggleBranch = (branchId: string) => {
    setAllBranchesSelected(false);
    setSelectedBranchIds((prev) =>
      prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId]
    );
  };

  // Category Selection Toggles
  const handleToggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategoryIds.length === categories.length) {
      setSelectedCategoryIds([]);
    } else {
      setSelectedCategoryIds(categories.map((c) => c.id));
    }
  };

  // Product Selection Toggles
  const handleToggleProduct = (prodId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products;
    const q = productSearch.toLowerCase().trim();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category_name.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Form Validation
  const validateForm = (): string | null => {
    if (!title.trim()) {
      return 'Discount title is required.';
    }

    const numericVal = parseFloat(discountValue);
    if (isNaN(numericVal) || numericVal <= 0) {
      return 'Discount value must be a positive number greater than 0.';
    }

    if (discountType === 'PERCENTAGE' && numericVal > 100) {
      return 'Percentage discount cannot exceed 100%.';
    }

    if (startsAt && endsAt) {
      const startMs = new Date(startsAt).getTime();
      const endMs = new Date(endsAt).getTime();
      if (endMs <= startMs) {
        return 'End date and time must be after the start date and time.';
      }
    }

    if (!allBranchesSelected && selectedBranchIds.length === 0) {
      return 'Please select at least one branch or choose "Apply to All Branches".';
    }

    if (scope === 'SELECTED_CATEGORIES' && selectedCategoryIds.length === 0) {
      return 'Please select at least one category for Selected Categories scope.';
    }

    if (scope === 'SELECTED_PRODUCTS' && selectedProductIds.length === 0) {
      return 'Please select at least one product for Selected Products scope.';
    }

    return null;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    const payload: DiscountFormPayload = {
      title: title.trim(),
      description: description.trim(),
      image_url: imageUrl.trim(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      scope,
      is_active: isActive,
      starts_at: datetimeLocalToIso(startsAt),
      ends_at: datetimeLocalToIso(endsAt),
      branch_ids: allBranchesSelected ? [] : selectedBranchIds,
      category_ids: scope === 'SELECTED_CATEGORIES' ? selectedCategoryIds : [],
      product_ids: scope === 'SELECTED_PRODUCTS' ? selectedProductIds : [],
    };

    try {
      if (mode === 'create') {
        const { data: newId, error } = await discountAdminService.createDiscount(payload);
        if (error || !newId) {
          setErrorMessage(error?.message || 'Failed to create discount.');
          setSaving(false);
          return;
        }

        navigate('/admin/discounts', {
          state: { notification: `Discount "${payload.title}" successfully created.` },
        });
      } else if (mode === 'edit' && id) {
        const { success, error } = await discountAdminService.updateDiscount(id, payload);
        if (error || !success) {
          setErrorMessage(error?.message || 'Failed to update discount.');
          setSaving(false);
          return;
        }

        navigate('/admin/discounts', {
          state: { notification: `Discount "${payload.title}" successfully updated.` },
        });
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-400" />
        <p className="mt-4 text-xs font-medium text-ink-400">Loading discount editor...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* ========================================================================= */}
      {/* TOP HEADER                                                                */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/discounts"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>{mode === 'create' ? 'New Campaign' : 'Edit Promotion'}</span>
            </div>
            <h1 className="mt-0.5 text-2xl font-bold text-ink-50">
              {mode === 'create' ? 'Create Discount' : `Edit "${title || 'Discount'}"`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/discounts"
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
            <span>{saving ? 'Saving...' : mode === 'create' ? 'Publish Discount' : 'Save Changes'}</span>
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
        {/* Section 1: General Details */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Tag className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">General Information</h2>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Discount Title <span className="text-error-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Midweek Pizza Mania, 20% Weekend Special, Flat Rs. 300 Off"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Description / Promo Details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Brief explanation of terms, applicability, or highlights..."
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 resize-none"
              />
            </div>

            {/* Image URL with live preview */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Promotional Banner Image URL (Optional)
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
                />
                {imageUrl.trim() && (
                  <div className="h-10 w-16 overflow-hidden rounded-xl border border-white/10 bg-ink-950 shrink-0">
                    <img
                      src={imageUrl}
                      alt="Banner Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Value & Calculation Type */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Percent className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Discount Value & Type</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Calculation Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENTAGE')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                    discountType === 'PERCENTAGE'
                      ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                      : 'border-white/10 bg-ink-950/50 text-ink-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Percent className="h-3.5 w-3.5" />
                  <span>Percentage (%)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED_AMOUNT')}
                  className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                    discountType === 'FIXED_AMOUNT'
                      ? 'border-primary-500 bg-primary-500/15 text-primary-300'
                      : 'border-white/10 bg-ink-950/50 text-ink-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Tag className="h-3.5 w-3.5" />
                  <span>Fixed (Rs.)</span>
                </button>
              </div>
            </div>

            {/* Value input */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Discount Amount {discountType === 'PERCENTAGE' ? '(%)' : '(PKR)'} <span className="text-error-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max={discountType === 'PERCENTAGE' ? '100' : '99999'}
                  step={discountType === 'PERCENTAGE' ? '1' : '10'}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountType === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 350'}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50"
                  required
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-primary-400">
                  {discountType === 'PERCENTAGE' ? '%' : 'Rs.'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Schedule & Active Status */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Calendar className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Validity & Schedule</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Starts at */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Starts At (Optional)
              </label>
              <input
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 outline-none transition-colors focus:border-primary-500/50 [color-scheme:dark]"
              />
              <p className="mt-1 text-[11px] text-ink-500">
                Leave blank to activate immediately upon saving.
              </p>
            </div>

            {/* Ends at */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Ends At (Optional)
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 outline-none transition-colors focus:border-primary-500/50 [color-scheme:dark]"
              />
              <p className="mt-1 text-[11px] text-ink-500">
                Leave blank for an ongoing promotion with no expiration.
              </p>
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-ink-950/40 p-3.5">
            <div>
              <div className="text-xs font-bold text-ink-100">Promotion Status</div>
              <div className="text-[11px] text-ink-400">
                {isActive
                  ? 'Active and visible to customers when date conditions match'
                  : 'Paused / Inactive regardless of dates'}
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

        {/* Section 4: Product Scope */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Layers className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Target Menu Scope</h2>
          </div>

          {/* Scope Selector Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { id: 'ALL_PRODUCTS', label: 'All Products', desc: 'Applies to whole menu' },
              {
                id: 'SELECTED_CATEGORIES',
                label: 'Specific Categories',
                desc: 'Target full categories',
              },
              { id: 'SELECTED_PRODUCTS', label: 'Specific Items', desc: 'Pick individual items' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScope(tab.id as DiscountScope)}
                className={`flex flex-col items-start rounded-2xl border p-3.5 text-left transition-all ${
                  scope === tab.id
                    ? 'border-primary-500 bg-primary-500/10 text-ink-50 shadow-sm'
                    : 'border-white/5 bg-ink-950/40 text-ink-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="text-xs font-bold text-ink-100">{tab.label}</span>
                <span className="text-[10px] text-ink-400 mt-0.5">{tab.desc}</span>
              </button>
            ))}
          </div>

          {/* Category Multi-select (when SELECTED_CATEGORIES) */}
          {scope === 'SELECTED_CATEGORIES' && (
            <div className="rounded-2xl border border-white/5 bg-ink-950/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-200">
                  Select Categories ({selectedCategoryIds.length} of {categories.length} chosen)
                </span>
                <button
                  type="button"
                  onClick={handleSelectAllCategories}
                  className="text-[11px] font-semibold text-primary-400 hover:text-primary-300"
                >
                  {selectedCategoryIds.length === categories.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                {categories.map((cat) => {
                  const isChecked = selectedCategoryIds.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleToggleCategory(cat.id)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all ${
                        isChecked
                          ? 'border-primary-500 bg-primary-500/15 text-primary-200 font-semibold'
                          : 'border-white/5 bg-ink-900/60 text-ink-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          isChecked
                            ? 'border-primary-400 bg-primary-500 text-ink-950'
                            : 'border-white/20 bg-ink-950'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Product Multi-select (when SELECTED_PRODUCTS) */}
          {scope === 'SELECTED_PRODUCTS' && (
            <div className="rounded-2xl border border-white/5 bg-ink-950/60 p-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs font-bold text-ink-200">
                  Select Products ({selectedProductIds.length} chosen)
                </span>

                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search menu items..."
                    className="w-full rounded-xl border border-white/10 bg-ink-900/80 py-1.5 pl-8 pr-3 text-xs text-ink-50 placeholder-ink-500 outline-none focus:border-primary-500/50"
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 pt-1">
                {filteredProducts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-ink-500">
                    No products match "{productSearch}"
                  </div>
                ) : (
                  filteredProducts.map((prod) => {
                    const isChecked = selectedProductIds.includes(prod.id);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => handleToggleProduct(prod.id)}
                        className={`flex w-full items-center justify-between rounded-xl border p-2.5 text-left text-xs transition-all ${
                          isChecked
                            ? 'border-primary-500/60 bg-primary-500/10 text-ink-50'
                            : 'border-white/5 bg-ink-900/50 text-ink-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <div>
                          <div className="font-semibold text-ink-100">{prod.name}</div>
                          <div className="text-[10px] text-ink-400">{prod.category_name}</div>
                        </div>

                        <div
                          className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                            isChecked
                              ? 'border-primary-400 bg-primary-500 text-ink-950'
                              : 'border-white/20 bg-ink-950'
                          }`}
                        >
                          {isChecked && <Check className="h-3 w-3" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 5: Branch Targeting */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <MapPin className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Branch Targeting</h2>
          </div>

          <div className="space-y-3">
            {/* Global toggle */}
            <button
              type="button"
              onClick={handleToggleAllBranches}
              className={`flex w-full items-center justify-between rounded-2xl border p-3.5 text-left text-xs transition-all ${
                allBranchesSelected
                  ? 'border-primary-500 bg-primary-500/15 text-primary-200 font-bold'
                  : 'border-white/5 bg-ink-950/40 text-ink-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div>
                <div className="font-bold text-ink-100">Apply to All Branches</div>
                <div className="text-[11px] text-ink-400 font-normal mt-0.5">
                  Universal promotion available across all current and future branch locations
                </div>
              </div>

              <div
                className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                  allBranchesSelected
                    ? 'border-primary-400 bg-primary-500 text-ink-950'
                    : 'border-white/20 bg-ink-950'
                }`}
              >
                {allBranchesSelected && <Check className="h-3 w-3" />}
              </div>
            </button>

            {/* Individual Branch Checkboxes (when not universal) */}
            {!allBranchesSelected && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {branches.map((b) => {
                  const isChecked = selectedBranchIds.includes(b.id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => handleToggleBranch(b.id)}
                      className={`flex items-center justify-between rounded-xl border p-3 text-left text-xs transition-all ${
                        isChecked
                          ? 'border-primary-500 bg-primary-500/15 text-primary-200 font-semibold'
                          : 'border-white/5 bg-ink-950/60 text-ink-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-ink-100">{b.name}</div>
                        <div className="text-[10px] text-ink-400">{b.city}</div>
                      </div>

                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded border shrink-0 ${
                          isChecked
                            ? 'border-primary-400 bg-primary-500 text-ink-950'
                            : 'border-white/20 bg-ink-950'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Action Row */}
        <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
          <Link
            to="/admin/discounts"
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
            <span>{saving ? 'Saving...' : mode === 'create' ? 'Publish Discount' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
