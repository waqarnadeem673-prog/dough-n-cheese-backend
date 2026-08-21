import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingBag,
  Truck,
  Store,
  MapPin,
  Phone,
  User,
  FileText,
  CheckCircle2,
  MessageCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useBranch } from '@/context/BranchContext';
import { orderService, type OrderType, type OrderCreationResult } from '@/services/orderService';
import { formatPrice, openWhatsApp } from '@/utils/whatsapp';

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CheckoutModal({ isOpen, onClose }: Props) {
  const { cartItems, cartSubtotal, cartTotalSavings, clearCart } = useCart();
  const { selectedBranch } = useBranch();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderCreationResult | null>(null);
  // Snapshot of cart items captured just before clearCart() — needed for the
  // WhatsApp confirmation message since cartItems is empty after clearCart.
  const [confirmedItems, setConfirmedItems] = useState<typeof cartItems>([]);

  const handleClose = () => {
    if (submitting) return;
    setErrorMsg(null);
    if (orderResult) {
      setOrderResult(null);
    }
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const name = customerName.trim();
    const phone = customerPhone.trim();
    const address = deliveryAddress.trim();

    if (!name) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!phone || phone.length < 8) {
      setErrorMsg('Please enter a valid phone or WhatsApp number.');
      return;
    }
    if (orderType === 'DELIVERY' && !address) {
      setErrorMsg('Please enter your complete delivery address.');
      return;
    }
    if (cartItems.length === 0) {
      setErrorMsg('Your cart is empty.');
      return;
    }

    try {
      setSubmitting(true);

      // Frontend safety timeout — if the service layer hangs beyond 25s, reset the UI.
      const timeoutId = setTimeout(() => {
        setSubmitting(false);
        setErrorMsg('Request timed out. Please check your connection and try again. Your cart is preserved.');
      }, 25_000);

      const { data, error } = await orderService.createCustomerOrder({
        customerName: name,
        customerPhone: phone,
        orderType,
        deliveryAddress: address,
        notes: notes.trim(),
        branchId: selectedBranch.id,
        items: cartItems,
      });

      clearTimeout(timeoutId);

      if (error || !data) {
        throw new Error(error?.message || 'Failed to create order. Please try again.');
      }

      // Snapshot items BEFORE clearing the cart so WhatsApp message can list them.
      setConfirmedItems([...cartItems]);
      // Successful order creation — cart clears only after confirmed success.
      clearCart();
      setOrderResult(data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppConfirm = () => {
    if (!orderResult) return;

    // Use confirmedItems (snapshot taken before clearCart) so the message is
    // never empty even though cartItems has already been cleared.
    const itemsForMessage = confirmedItems.length > 0 ? confirmedItems : [];

    const lines: string[] = [
      `Hi Dough N Cheese (${selectedBranch.name})!`,
      `I have placed an order online.`,
      ``,
      `*Order ID*: ${orderResult.orderNumber}`,
      `*Customer*: ${orderResult.order.customer_name}`,
      `*Phone*: ${orderResult.order.customer_phone}`,
      `*Status*: ${orderResult.order.status}`,
      `*Order Type*: ${orderType}`,
    ];

    if (orderType === 'DELIVERY' && deliveryAddress) {
      lines.push(`*Delivery Address*: ${deliveryAddress}`);
    }

    lines.push(``);
    lines.push(`*Items Summary*:`);
    itemsForMessage.forEach((i, idx) => {
      const sizeStr = i.selectedSize ? ` (${i.selectedSize})` : '';
      lines.push(`${idx + 1}. ${i.productName}${sizeStr} × ${i.quantity} (${formatPrice(i.lineTotal)})`);
    });

    lines.push(``);
    lines.push(`*Total Payable*: ${formatPrice(orderResult.order.total)}`);
    lines.push(`Branch: ${selectedBranch.name}`);
    lines.push(``);
    lines.push(`Please confirm that you have received this order.`);

    const encoded = encodeURIComponent(lines.join('\n'));
    const url = `https://wa.me/${selectedBranch.whatsapp}?text=${encoded}`;
    openWhatsApp(url);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink-950/85 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-ink-900 shadow-2xl"
          >
            {/* Confirmation Screen */}
            {orderResult ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-10 w-10" />
                </div>

                <span className="mt-4 inline-block rounded-full bg-primary-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary-400">
                  Order Received
                </span>

                <h2 className="mt-2 text-2xl font-bold text-ink-50">Thank You For Ordering!</h2>
                <p className="mt-1 text-sm text-ink-300">
                  Your order has been recorded into our kitchen system.
                </p>

                {/* Receipt Card */}
                <div className="mt-6 rounded-2xl border border-white/10 bg-ink-950/70 p-5 text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs text-ink-400">Order Reference</span>
                    <span className="font-mono text-sm font-bold text-primary-400">
                      {orderResult.orderNumber}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-400">Status</span>
                    <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-bold text-amber-400">
                      {orderResult.order.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-400">Branch</span>
                    <span className="font-semibold text-ink-200">{selectedBranch.name}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink-400">Order Type</span>
                    <span className="font-semibold text-ink-200">{orderType}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-3">
                    <span className="text-sm font-semibold text-ink-300">Total Amount</span>
                    <span className="text-lg font-bold text-primary-400">
                      {formatPrice(orderResult.order.total)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={handleWhatsAppConfirm}
                    className="btn-primary w-full justify-center py-3 text-sm font-bold shadow-lg shadow-primary-500/20"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Confirm via WhatsApp (Fast Tracking)</span>
                  </button>

                  <button
                    onClick={handleClose}
                    className="btn-secondary w-full justify-center py-2.5 text-xs text-ink-300 hover:text-white"
                  >
                    Done & Return to Menu
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout Form */
              <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-ink-50">Checkout Order</h2>
                      <p className="text-xs text-ink-400">
                        {selectedBranch.name} Kitchen Fulfillment
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-xs text-error-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  {/* Order Type Toggle */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-ink-400">
                      Order Fulfillment
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setOrderType('DELIVERY')}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                          orderType === 'DELIVERY'
                            ? 'border-primary-500 bg-primary-500/15 text-primary-400 shadow-sm shadow-primary-500/10'
                            : 'border-white/10 bg-white/5 text-ink-300 hover:border-white/20'
                        }`}
                      >
                        <Truck className="h-4 w-4" />
                        <span>Delivery</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrderType('PICKUP')}
                        className={`flex items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                          orderType === 'PICKUP'
                            ? 'border-primary-500 bg-primary-500/15 text-primary-400 shadow-sm shadow-primary-500/10'
                            : 'border-white/10 bg-white/5 text-ink-300 hover:border-white/20'
                        }`}
                      >
                        <Store className="h-4 w-4" />
                        <span>Store Pickup</span>
                      </button>
                    </div>
                  </div>

                  {/* Customer Name */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-300">
                      Full Name <span className="text-primary-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Ali Ahmed"
                        className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2.5 pl-9 pr-3 text-sm text-ink-50 placeholder-ink-600 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Customer Phone */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-300">
                      WhatsApp / Phone Number <span className="text-primary-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. 0300 1234567"
                        className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2.5 pl-9 pr-3 text-sm text-ink-50 placeholder-ink-600 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Delivery Address */}
                  {orderType === 'DELIVERY' && (
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold text-ink-300">
                        Complete Delivery Address <span className="text-primary-400">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-ink-500" />
                        <textarea
                          required={orderType === 'DELIVERY'}
                          rows={2}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House / Flat No., Street, Area, Landmark..."
                          className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2 pl-9 pr-3 text-sm text-ink-50 placeholder-ink-600 focus:border-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* Order Notes */}
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-ink-400">
                      Special Cooking / Delivery Notes (Optional)
                    </label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-3 h-4 w-4 text-ink-500" />
                      <textarea
                        rows={1}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Extra napkins, less spicy, call before arriving"
                        className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2 pl-9 pr-3 text-sm text-ink-50 placeholder-ink-600 focus:border-primary-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="mt-6 rounded-2xl border border-white/5 bg-ink-950/60 p-4 space-y-2">
                  <div className="flex items-center justify-between text-xs text-ink-400">
                    <span>Items ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})</span>
                    <span>{formatPrice(cartSubtotal + cartTotalSavings)}</span>
                  </div>

                  {cartTotalSavings > 0 && (
                    <div className="flex items-center justify-between text-xs font-semibold text-primary-300">
                      <span className="flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Promotional Savings
                      </span>
                      <span>-{formatPrice(cartTotalSavings)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-white/5 pt-2 text-sm font-bold">
                    <span className="text-ink-200">Total Payable</span>
                    <span className="text-base text-primary-400">{formatPrice(cartSubtotal)}</span>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="mt-6">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full justify-center py-3 text-sm font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying & Placing Order...</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="h-4 w-4" />
                        <span>Place Order — {formatPrice(cartSubtotal)}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
