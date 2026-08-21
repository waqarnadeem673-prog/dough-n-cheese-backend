import { Link } from 'react-router-dom';
import { Edit, Trash2, Star, Layers } from 'lucide-react';
import type { AdminProductListItem } from '@/services/productAdminService';

type ProductTableProps = {
  products: AdminProductListItem[];
  onToggleActive: (product: AdminProductListItem) => void;
  onDelete: (product: AdminProductListItem) => void;
};

export default function ProductTable({
  products,
  onToggleActive,
  onDelete,
}: ProductTableProps) {
  const formatPriceRange = (product: AdminProductListItem) => {
    const opts = (product.product_price_options || []).filter((o) => o.is_active !== false);
    if (opts.length === 0) return 'No price set';
    if (opts.length === 1) return `Rs. ${Number(opts[0].price).toLocaleString('en-PK')}`;

    const prices = opts.map((o) => Number(o.price)).sort((a, b) => a - b);
    return `Rs. ${prices[0].toLocaleString('en-PK')} – ${prices[prices.length - 1].toLocaleString('en-PK')}`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-ink-900/60 shadow-xl backdrop-blur-md">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-ink-300">
          <thead className="border-b border-white/10 bg-ink-950/40 text-[11px] font-bold uppercase tracking-wider text-ink-400">
            <tr>
              <th className="px-6 py-4">Item</th>
              <th className="px-4 py-4">Category</th>
              <th className="px-4 py-4">Pricing</th>
              <th className="px-4 py-4 text-center">Variants</th>
              <th className="px-4 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {products.map((p) => (
              <tr
                key={p.id}
                className="transition-colors hover:bg-white/[0.02]"
              >
                {/* Image + Title */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3.5">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-ink-950">
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-ink-600">
                          N/A
                        </div>
                      )}
                      {p.is_popular && (
                        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-500 text-ink-950 shadow">
                          <Star className="h-2.5 w-2.5 fill-ink-950" />
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-ink-50">{p.name}</div>
                      <div className="text-[11px] text-ink-500 font-mono">
                        /{p.slug}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-4">
                  <span className="inline-block rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-ink-200">
                    {p.categories?.name || 'Uncategorized'}
                  </span>
                </td>

                {/* Pricing */}
                <td className="px-4 py-4 font-semibold text-primary-400">
                  {formatPriceRange(p)}
                </td>

                {/* Variants Count */}
                <td className="px-4 py-4 text-center">
                  {(p.product_variants || []).length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-ink-950 px-2 py-1 text-xs text-ink-300">
                      <Layers className="h-3 w-3 text-primary-500" />
                      <span>{p.product_variants.length}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-600">—</span>
                  )}
                </td>

                {/* Status Switch */}
                <td className="px-4 py-4 text-center">
                  <button
                    onClick={() => onToggleActive(p)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                      p.is_active
                        ? 'bg-success-500/15 text-success-500 hover:bg-success-500/25'
                        : 'bg-ink-800 text-ink-400 hover:bg-ink-700'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        p.is_active ? 'bg-success-500' : 'bg-ink-500'
                      }`}
                    />
                    <span>{p.is_active ? 'Active' : 'Inactive'}</span>
                  </button>
                </td>

                {/* Actions */}
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to={`/admin/products/${p.id}/edit`}
                      className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white transition-colors"
                      title="Edit product"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>

                    <button
                      onClick={() => onDelete(p)}
                      className="rounded-lg p-2 text-ink-400 hover:bg-error-500/10 hover:text-error-400 transition-colors"
                      title="Delete product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
