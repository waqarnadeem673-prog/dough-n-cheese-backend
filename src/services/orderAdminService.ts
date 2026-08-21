import { supabase } from '@/lib/supabase';
import type { DatabaseOrder, DatabaseOrderItem, OrderStatus, DatabaseBranch } from '@/types/database';

// ==============================================================================
// Types
// ==============================================================================

export type AdminOrderItem = DatabaseOrderItem & {
  selected_variants: Record<string, string>;
};

export type AdminOrderWithDetails = DatabaseOrder & {
  branches: Pick<DatabaseBranch, 'id' | 'name' | 'phone' | 'whatsapp_number'> | null;
  order_items: AdminOrderItem[];
  /** Short human-readable reference e.g. "DNC-A1B2C3" */
  orderNumber: string;
};

export type OrderFilters = {
  status?: OrderStatus | 'ALL';
  branchId?: string | 'ALL';
  search?: string;
  limit?: number;
};

// ==============================================================================
// Allowed status transition graph
// ==============================================================================

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PREPARING', 'CANCELLED'],
  PREPARING:        ['OUT_FOR_DELIVERY', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED:        [],
  CANCELLED:        [],
};

export function getAllowedNextStatuses(current: OrderStatus): OrderStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? [];
}

export function isValidTransition(from: OrderStatus, to: OrderStatus): boolean {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

// ==============================================================================
// Label / badge helpers
// ==============================================================================

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING:          'Pending',
  CONFIRMED:        'Confirmed',
  PREPARING:        'Preparing',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  COMPLETED:        'Completed',
  CANCELLED:        'Cancelled',
};

export const STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  PENDING:          'bg-amber-500/15 text-amber-400 border-amber-500/25',
  CONFIRMED:        'bg-blue-500/15 text-blue-400 border-blue-500/25',
  PREPARING:        'bg-orange-500/15 text-orange-400 border-orange-500/25',
  OUT_FOR_DELIVERY: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  COMPLETED:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  CANCELLED:        'bg-error-500/15 text-error-400 border-error-500/25',
};

export const NEXT_STATUS_LABELS: Partial<Record<OrderStatus, string>> = {
  PENDING:          'Confirm Order',
  CONFIRMED:        'Start Preparing',
  PREPARING:        'Mark Out for Delivery',
  OUT_FOR_DELIVERY: 'Mark Completed',
};

function buildOrderNumber(id: string): string {
  return `DNC-${id.slice(0, 6).toUpperCase()}`;
}

function normaliseOrder(raw: Record<string, unknown>): AdminOrderWithDetails {
  return {
    ...(raw as unknown as DatabaseOrder),
    branches: (raw.branches as AdminOrderWithDetails['branches']) ?? null,
    order_items: ((raw.order_items as AdminOrderItem[]) ?? []).map((item) => ({
      ...item,
      selected_variants: (item.selected_variants as Record<string, string>) ?? {},
    })),
    orderNumber: buildOrderNumber(raw.id as string),
  };
}

// ==============================================================================
// Service
// ==============================================================================

