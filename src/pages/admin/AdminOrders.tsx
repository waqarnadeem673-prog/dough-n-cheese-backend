import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  RotateCw,
  ClipboardList,
  CheckCircle2,
  AlertCircle,
  Phone,
  MessageCircle,
  ChevronRight,
  X,
  ShoppingBag,
  MapPin,
  Clock,
  User,
  FileText,
  Sparkles,
  ArrowRight,
  Radio,
  ChefHat,
  LayoutList,
  Check,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  orderAdminService,
  type AdminOrderWithDetails,
  type OrderFilters,
  STATUS_LABELS,
  STATUS_BADGE_CLASSES,
  NEXT_STATUS_LABELS,
  getAllowedNextStatuses,
  isValidTransition,
} from '@/services/orderAdminService';
import { branchAdminService } from '@/services/branchAdminService';
import { useAdminOrdersRealtime, type RealtimeConnectionStatus } from '@/hooks/useAdminOrdersRealtime';
import type { DatabaseBranch, OrderStatus } from '@/types/database';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { formatPrice } from '@/utils/whatsapp';

// ==============================================================================
// Status Filter Tabs
// ==============================================================================
const STATUS_TABS = [
  'ALL',
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
] as const;

// Active kitchen order statuses
const KITCHEN_STATUSES: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
];

// ==============================================================================
// Helpers
// ==============================================================================
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-PK', { day: '2-digit', month: 'short' });
}

function parseOrderNotes(notes: string | null) {
  if (!notes) return { orderType: null, deliveryAddress: null, customerNotes: null };
  const get = (key: string) => {
    const match = notes.match(new RegExp(`\\[${key}\\]:\\s*(.+)`, 'i'));
    return match?.[1]?.trim() || null;
  };
  return {
    orderType: get('ORDER TYPE'),
    deliveryAddress: get('DELIVERY ADDRESS'),
    customerNotes: get('CUSTOMER NOTES'),
  };
}

// ==============================================================================
// Connection Status Pill
// ==============================================================================
function RealtimeIndicator({ status }: { status: RealtimeConnectionStatus }) {
  if (status === 'CONNECTED') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span>Live</span>
      </div>
    );
  }

  if (status === 'CONNECTING') {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
        <Radio className="h-3 w-3 animate-spin" />
        <span>Connecting…</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-ink-400">
      <span className="h-2 w-2 rounded-full bg-ink-600" />
      <span>Offline</span>
    </div>
  );
}

// ==============================================================================
// KPI Card
// ==============================================================================
function KpiCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: 'amber' | 'orange' | 'purple' | 'emerald';
}) {
  const colorMap = {
    amber: 'text-amber-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
  };
  return (
    <div className="rounded-2xl border border-white/5 bg-ink-900/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className={`mt-2 text-2xl font-black ${colorMap[color]}`}>{value}</p>
    </div>
  );
}

