import { Plus, Trash2, Sliders } from 'lucide-react';
import type { VariantFormItem, VariantOptionFormItem } from '@/services/productAdminService';

type ProductVariantsEditorProps = {
  variants: VariantFormItem[];
  onChange: (variants: VariantFormItem[]) => void;
  disabled?: boolean;
};

export default function ProductVariantsEditor({
  variants,
  onChange,
  disabled = false,
}: ProductVariantsEditorProps) {
  const addVariant = () => {
    const newVariant: VariantFormItem = {
      name: '',
      is_required: false,
      is_active: true,
      display_order: variants.length,
      options: [
        { name: '', price_modifier: 0, display_order: 0, is_active: true },
      ],
    };
    onChange([...variants, newVariant]);
  };

  const removeVariant = (vIdx: number) => {
    onChange(variants.filter((_, i) => i !== vIdx));
  };

  const updateVariant = (vIdx: number, field: keyof VariantFormItem, value: unknown) => {
    const updated = [...variants];
    updated[vIdx] = {
      ...updated[vIdx],
      [field]: value,
    };
    onChange(updated);
  };

  const addOption = (vIdx: number) => {
    const updated = [...variants];
    const opts = updated[vIdx].options || [];
    updated[vIdx].options = [
      ...opts,
      {
        name: '',
        price_modifier: 0,
        display_order: opts.length,
        is_active: true,
      },
    ];
    onChange(updated);
  };

  const removeOption = (vIdx: number, oIdx: number) => {
    const updated = [...variants];
    updated[vIdx].options = updated[vIdx].options.filter((_, i) => i !== oIdx);
    onChange(updated);
  };

  const updateOption = (
    vIdx: number,
    oIdx: number,
    field: keyof VariantOptionFormItem,
    value: unknown
  ) => {
    const updated = [...variants];
    const opts = [...updated[vIdx].options];
    opts[oIdx] = {
      ...opts[oIdx],
      [field]: value,
    };
    updated[vIdx].options = opts;
    onChange(updated);
  };

  return (
    <div className="space-y-6 rounded-2xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-white/5 pb-4">
        <div>
          <h3 className="text-sm font-bold text-ink-50">Customization Variants</h3>
          <p className="text-xs text-ink-400">
            Configure optional or required customizations (e.g. Crust, Patty type, Drink choice)
          </p>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={addVariant}
          className="flex items-center gap-1.5 rounded-xl border border-primary-500/30 bg-primary-500/10 px-3.5 py-1.5 text-xs font-semibold text-primary-400 hover:bg-primary-500/20 transition-colors disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Customization Group</span>
        </button>
      </div>

      {variants.length === 0 ? (
        <div className="py-6 text-center text-xs text-ink-500">
          No customizations configured for this product. Click "Add Customization Group" to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {variants.map((v, vIdx) => (
            <div
              key={vIdx}
              className="rounded-xl border border-white/10 bg-ink-950/60 p-4 space-y-4"
            >
              {/* Variant Group Header */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <Sliders className="h-4 w-4 text-primary-500 shrink-0" />
                  <input
                    type="text"
                    required
                    value={v.name}
                    onChange={(e) => updateVariant(vIdx, 'name', e.target.value)}
                    placeholder="Group Name (e.g. Crust, Meal Type)"
                    disabled={disabled}
                    className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs font-semibold text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-ink-300">
                    <input
                      type="checkbox"
                      checked={v.is_required}
                      onChange={(e) => updateVariant(vIdx, 'is_required', e.target.checked)}
                      disabled={disabled}
                      className="rounded border-white/20 bg-ink-900 text-primary-500 focus:ring-0"
                    />
                    <span>Required Selection</span>
                  </label>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeVariant(vIdx)}
                    className="rounded-lg p-1.5 text-ink-500 hover:bg-error-500/10 hover:text-error-400 transition-colors"
                    title="Remove group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Options List */}
              <div className="pl-6 space-y-2 border-l border-white/10">
                <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-ink-400">
                  <span>Choice Options</span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => addOption(vIdx)}
                    className="flex items-center gap-1 text-primary-400 hover:text-primary-300"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Choice</span>
                  </button>
                </div>

                {v.options.map((opt, oIdx) => (
                  <div key={oIdx} className="flex items-center gap-2">
                    <div className="flex-1">
                      <input
                        type="text"
                        required
                        value={opt.name}
                        onChange={(e) => updateOption(vIdx, oIdx, 'name', e.target.value)}
                        placeholder="Option Name (e.g. Thin Crust, Double Patty)"
                        disabled={disabled}
                        className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-1.5 text-xs text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50"
                      />
                    </div>

                    <div className="w-28 relative">
                      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-ink-500">
                        +Rs.
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        value={opt.price_modifier || ''}
                        onChange={(e) =>
                          updateOption(
                            vIdx,
                            oIdx,
                            'price_modifier',
                            parseFloat(e.target.value) || 0
                          )
                        }
                        placeholder="0"
                        disabled={disabled}
                        className="w-full rounded-lg border border-white/10 bg-ink-900 py-1.5 pl-9 pr-2 text-xs text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50"
                      />
                    </div>

                    <button
                      type="button"
                      disabled={disabled || v.options.length <= 1}
                      onClick={() => removeOption(vIdx, oIdx)}
                      className="p-1.5 text-ink-500 hover:text-error-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
