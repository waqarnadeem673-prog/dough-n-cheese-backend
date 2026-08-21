import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  MessageCircle,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useBranch } from '@/context/BranchContext';
import CheckoutModal from '@/components/CheckoutModal';
import { formatPrice, openWhatsApp } from '@/utils/whatsapp';

export default function CartDrawer() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const {
    cartItems,
    cartItemCount,
    cartSubtotal,
    cartTotalSavings,
    isCartOpen,
    closeCart,
    updateQuantity,
    removeItem,
    clearCart,
  } = useCart();

  const { selectedBranch } = useBranch();

  const handleWhatsAppCheckout = () => {
    if (cartItems.length === 0) return;

    const lines: string[] = [
      `Hi Dough N Cheese (${selectedBranch.name})!`,
      `I would like to place an order:`,
      ``,
    ];

    cartItems.forEach((item, idx) => {
      const sizeStr = item.selectedSize ? ` (${item.selectedSize})` : '';
      lines.push(`${idx + 1}. ${item.productName}${sizeStr} × ${item.quantity}`);
      if (item.selectedVariants && Object.keys(item.selectedVariants).length > 0) {
        const varStr = Object.entries(item.selectedVariants)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        lines.push(`   Options: ${varStr}`);
      }
      lines.push(`   Price: ${formatPrice(item.lineTotal)}`);
      lines.push(``);
    });

    lines.push(`---------------------------`);
    if (cartTotalSavings > 0) {
      lines.push(`Subtotal: ${formatPrice(cartSubtotal + cartTotalSavings)}`);
      lines.push(`Promo Savings: -${formatPrice(cartTotalSavings)}`);
    }
    lines.push(`Total Payable: ${formatPrice(cartSubtotal)}`);
    lines.push(`Branch: ${selectedBranch.name}`);
    lines.push(``);
    lines.push(`Please confirm my order and share delivery details.`);

    const encoded = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${selectedBranch.whatsapp}?text=${encoded}`;
    openWhatsApp(url);
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-[90] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeCart}
            className="fixed inset-0 bg-ink-950/80 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-950 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-ink-50">Your Cart</h2>
                  <p className="text-[11px] text-ink-400">
                    {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} selected
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="rounded-lg px-2 py-1 text-[11px] font-semibold text-ink-400 transition-colors hover:bg-white/5 hover:text-error-400"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={closeCart}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Close cart"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Branch indicator */}
            <div className="flex items-center gap-1.5 border-b border-white/5 bg-ink-900/50 px-6 py-2 text-[11px] text-ink-300">
              <MapPin className="h-3.5 w-3.5 text-primary-400" />
              <span>Ordering for fulfillment at:</span>
              <strong className="text-ink-100">{selectedBranch.name}</strong>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cartItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/5 text-ink-500">
                    <ShoppingBag className="h-8 w-8" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-ink-100">Your cart is empty</h3>
                  <p className="mt-1 max-w-[220px] text-xs text-ink-400">
                    Looks like you haven&apos;t added any cravings yet. Explore our delicious menu!
                  </p>
                  <button
                    onClick={() => {
                      closeCart();
                      document.querySelector('#menu')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="btn-primary mt-6 text-xs"
                  >
                    Browse Menu
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                cartItems.map((item) => (
                  <div
                    key={item.key}
                    className="flex gap-3 rounded-2xl border border-white/5 bg-ink-900/60 p-3.5 transition-colors hover:border-white/10"
                  >
                    {/* Thumbnail */}
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-ink-950 shrink-0">
                      <img
                        src={item.productImage}
                        alt={item.productName}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = '0.3';
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-ink-50 leading-tight">
                            {item.productName}
                          </h4>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {item.selectedSize && (
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary-300">
                                {item.selectedSize}
                              </span>
                            )}
                            {Object.entries(item.selectedVariants).map(([k, v]) => (
                              <span
                                key={k}
                                className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-ink-300"
                              >
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={() => removeItem(item.key)}
                          className="text-ink-500 transition-colors hover:text-error-400"
                          title="Remove item"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {/* Price & Quantity Controls */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-bold text-primary-400">
                            {formatPrice(item.lineTotal)}
                          </span>
                          {item.discountInfo && (
                            <span className="text-[10px] text-ink-500 line-through">
                              {formatPrice(item.baseUnitPrice * item.quantity)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-ink-950/80 px-2 py-1">
                          <button
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            className="text-ink-400 transition-colors hover:text-white"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-4 text-center text-xs font-bold text-ink-100">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            className="text-ink-400 transition-colors hover:text-white"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer Summary */}
            {cartItems.length > 0 && (
              <div className="border-t border-white/5 bg-ink-900/40 p-6 space-y-4">
                {/* Savings Pill */}
                {cartTotalSavings > 0 && (
                  <div className="flex items-center justify-between rounded-xl border border-primary-500/20 bg-primary-500/10 px-3.5 py-2 text-xs font-semibold text-primary-300">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Promotional Discount Applied</span>
                    </div>
                    <span>-{formatPrice(cartTotalSavings)}</span>
                  </div>
                )}

                {/* Subtotal */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                    Subtotal
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-black text-primary-400">
                      {formatPrice(cartSubtotal)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2.5">
                  <button
                    onClick={() => setIsCheckoutOpen(true)}
                    className="btn-primary w-full justify-center py-3 text-sm font-bold shadow-lg shadow-primary-500/20"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <button
                    onClick={handleWhatsAppCheckout}
                    className="btn-secondary w-full justify-center py-2.5 text-xs text-ink-300 hover:text-white"
                  >
                    <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Quick Order on WhatsApp</span>
                  </button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Secure Online Checkout Modal */}
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
          />
        </div>
      )}
    </AnimatePresence>
  );
}