// ==============================================================================
// Status Badge
// ==============================================================================
function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// ==============================================================================
// Order Detail Drawer
// ==============================================================================
function OrderDetailDrawer({
  order,
  onClose,
  onStatusUpdate,
  onDeleteRequest,
}: {
  order: AdminOrderWithDetails;
  onClose: () => void;
  onStatusUpdate: (order: AdminOrderWithDetails, nextStatus: OrderStatus) => void;
  onDeleteRequest: (order: AdminOrderWithDetails) => void;
}) {
  const parsed = parseOrderNotes(order.notes);
  const allowedNext = getAllowedNextStatuses(order.status);
  const primaryNext = allowedNext.find((s) => s !== 'CANCELLED') as OrderStatus | undefined;
  const canCancel = allowedNext.includes('CANCELLED');

  const whatsappHref = `https://wa.me/${order.customer_phone.replace(/[^0-9]/g, '')}`;
  const telHref = `tel:${order.customer_phone.replace(/[^0-9+]/g, '')}`;

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-ink-950 shadow-2xl overflow-y-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
        <div>
          <p className="font-mono text-sm font-bold text-primary-400">{order.orderNumber}</p>
          <div className="mt-1">
            <StatusBadge status={order.status} />
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-ink-300 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 p-6">
        {/* Customer */}
        <section className="rounded-2xl border border-white/5 bg-ink-900/60 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Customer</p>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/15 text-primary-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-ink-50">{order.customer_name}</p>
              <p className="text-xs text-ink-400">{order.customer_phone}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <a
              href={telHref}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-ink-200 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/20"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              WhatsApp
            </a>
          </div>
        </section>

        {/* Fulfillment Details */}
        <section className="rounded-2xl border border-white/5 bg-ink-900/60 p-4 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">Fulfillment</p>

          <div className="flex items-start gap-2 text-xs">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary-400" />
            <div>
              <span className="font-semibold text-ink-200">
                {order.branches?.name ?? 'Unknown Branch'}
              </span>
              {parsed.orderType && (
                <span className="ml-2 rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-bold text-ink-300">
                  {parsed.orderType}
                </span>
              )}
            </div>
          </div>

          {parsed.deliveryAddress && parsed.deliveryAddress !== 'N/A (Store Pickup)' && (
            <p className="text-xs text-ink-400 pl-5">{parsed.deliveryAddress}</p>
          )}

          {parsed.customerNotes && parsed.customerNotes !== 'None' && (
            <div className="flex items-start gap-2 text-xs pt-1">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-500" />
              <p className="text-ink-400 italic">"{parsed.customerNotes}"</p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 text-[10px] text-ink-500">
            <Clock className="h-3 w-3" />
            <span>Placed {formatRelativeTime(order.created_at)}</span>
            {order.updated_at !== order.created_at && (
              <span>· Updated {formatRelativeTime(order.updated_at)}</span>
            )}
          </div>
        </section>

        {/* Items */}
        <section className="rounded-2xl border border-white/5 bg-ink-900/60 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Items ({order.order_items.length})
          </p>

          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-3 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-100 truncate">{item.product_name_snapshot}</p>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {item.selected_size && (
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary-300">
                      {item.selected_size}
                    </span>
                  )}
                  {Object.entries(item.selected_variants).map(([k, v]) => (
                    <span key={k} className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-ink-300">
                      {String(v)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-ink-100">
                  {formatPrice(item.line_total)}
                </p>
                <p className="text-ink-500">× {item.quantity}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Totals */}
        <section className="rounded-2xl border border-white/5 bg-ink-900/60 p-4 space-y-2">
          <div className="flex justify-between text-xs text-ink-400">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {Number(order.discount_amount) > 0 && (
            <div className="flex justify-between text-xs font-semibold text-primary-300">
              <span className="flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Discount
              </span>
              <span>−{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-white/5 pt-2 text-sm font-bold">
            <span className="text-ink-200">Total</span>
            <span className="text-primary-400">{formatPrice(order.total)}</span>
          </div>
        </section>

        {/* Status Actions */}
        {(primaryNext || canCancel) && (
          <section className="space-y-2.5">
            {primaryNext && (
              <button
                onClick={() => onStatusUpdate(order, primaryNext)}
                className="btn-primary w-full justify-center py-3 text-sm font-bold"
              >
                <ArrowRight className="h-4 w-4" />
                {NEXT_STATUS_LABELS[order.status] ?? `Move to ${STATUS_LABELS[primaryNext]}`}
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => onStatusUpdate(order, 'CANCELLED')}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-error-500/30 bg-error-500/10 py-2.5 text-xs font-bold text-error-400 transition-colors hover:bg-error-500/20"
              >
                Cancel Order
              </button>
            )}
          </section>
        )}

        {!primaryNext && !canCancel && (
          <div className="rounded-xl border border-white/5 bg-white/5 p-3 text-center text-xs text-ink-400">
            This order is <strong className="text-ink-200">{STATUS_LABELS[order.status]}</strong> and
            cannot be changed further.
          </div>
        )}

        {/* Delete Order Action */}
        <div className="border-t border-white/5 pt-2">
          <button
            type="button"
            onClick={() => onDeleteRequest(order)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-error-500/20 bg-error-500/5 py-2.5 text-xs font-semibold text-error-400 transition-colors hover:border-error-500/40 hover:bg-error-500/15"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Order</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ==============================================================================
// Kitchen Queue Card
// ==============================================================================
function KitchenCard({
  order,
  actionLoading,
  onStatusUpdate,
  onClick,
}: {
  order: AdminOrderWithDetails;
  actionLoading: boolean;
  onStatusUpdate: (order: AdminOrderWithDetails, nextStatus: OrderStatus) => void;
  onClick: () => void;
}) {
  const parsed = parseOrderNotes(order.notes);
  const allowedNext = getAllowedNextStatuses(order.status);
  const primaryNext = allowedNext.find((s) => s !== 'CANCELLED') as OrderStatus | undefined;
  const isPending = order.status === 'PENDING';

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between overflow-hidden rounded-2xl border p-4 transition-all cursor-pointer ${
        isPending
          ? 'border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60'
          : 'border-white/5 bg-ink-900/60 hover:border-white/10'
      }`}
    >
      <div>
        {/* Top bar: Order ID, Elapsed, Status */}
        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-primary-400">
              {order.orderNumber}
            </span>
            <StatusBadge status={order.status} />
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-ink-400">
            <Clock className="h-3 w-3 text-ink-500" />
            <span>{formatRelativeTime(order.created_at)}</span>
          </div>
        </div>

        {/* Customer & Branch */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-ink-300">
          <span className="font-semibold text-ink-100">{order.customer_name}</span>
          {order.branches?.name && (
            <span className="text-[11px] text-ink-400">{order.branches.name}</span>
          )}
        </div>

        {/* Notes (e.g. Delivery / Pickup, special instructions) */}
        {parsed.orderType && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-400">
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-semibold text-ink-300">
              {parsed.orderType}
            </span>
            {parsed.deliveryAddress && parsed.deliveryAddress !== 'N/A (Store Pickup)' && (
              <span className="truncate">{parsed.deliveryAddress}</span>
            )}
          </div>
        )}

        {parsed.customerNotes && parsed.customerNotes !== 'None' && (
          <div className="mt-1.5 rounded-lg border border-primary-500/20 bg-primary-500/5 p-2 text-xs italic text-primary-300">
            "{parsed.customerNotes}"
          </div>
        )}

        {/* Items Checklist for Kitchen Staff */}
        <div className="mt-3 space-y-1.5 rounded-xl border border-white/5 bg-ink-950/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-500">
            Order Items ({order.order_items.length})
          </p>
          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-ink-50">
                  {item.quantity}× {item.product_name_snapshot}
                </span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.selected_size && (
                    <span className="rounded bg-white/10 px-1 text-[10px] font-bold text-primary-300">
                      {item.selected_size}
                    </span>
                  )}
                  {Object.entries(item.selected_variants).map(([k, v]) => (
                    <span key={k} className="rounded bg-white/5 px-1 text-[10px] text-ink-400">
                      {String(v)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Quick Action */}
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3" onClick={(e) => e.stopPropagation()}>
        <span className="font-extrabold text-ink-100">{formatPrice(order.total)}</span>
        {primaryNext ? (
          <button
            disabled={actionLoading}
            onClick={() => onStatusUpdate(order, primaryNext)}
            className="flex items-center gap-1.5 rounded-xl bg-primary-500 px-3 py-1.5 text-xs font-bold text-ink-950 transition-all hover:bg-primary-400 active:scale-95 disabled:opacity-50"
          >
            <Check className="h-3.5 w-3.5" />
            <span>{NEXT_STATUS_LABELS[order.status] ?? STATUS_LABELS[primaryNext]}</span>
          </button>
        ) : (
          <span className="text-xs text-ink-500">No actions</span>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// Main AdminOrders Page
// ==============================================================================
export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrderWithDetails[]>([]);
  const [branches, setBranches] = useState<DatabaseBranch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // View Mode: 'TABLE' or 'KITCHEN'
  const [viewMode, setViewMode] = useState<'TABLE' | 'KITCHEN'>('TABLE');

  // Filters
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_TABS[number]>('ALL');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');

  // UI state
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderWithDetails | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{
    order: AdminOrderWithDetails;
    nextStatus: OrderStatus;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminOrderWithDetails | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============================================================================
  // Data loading
  // ============================================================================
  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setErrorMessage(null);

    try {
      const filters: OrderFilters = {
        status: statusFilter === 'ALL' ? 'ALL' : (statusFilter as OrderStatus),
        branchId: branchFilter,
        search: search.trim() || undefined,
        limit: 200,
      };

      const [ordersRes, branchesRes] = await Promise.all([
        orderAdminService.getOrders(filters),
        branchAdminService.getAllBranches(),
      ]);

      if (ordersRes.error) setErrorMessage('Failed to load orders: ' + ordersRes.error.message);
      else setOrders(ordersRes.data);

      if (!branchesRes.error) setBranches(branchesRes.data);
    } catch {
      setErrorMessage('Unexpected error loading orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, branchFilter, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // ============================================================================
  // Real-time Order Subscription
  // ============================================================================
  const handleRealtimeNewOrder = useCallback((newOrder: AdminOrderWithDetails) => {
    setOrders((prev) => {
      // Prevent duplicates
      if (prev.some((o) => o.id === newOrder.id)) {
        return prev.map((o) => (o.id === newOrder.id ? newOrder : o));
      }
      return [newOrder, ...prev];
    });

    setNotification(
      `✨ New order received: ${newOrder.orderNumber} from ${newOrder.customer_name} (${formatPrice(newOrder.total)})`
    );
  }, []);

  const handleRealtimeOrderUpdated = useCallback((updatedOrder: AdminOrderWithDetails) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );

    // Update detail drawer in real-time if open
    setSelectedOrder((current) =>
      current?.id === updatedOrder.id ? updatedOrder : current
    );
  }, []);

  const handleRealtimeOrderDeleted = useCallback((orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setSelectedOrder((current) => (current?.id === orderId ? null : current));
  }, []);

  const handleRealtimeReconnected = useCallback(() => {
    // Reconcile and fetch full dataset upon reconnection
    loadData(true);
  }, [loadData]);

  const { status: connectionStatus } = useAdminOrdersRealtime({
    enabled: true,
    onNewOrder: handleRealtimeNewOrder,
    onOrderUpdated: handleRealtimeOrderUpdated,
    onOrderDeleted: handleRealtimeOrderDeleted,
    onReconnected: handleRealtimeReconnected,
  });

  // ============================================================================
  // KPIs (computed from loaded orders – zero extra DB query)
  // ============================================================================
  const kpis = useMemo(() => orderAdminService.computeKPIs(orders), [orders]);

  // ============================================================================
  // Client-side filtering & Kitchen Queue filtering
  // ============================================================================
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (viewMode === 'KITCHEN') {
        // Kitchen mode focuses on active orders
        if (!KITCHEN_STATUSES.includes(o.status)) return false;
      }

      if (statusFilter !== 'ALL' && o.status !== statusFilter) return false;
      if (branchFilter !== 'ALL' && o.branch_id !== branchFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        return (
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q) ||
          o.orderNumber.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orders, viewMode, statusFilter, branchFilter, search]);

  // ============================================================================
  // Status update handler
  // ============================================================================
  const handleStatusAction = (order: AdminOrderWithDetails, nextStatus: OrderStatus) => {
    if (nextStatus === 'CANCELLED') {
      setCancelTarget({ order, nextStatus });
    } else {
      performStatusUpdate(order, nextStatus);
    }
  };

  const performStatusUpdate = async (order: AdminOrderWithDetails, nextStatus: OrderStatus) => {
    if (!isValidTransition(order.status, nextStatus)) {
      setErrorMessage(`Cannot transition from ${STATUS_LABELS[order.status]} to ${STATUS_LABELS[nextStatus]}.`);
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);

    const { success, order: updated, error } = await orderAdminService.updateOrderStatus(
      order.id,
      nextStatus
    );

    setActionLoading(false);
    setCancelTarget(null);

    if (!success || !updated) {
      setErrorMessage(error?.message ?? 'Failed to update order status.');
      return;
    }

    // Update list in-place
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));

    // Update detail drawer if open
    if (selectedOrder?.id === updated.id) setSelectedOrder(updated);

    setNotification(`Order ${updated.orderNumber} moved to ${STATUS_LABELS[nextStatus]}.`);
  };

  // ============================================================================
  // Delete handler
  // ============================================================================
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setDeleteLoading(true);
    setErrorMessage(null);

    const targetId = deleteTarget.id;
    const targetOrderNumber = deleteTarget.orderNumber;

    const { success, error } = await orderAdminService.deleteOrder(targetId);

    setDeleteLoading(false);

    if (!success) {
      setErrorMessage(error?.message ?? 'Failed to delete order.');
      return;
    }

    // Success:
    // 1. Close confirm dialog
    setDeleteTarget(null);

    // 2. Close detail drawer if the deleted order is currently open
    setSelectedOrder((current) => (current?.id === targetId ? null : current));

    // 3. Remove deleted order from orders state immediately (KPIs recompute via useMemo)
    setOrders((prev) => prev.filter((o) => o.id !== targetId));

    // 4. Show success notification toast
    setNotification(`Order ${targetOrderNumber} deleted successfully.`);
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex min-h-0 flex-col">
      {/* ====================================================================== */}
      {/* PAGE HEADER                                                             */}
      {/* ====================================================================== */}
      <div className="border-b border-white/5 bg-ink-900/40 px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500/15 text-primary-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-ink-50">Orders</h1>
                <RealtimeIndicator status={connectionStatus} />
              </div>
              <p className="text-xs text-ink-400">
                {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'} shown
                {viewMode === 'KITCHEN' && ' (Active Kitchen Queue)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-white/10 bg-ink-950/80 p-1 text-xs">
              <button
                onClick={() => setViewMode('TABLE')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                  viewMode === 'TABLE'
                    ? 'bg-primary-500 text-ink-950'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span>Orders List</span>
              </button>
              <button
                onClick={() => setViewMode('KITCHEN')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                  viewMode === 'KITCHEN'
                    ? 'bg-primary-500 text-ink-950'
                    : 'text-ink-400 hover:text-ink-200'
                }`}
              >
                <ChefHat className="h-3.5 w-3.5" />
                <span>Kitchen View</span>
              </button>
            </div>

            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* ==================================================================== */}
        {/* NOTIFICATIONS & TOASTS                                                */}
        {/* ==================================================================== */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-6 mt-4 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-400 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{notification}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-emerald-300 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-error-500/30 bg-error-500/10 p-3 text-xs font-semibold text-error-400"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="ml-auto text-error-300 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ==================================================================== */}
        {/* KPI CARDS                                                             */}
        {/* ==================================================================== */}
        {!loading && (
          <div className="grid grid-cols-2 gap-3 px-6 pt-4 lg:grid-cols-4">
            <KpiCard label="Pending" value={kpis.pending} color="amber" />
            <KpiCard label="Preparing" value={kpis.preparing} color="orange" />
            <KpiCard label="Out for Delivery" value={kpis.outForDelivery} color="purple" />
            <KpiCard
              label="Today's Revenue"
              value={formatPrice(kpis.todayRevenue)}
              color="emerald"
            />
          </div>
        )}

        {/* ==================================================================== */}
        {/* FILTERS                                                               */}
        {/* ==================================================================== */}
        <div className="space-y-3 px-6 pt-4">
          {/* Status Tabs (Hidden or dimmed in Kitchen mode to keep focus on active queue) */}
          {viewMode === 'TABLE' && (
            <div className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-bold transition-all ${
                    statusFilter === tab
                      ? 'border-primary-500 bg-primary-500/15 text-primary-400'
                      : 'border-white/10 bg-white/5 text-ink-400 hover:border-white/20 hover:text-ink-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : STATUS_LABELS[tab as OrderStatus]}
                </button>
              ))}
            </div>
          )}

          {/* Search + Branch Row */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or reference…"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2 pl-9 pr-3 text-sm text-ink-50 placeholder-ink-600 focus:border-primary-500 focus:outline-none"
              />
            </div>

            {branches.length > 1 && (
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="rounded-xl border border-white/10 bg-ink-950/80 px-3 py-2 text-sm text-ink-200 focus:border-primary-500 focus:outline-none sm:w-48"
              >
                <option value="ALL">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* ORDER CONTENT (LIST VIEW OR KITCHEN VIEW)                             */}
        {/* ==================================================================== */}
        <div className="mt-4 flex-1 overflow-y-auto px-6 pb-8">
          {loading ? (
            <div className="space-y-3 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-20 animate-pulse rounded-2xl border border-white/5 bg-ink-900/60"
                />
              ))}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-ink-500">
                {viewMode === 'KITCHEN' ? (
                  <ChefHat className="h-7 w-7" />
                ) : (
                  <ClipboardList className="h-7 w-7" />
                )}
              </div>
              <h3 className="mt-4 text-base font-bold text-ink-200">
                {viewMode === 'KITCHEN' ? 'Kitchen queue is empty' : 'No orders found'}
              </h3>
              <p className="mt-1 text-xs text-ink-400">
                {viewMode === 'KITCHEN'
                  ? 'Active orders will appear here automatically in real time.'
                  : search || statusFilter !== 'ALL' || branchFilter !== 'ALL'
                  ? 'Try adjusting your filters or search term.'
                  : 'Customer orders will appear here once placed.'}
              </p>
            </div>
          ) : viewMode === 'KITCHEN' ? (
            /* Kitchen Grid View */
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredOrders.map((order) => (
                <KitchenCard
                  key={order.id}
                  order={order}
                  actionLoading={actionLoading}
                  onStatusUpdate={handleStatusAction}
                  onClick={() => setSelectedOrder(order)}
                />
              ))}
            </div>
          ) : (
            /* Standard Table List View */
            <div className="space-y-2.5">
              {filteredOrders.map((order) => {
                const parsed = parseOrderNotes(order.notes);
                const allowedNext = getAllowedNextStatuses(order.status);
                const primaryNext = allowedNext.find((s) => s !== 'CANCELLED') as OrderStatus | undefined;

                return (
                  <div
                    key={order.id}
                    className="group relative overflow-hidden rounded-2xl border border-white/5 bg-ink-900/60 p-4 transition-colors hover:border-white/10 cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: Order info */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary-400">
                            {order.orderNumber}
                          </span>
                          <StatusBadge status={order.status} />
                          {parsed.orderType && (
                            <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-semibold text-ink-400">
                              {parsed.orderType}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                          <span className="flex items-center gap-1 font-semibold text-ink-100">
                            <User className="h-3 w-3 text-ink-500" />
                            {order.customer_name}
                          </span>
                          <span className="text-ink-400">{order.customer_phone}</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
                          {order.branches?.name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {order.branches.name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            {order.order_items.length}{' '}
                            {order.order_items.length === 1 ? 'item' : 'items'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(order.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Right: total + action */}
                      <div
                        className="flex shrink-0 flex-col items-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-sm font-black text-primary-400">
                          {formatPrice(order.total)}
                        </p>
                        {primaryNext && (
                          <button
                            disabled={actionLoading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusAction(order, primaryNext);
                            }}
                            className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-2.5 py-1 text-[10px] font-bold text-primary-400 transition-colors hover:bg-primary-500/20 disabled:opacity-50"
                          >
                            {NEXT_STATUS_LABELS[order.status] ?? STATUS_LABELS[primaryNext]}
                          </button>
                        )}
                        <ChevronRight className="h-4 w-4 text-ink-600 group-hover:text-ink-400 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ====================================================================== */}
      {/* ORDER DETAIL DRAWER                                                     */}
      {/* ====================================================================== */}
      <AnimatePresence>
        {selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-ink-950/60 backdrop-blur-sm"
              onClick={() => setSelectedOrder(null)}
            />
            <OrderDetailDrawer
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onStatusUpdate={handleStatusAction}
              onDeleteRequest={(order) => setDeleteTarget(order)}
            />
          </>
        )}
      </AnimatePresence>

      {/* ====================================================================== */}
      {/* CANCEL CONFIRM DIALOG                                                   */}
      {/* ====================================================================== */}
      <ConfirmDialog
        isOpen={!!cancelTarget}
        title="Cancel This Order?"
        message={`This will move order ${cancelTarget?.order.orderNumber ?? ''} to CANCELLED. This action cannot be undone.`}
        confirmLabel="Yes, Cancel Order"
        cancelLabel="Keep Order"
        isDestructive
        isLoading={actionLoading}
        onConfirm={() => {
          if (cancelTarget) performStatusUpdate(cancelTarget.order, 'CANCELLED');
        }}
        onClose={() => setCancelTarget(null)}
      />

      {/* ====================================================================== */}
      {/* DELETE CONFIRM DIALOG                                                   */}
      {/* ====================================================================== */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Order?"
        message="This will permanently delete this order and its associated order items. This action cannot be undone."
        confirmLabel="Delete Order"
        cancelLabel="Cancel"
        isDestructive
        isLoading={deleteLoading}
        onConfirm={handleConfirmDelete}
        onClose={() => {
          if (!deleteLoading) setDeleteTarget(null);
        }}
      />
    </div>
  );
}