export const orderAdminService = {
  /**
   * Fetch a filtered, joined list of orders (max 150 by default, newest first).
   * Single query – no N+1.
   */
  async getOrders(
    filters: OrderFilters = {}
  ): Promise<{ data: AdminOrderWithDetails[]; error: Error | null }> {
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          branch_id,
          customer_name,
          customer_phone,
          status,
          subtotal,
          discount_amount,
          total,
          notes,
          created_at,
          updated_at,
          branches ( id, name, phone, whatsapp_number ),
          order_items (
            id,
            order_id,
            product_id,
            product_name_snapshot,
            quantity,
            unit_price,
            line_total,
            selected_size,
            selected_variants,
            created_at
          )
        `)
        .order('created_at', { ascending: false })
        .limit(filters.limit ?? 150);

      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }

      if (filters.branchId && filters.branchId !== 'ALL') {
        query = query.eq('branch_id', filters.branchId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const orders = (data as unknown as Record<string, unknown>[]).map(normaliseOrder);

      // Client-side search filter (name, phone, order reference)
      const { search } = filters;
      const filtered =
        search && search.trim()
          ? orders.filter((o) => {
              const q = search.toLowerCase().trim();
              return (
                o.customer_name.toLowerCase().includes(q) ||
                o.customer_phone.includes(q) ||
                o.orderNumber.toLowerCase().includes(q) ||
                o.id.toLowerCase().includes(q)
              );
            })
          : orders;

      return { data: filtered, error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to load orders'),
      };
    }
  },

  /**
   * Fetch a single order with all details and items.
   */
  async getOrderById(
    orderId: string
  ): Promise<{ data: AdminOrderWithDetails | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          branch_id,
          customer_name,
          customer_phone,
          status,
          subtotal,
          discount_amount,
          total,
          notes,
          created_at,
          updated_at,
          branches ( id, name, phone, whatsapp_number ),
          order_items (
            id,
            order_id,
            product_id,
            product_name_snapshot,
            quantity,
            unit_price,
            line_total,
            selected_size,
            selected_variants,
            created_at
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      return {
        data: normaliseOrder(data as unknown as Record<string, unknown>),
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to load order details'),
      };
    }
  },

  /**
   * Securely update order status.
   * - Re-fetches the current status from the database before applying the update
   *   to guard against race conditions from concurrent admin sessions.
   * - Rejects any transition that is not in the allowed graph.
   */
  async updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus
  ): Promise<{ success: boolean; order: AdminOrderWithDetails | null; error: Error | null }> {
    try {
      // 1. Fetch current status directly from DB to prevent stale-state transitions
      const { data: current, error: fetchError } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (fetchError || !current) {
        throw new Error('Order not found or cannot be read.');
      }

      const currentStatus = current.status as OrderStatus;

      // 2. Validate transition server-side
      if (!isValidTransition(currentStatus, nextStatus)) {
        throw new Error(
          `Invalid status transition: ${STATUS_LABELS[currentStatus]} → ${STATUS_LABELS[nextStatus]}. ` +
          `Allowed from ${STATUS_LABELS[currentStatus]}: ` +
          (getAllowedNextStatuses(currentStatus).map((s) => STATUS_LABELS[s]).join(', ') || 'None')
        );
      }

      // 3. Apply update
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: nextStatus })
        .eq('id', orderId)
        // Additional safety: only update if status is still what we fetched (optimistic lock)
        .eq('status', currentStatus);

      if (updateError) throw updateError;

      // 4. Return the refreshed order
      const { data: updated, error: refetchError } = await orderAdminService.getOrderById(orderId);
      if (refetchError) throw refetchError;

      return { success: true, order: updated, error: null };
    } catch (err) {
      return {
        success: false,
        order: null,
        error: err instanceof Error ? err : new Error('Failed to update order status'),
      };
    }
  },

  /**
   * Permanently delete an order by UUID.
   * Associated order_items records are deleted automatically via PostgreSQL ON DELETE CASCADE.
   */
  async deleteOrder(orderId: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      if (!orderId || !orderId.trim()) {
        throw new Error('Order ID is required.');
      }

      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to delete order'),
      };
    }
  },

  /**
   * Compute KPI summary metrics from a pre-loaded order list.
   * Avoids a second database round-trip.
   */
  computeKPIs(orders: AdminOrderWithDetails[]) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    let pending = 0;
    let preparing = 0;
    let outForDelivery = 0;
    let todayRevenue = 0;

    for (const o of orders) {
      if (o.status === 'PENDING') pending++;
      if (o.status === 'PREPARING') preparing++;
      if (o.status === 'OUT_FOR_DELIVERY') outForDelivery++;
      if (o.status === 'COMPLETED' && new Date(o.created_at) >= todayStart) {
        todayRevenue += Number(o.total);
      }
    }

    return { pending, preparing, outForDelivery, todayRevenue };
  },
};
