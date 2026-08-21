import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Star,
  Eye,
} from 'lucide-react';
import {
  productAdminService,
  type ProductFormPayload,
  type PriceOptionFormItem,
  type VariantFormItem,
} from '@/services/productAdminService';
import type { DatabaseCategory } from '@/types/database';
import ProductImageField from '@/components/admin/ProductImageField';
import ProductPriceOptions from '@/components/admin/ProductPriceOptions';
import ProductVariantsEditor from '@/components/admin/ProductVariantsEditor';

type AdminProductFormProps = {
  mode: 'create' | 'edit';
};

export default function AdminProductForm({ mode }: AdminProductFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPopular, setIsPopular] = useState(false);
  const [isActive, setIsActive] = useState(true);

  // Pricing State
  const [pricingMode, setPricingMode] = useState<'SINGLE' | 'MULTIPLE'>('SINGLE');
  const [singlePrice, setSinglePrice] = useState<number>(0);
  const [priceOptions, setPriceOptions] = useState<PriceOptionFormItem[]>([]);

  // Variants State
  const [variants, setVariants] = useState<VariantFormItem[]>([]);

  // Metadata & Status State
  const [categories, setCategories] = useState<DatabaseCategory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(mode === 'edit');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Quick category creation state
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);

  // Auto slug generation
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  // Load Categories & Product Details (if edit mode)
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const { data: cats, error: catError } = await productAdminService.getCategories();
        if (!mounted) return;

        if (catError) {
          setErrorMessage('Unable to load categories: ' + catError.message);
        } else {
          setCategories(cats);
          if (cats.length > 0 && !categoryId) {
            setCategoryId(cats[0].id);
          }
        }

        if (mode === 'edit' && id) {
          const { data: product, error: prodError } = await productAdminService.getProductById(id);
          if (!mounted) return;

          if (prodError || !product) {
            setErrorMessage('Failed to load product details: ' + (prodError?.message || 'Not found'));
          } else {
            setName(product.name);
            setSlug(product.slug);
            setSlugManuallyEdited(true);
            setCategoryId(product.category_id);
            setDescription(product.description || '');
            setImageUrl(product.image_url || '');
            setIsPopular(product.is_popular);
            setIsActive(product.is_active);

            // Populate Pricing
            const rawPrices = product.product_price_options || [];
            if (rawPrices.length === 1 && ['regular', 'base', 'fixed', 'standard'].includes(rawPrices[0].label.toLowerCase())) {
              setPricingMode('SINGLE');
              setSinglePrice(Number(rawPrices[0].price));
              setPriceOptions([]);
            } else if (rawPrices.length > 0) {
              setPricingMode('MULTIPLE');
              setPriceOptions(
                rawPrices.map((p) => ({
                  id: p.id,
                  label: p.label,
                  price: Number(p.price),
                  display_order: p.display_order,
                  is_active: p.is_active,
                }))
              );
            }

            // Populate Variants
            const rawVariants = product.product_variants || [];
            setVariants(
              rawVariants.map((v) => ({
                id: v.id,
                name: v.name,
                is_required: v.is_required,
                is_active: v.is_active,
                display_order: v.display_order,
                options: (v.product_variant_options || []).map((opt) => ({
                  id: opt.id,
                  name: opt.name,
                  price_modifier: Number(opt.price_modifier),
                  display_order: opt.display_order,
                  is_active: opt.is_active,
                })),
              }))
            );
          }
        }
      } catch {
        if (mounted) setErrorMessage('An unexpected error occurred while loading data.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [mode, id]);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setIsCreatingCategory(true);
    try {
      const { data, error } = await productAdminService.createCategory(newCategoryName);
      if (error || !data) {
        setErrorMessage('Failed to create category: ' + (error?.message || 'Error'));
      } else {
        setCategories((prev) => [...prev, data]);
        setCategoryId(data.id);
        setNewCategoryName('');
        setShowQuickCategoryModal(false);
      }
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Product name is required.');
      return;
    }
    if (!slug.trim()) {
      setErrorMessage('Product slug is required.');
      return;
    }
    if (!categoryId) {
      setErrorMessage('Please select a category.');
      return;
    }

    if (pricingMode === 'SINGLE' && (singlePrice === undefined || singlePrice < 0)) {
      setErrorMessage('Please enter a valid price for this product.');
      return;
    }

    if (pricingMode === 'MULTIPLE') {
      if (priceOptions.length === 0) {
        setErrorMessage('Please add at least one size tier or switch to Single Price mode.');
        return;
      }
      const hasInvalid = priceOptions.some((o) => !o.label.trim() || o.price < 0);
      if (hasInvalid) {
        setErrorMessage('All size options must have a label and a valid non-negative price.');
        return;
      }
    }

    setIsSaving(true);

    const payload: ProductFormPayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      category_id: categoryId,
      description: description.trim(),
      image_url: imageUrl.trim(),
      is_popular: isPopular,
      is_active: isActive,
      pricing_mode: pricingMode,
      single_price: singlePrice,
      price_options: priceOptions,
      variants,
    };

    try {
      if (mode === 'create') {
        const { data: newId, error } = await productAdminService.createProduct(payload);
        if (error || !newId) {
          setErrorMessage(error?.message || 'Failed to create product.');
        } else {
          setSuccessMessage('Product created successfully!');
          setTimeout(() => {
            navigate('/admin/products', { state: { notification: 'Product created successfully' } });
          }, 600);
        }
      } else if (mode === 'edit' && id) {
        const { error } = await productAdminService.updateProduct(id, payload);
        if (error) {
          setErrorMessage(error.message || 'Failed to update product.');
        } else {
          setSuccessMessage('Product updated successfully!');
          setTimeout(() => {
            navigate('/admin/products', { state: { notification: 'Product updated successfully' } });
          }, 600);
        }
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-ink-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading product details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-ink-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink-50">
              {mode === 'create' ? 'Add New Product' : `Edit: ${name}`}
            </h1>
            <p className="text-xs text-ink-400">
              {mode === 'create'
                ? 'Create a new item in the restaurant catalog'
                : 'Modify pricing, options, and details'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="btn-primary shadow-lg shadow-primary-500/20 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{mode === 'create' ? 'Create Product' : 'Save Changes'}</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-error-500/30 bg-error-500/10 p-4 text-xs text-error-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 p-4 text-xs text-success-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-400" />
          <div>{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================================= */}
        {/* 1. BASIC INFORMATION                                                      */}
        {/* ========================================================================= */}
        <div className="space-y-6 rounded-2xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-ink-50 border-b border-white/5 pb-3">
            Product Information
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Product Name */}
            <div>
              <label
                htmlFor="prod-name"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Product Name *
              </label>
              <input
                id="prod-name"
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Midnight Tikka"
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              />
            </div>

            {/* Slug */}
            <div>
              <label
                htmlFor="prod-slug"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                URL Slug *
              </label>
              <input
                id="prod-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="e.g. midnight-tikka"
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm font-mono text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Category Dropdown */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="prod-category"
                  className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
                >
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setShowQuickCategoryModal(true)}
                  className="text-[11px] font-semibold text-primary-400 hover:text-primary-300"
                >
                  + New Category
                </button>
              </div>
              <select
                id="prod-category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm text-ink-100 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-ink-900 text-ink-100">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Popular & Active Toggles */}
            <div className="flex items-center gap-6 pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink-200">
                <input
                  type="checkbox"
                  checked={isPopular}
                  onChange={(e) => setIsPopular(e.target.checked)}
                  disabled={isSaving}
                  className="rounded border-white/20 bg-ink-900 text-primary-500 focus:ring-0"
                />
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-primary-400" />
                  <span>Popular Item</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSaving}
                  className="rounded border-white/20 bg-ink-900 text-primary-500 focus:ring-0"
                />
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Active on Public Menu</span>
                </span>
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="prod-desc"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
            >
              Description / Ingredients
            </label>
            <textarea
              id="prod-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Pizza sauce, chicken tikka, onions, cheese."
              disabled={isSaving}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 p-4 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. IMAGE FIELD                                                            */}
        {/* ========================================================================= */}
        <div className="rounded-2xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur-sm">
          <ProductImageField
            imageUrl={imageUrl}
            onChange={setImageUrl}
            disabled={isSaving}
            onUploadStateChange={setIsUploadingImage}
          />
        </div>

        {/* ========================================================================= */}
        {/* 3. PRICING                                                                */}
        {/* ========================================================================= */}
        <ProductPriceOptions
          pricingMode={pricingMode}
          onPricingModeChange={setPricingMode}
          singlePrice={singlePrice}
          onSinglePriceChange={setSinglePrice}
          priceOptions={priceOptions}
          onPriceOptionsChange={setPriceOptions}
          disabled={isSaving}
        />

        {/* ========================================================================= */}
        {/* 4. CUSTOMIZATION VARIANTS                                                 */}
        {/* ========================================================================= */}
        <ProductVariantsEditor
          variants={variants}
          onChange={setVariants}
          disabled={isSaving}
        />

        {/* Bottom Save Action */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving || isUploadingImage || isLoading}
            className="btn-primary w-full sm:w-auto shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Product...</span>
              </>
            ) : isUploadingImage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading Image...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{mode === 'create' ? 'Create Product' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Quick Category Modal */}
      {showQuickCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setShowQuickCategoryModal(false)}
          />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-ink-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-ink-50">Create New Category</h3>
            <p className="mt-1 text-xs text-ink-400">
              Enter category name (e.g. Desserts, Beverages)
            </p>

            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category Name"
              className="mt-4 w-full rounded-xl border border-white/10 bg-ink-950 px-3.5 py-2.5 text-sm text-ink-100 outline-none focus:border-primary-500/50"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowQuickCategoryModal(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-ink-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isCreatingCategory || !newCategoryName.trim()}
                onClick={handleCreateCategory}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {isCreatingCategory ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
