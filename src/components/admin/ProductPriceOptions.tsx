import { Plus, Trash2, Layers, DollarSign } from 'lucide-react';
import type { PriceOptionFormItem } from '@/services/productAdminService';

type ProductPriceOptionsProps = {
  pricingMode: 'SINGLE' | 'MULTIPLE';
  onPricingModeChange: (mode: 'SINGLE' | 'MULTIPLE') => void;
  singlePrice: number;
  onSinglePriceChange: (price: number) => void;
  priceOptions: PriceOptionFormItem[];
  onPriceOptionsChange: (options: PriceOptionFormItem[]) => void;
  disabled?: boolean;
};

export default function ProductPriceOptions({
  pricingMode,
  onPricingModeChange,
  singlePrice,
  onSinglePriceChange,
  priceOptions,
  onPriceOptionsChange,
  disabled = false,
}: ProductPriceOptionsProps) {
  const addOption = () => {
    const nextOrder = priceOptions.length;
    const newOptions: PriceOptionFormItem[] = [
      ...priceOptions,
      {
        label: '',
        price: 0,
        display_order: nextOrder,
        is_active: true,
      },
    ];
    onPriceOptionsChange(newOptions);
  };

  const removeOption = (index: number) => {
    const updated = priceOptions.filter((_, i) => i !== index);
    onPriceOptionsChange(updated);
  };

  const updateOption = (index: number, field: keyof PriceOptionFormItem, value: unknown) => {
    const updated = [...priceOptions];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onPriceOptionsChange(updated);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur-sm">
      {/* Mode Switcher */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-bold text-ink-50">Pricing Configuration</h3>
          <p className="text-xs text-ink-400">
            Choose whether this item has one fixed price or multiple size tiers
          </p>
        </div>

        <div className="flex rounded-xl bg-ink-950 p-1 border border-white/10">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPricingModeChange('SINGLE')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              pricingMode === 'SINGLE'
                ? 'bg-primary-500 text-ink-950 shadow-md shadow-primary-500/20'
                : 'text-ink-300 hover:text-white'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Single Price</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              onPricingModeChange('MULTIPLE');
              if (priceOptions.length === 0) {
                // Initialize with common default templates if empty
                onPriceOptionsChange([
                  { label: 'Small', price: singlePrice || 700, display_order: 0, is_active: true },
                  { label: 'Medium', price: 1400, display_order: 1, is_active: true },
                  { label: 'Large', price: 2100, display_order: 2, is_active: true },
                ]);
              }
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              pricingMode === 'MULTIPLE'
                ? 'bg-primary-500 text-ink-950 shadow-md shadow-primary-500/20'
                : 'text-ink-300 hover:text-white'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Multiple Sizes</span>
          </button>
        </div>
      </div>

      {/* MODE A: SINGLE PRICE */}
      {pricingMode === 'SINGLE' ? (
        <div className="max-w-xs">
          <label
            htmlFor="single-price-input"
            className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
          >
            Base Price (Rs.)
          </label>
          <div className="relative mt-2">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-400">
              Rs.
            </span>
            <input
              id="single-price-input"
              type="number"
              min="0"
              step="10"
              required
              value={singlePrice || ''}
              onChange={(e) => onSinglePriceChange(parseFloat(e.target.value) || 0)}
              placeholder="650"
              disabled={disabled}
              className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-3 pl-12 pr-4 text-sm text-ink-100 placeholder-ink-600 outline-none transition-colors focus:border-primary-500/50 focus:bg-ink-950 disabled:opacity-50"
            />
          </div>
        </div>
      ) : (
        /* MODE B: MULTIPLE SIZE TIERS */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-300">
              Size Tiers & Prices
            </span>
            <button
              type="button"
              disabled={disabled}
              onClick={addOption}
              className="flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Size Option</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {priceOptions.map((opt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-ink-950/40 p-3"
              >
                {/* Size Label */}
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    value={opt.label}
                    onChange={(e) => updateOption(idx, 'label', e.target.value)}
                    placeholder="e.g. Small, Medium, Large, XL"
                    disabled={disabled}
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50"
                  />
                </div>

                {/* Price */}
                <div className="w-32 relative">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-ink-500">
                    Rs.
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={opt.price || ''}
                    onChange={(e) => updateOption(idx, 'price', parseFloat(e.target.value) || 0)}
                    placeholder="1200"
                    disabled={disabled}
                    className="w-full rounded-lg border border-white/10 bg-ink-900 py-2 pl-8 pr-3 text-xs text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50"
                  />
                </div>

                {/* Active Toggle */}
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-ink-400">
                  <input
                    type="checkbox"
                    checked={opt.is_active}
                    onChange={(e) => updateOption(idx, 'is_active', e.target.checked)}
                    disabled={disabled}
                    className="rounded border-white/20 bg-ink-900 text-primary-500 focus:ring-0"
                  />
                  <span className="hidden sm:inline text-[11px]">Active</span>
                </label>

                {/* Remove */}
                <button
                  type="button"
                  disabled={disabled || priceOptions.length <= 1}
                  onClick={() => removeOption(idx)}
                  className="rounded-lg p-1.5 text-ink-500 hover:bg-error-500/10 hover:text-error-400 disabled:opacity-30 transition-colors"
                  title="Remove size option"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
