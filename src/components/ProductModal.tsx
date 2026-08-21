import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, MessageCircle, Check, ShoppingBag } from 'lucide-react';
import type { Product } from '@/types';
import { useBranch } from '@/context/BranchContext';
import { useCart } from '@/context/CartContext';
import type { ProductDiscountMatch } from '@/hooks/useActiveDiscounts';
import { generateWhatsAppOrder, openWhatsApp, formatPrice } from '@/utils/whatsapp';

type Props = {
  product: Product | null;
  discountMatch?: ProductDiscountMatch | null;
  onClose: () => void;
};

export default function ProductModal({ product, discountMatch, onClose }: Props) {
  const { selectedBranch } = useBranch();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [priceLabel, setPriceLabel] = useState<string | undefined>(undefined);
  const [variantSelections, setVariantSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (product) {
      setQuantity(1);
      setPriceLabel(product.priceOptions?.[0]?.label);
      const vs: Record<string, string> = {};
      product.variants?.forEach((v) => {
        vs[v.name] = v.options[0];
      });
      setVariantSelections(vs);
    }
  }, [product]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (product) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [product, onClose]);

  const rawUnitPrice = useMemo(() => {
    if (!product) return 0;
    if (product.price !== null) return product.price;
    const opt = product.priceOptions?.find((o) => o.label === priceLabel);
    return opt?.price ?? product.priceOptions?.[0]?.price ?? 0;
  }, [product, priceLabel]);

  // Discount calculation
  const { unitPrice, originalTotal, discountTotal, finalTotal } = useMemo(() => {
    const rawSubtotal = rawUnitPrice * quantity;
    if (discountMatch) {
      const { finalPrice, discountAmount } = discountMatch.calculate(rawUnitPrice);
      const totalDiscount = discountAmount * quantity;
      return {
        unitPrice: finalPrice,
        originalTotal: rawSubtotal,
        discountTotal: totalDiscount,
        finalTotal: rawSubtotal - totalDiscount,
      };
    }
    return {
      unitPrice: rawUnitPrice,
      originalTotal: rawSubtotal,
      discountTotal: 0,
      finalTotal: rawSubtotal,
    };
  }, [rawUnitPrice, quantity, discountMatch]);

  if (!product) return null;

  const handleAddToCart = () => {
    addItem({
      product,
      quantity,
      selectedSize: priceLabel,
      selectedVariants: variantSelections,
      rawUnitPrice,
      discountMatch,
    });
    onClose();
  };

  const handleOrderWhatsApp = () => {
    const discountInfo =
      discountMatch && discountTotal > 0
        ? {
            discountName: discountMatch.discountName,
            originalTotal,
            discountAmount: discountTotal,
            finalTotal,
          }
        : undefined;

    const url = generateWhatsAppOrder(
      product,
      { quantity, priceLabel, price: unitPrice, variantSelections, discountInfo },
      selectedBranch,
    );
    openWhatsApp(url);
    onClose();
  };

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
        >
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-900 sm:rounded-3xl"
          >
            {/* Image */}
            <div className="relative h-56 overflow-hidden rounded-t-3xl sm:h-64">
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
              <button
                onClick={onClose}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-ink-950/60 text-white backdrop-blur-sm transition-colors hover:bg-ink-950/80"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="section-label">{product.category}</span>
                  <h2 className="mt-1 text-2xl font-bold text-ink-50">{product.name}</h2>
                </div>
                <div className="flex flex-col items-end">
                  {discountMatch && (
                    <span className="text-[10px] text-ink-400 line-through">
                      {formatPrice(rawUnitPrice)}
                    </span>
                  )}
                  <span className="rounded-full bg-primary-500/15 px-3 py-1 text-sm font-bold text-primary-400">
                    {formatPrice(unitPrice)}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-ink-300">{product.description}</p>

              {/* Price options */}
              {product.priceOptions && product.priceOptions.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Size
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {product.priceOptions.map((opt) => {
                      const isSelected = priceLabel === opt.label;
                      const optPrice = discountMatch
                        ? discountMatch.calculate(opt.price).finalPrice
                        : opt.price;

                      return (
                        <button
                          key={opt.label}
                          onClick={() => setPriceLabel(opt.label)}
                          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                            isSelected
                              ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                              : 'border-white/10 bg-white/5 text-ink-200 hover:border-white/20'
                          }`}
                        >
                          <span>{opt.label}</span>
                          <span className="text-xs text-ink-400">{formatPrice(optPrice)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Variants */}
              {product.variants?.map((variant) => (
                <div key={variant.name} className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                    {variant.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() =>
                          setVariantSelections((prev) => ({ ...prev, [variant.name]: opt }))
                        }
                        className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all ${
                          variantSelections[variant.name] === opt
                            ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                            : 'border-white/10 bg-white/5 text-ink-200 hover:border-white/20'
                        }`}
                      >
                        {variantSelections[variant.name] === opt && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Quantity */}
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
                  Quantity
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-100 transition-colors hover:bg-white/10 disabled:opacity-40"
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-10 text-center text-lg font-bold text-ink-50">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-ink-100 transition-colors hover:bg-white/10"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Total + Actions */}
              <div className="mt-6 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-ink-400">Total</p>
                    {discountMatch && discountTotal > 0 && (
                      <span className="rounded-md bg-primary-500/20 px-1.5 py-0.5 text-[10px] font-bold text-primary-300">
                        {discountMatch.badgeLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-primary-400">{formatPrice(finalTotal)}</p>
                    {discountMatch && discountTotal > 0 && (
                      <span className="text-xs text-ink-400 line-through">
                        {formatPrice(originalTotal)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddToCart}
                    className="btn-primary flex-1 sm:flex-none"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    onClick={handleOrderWhatsApp}
                    className="btn-secondary px-3 py-2.5 text-xs text-ink-200 hover:text-white"
                    title="Quick order this item directly via WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4 text-emerald-400" />
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
