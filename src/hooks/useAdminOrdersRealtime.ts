import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import {
  orderAdminService,
  type AdminOrderWithDetails,
} from '@/services/orderAdminService';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type RealtimeConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

type UseAdminOrdersRealtimeOptions = {
  enabled?: boolean;
  onNewOrder: (order: AdminOrderWithDetails) => void;
  onOrderUpdated: (order: AdminOrderWithDetails) => void;
  onOrderDeleted?: (orderId: string) => void;
  onReconnected?: () => void;
};

/**
 * Hook to subscribe to real-time PostgreSQL INSERT, UPDATE, and DELETE events on the `orders` table.
 * - Respects Supabase RLS (only authorized admin roles receive payloads).
 * - Avoids duplicate subscriptions and memory leaks.
 * - Handles connection loss, restoration, and reconciliation.
 */
export function useAdminOrdersRealtime({
  enabled = true,
  onNewOrder,
  onOrderUpdated,
  onOrderDeleted,
  onReconnected,
}: UseAdminOrdersRealtimeOptions) {
  const [status, setStatus] = useState<RealtimeConnectionStatus>('CONNECTING');
  
  // Stable refs for callbacks to prevent re-subscribing when parent re-renders
  const onNewOrderRef = useRef(onNewOrder);
  onNewOrderRef.current = onNewOrder;

  const onOrderUpdatedRef = useRef(onOrderUpdated);
  onOrderUpdatedRef.current = onOrderUpdated;

  const onOrderDeletedRef = useRef(onOrderDeleted);
  onOrderDeletedRef.current = onOrderDeleted;

  const onReconnectedRef = useRef(onReconnected);
  onReconnectedRef.current = onReconnected;

  const wasDisconnectedRef = useRef(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Fetch full order data for an ID (to get joined branches and order_items)
  const fetchAndDispatch = useCallback(async (orderId: string, eventType: 'INSERT' | 'UPDATE') => {
    try {
      const { data, error } = await orderAdminService.getOrderById(orderId);
      if (error || !data) {
        return;
      }

      if (eventType === 'INSERT') {
        onNewOrderRef.current(data);
      } else {
        onOrderUpdatedRef.current(data);
      }
    } catch {
      // Gracefully ignore transient fetch errors
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setStatus('DISCONNECTED');
      return;
    }

    setStatus('CONNECTING');

    const channelName = `admin-orders-stream-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            fetchAndDispatch(String(payload.new.id), 'INSERT');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            fetchAndDispatch(String(payload.new.id), 'UPDATE');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
            onOrderDeletedRef.current?.(String(payload.old.id));
          }
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('CONNECTED');
          if (wasDisconnectedRef.current) {
            wasDisconnectedRef.current = false;
            onReconnectedRef.current?.();
          }
        } else if (
          subscribeStatus === 'CHANNEL_ERROR' ||
          subscribeStatus === 'TIMED_OUT' ||
          subscribeStatus === 'CLOSED'
        ) {
          wasDisconnectedRef.current = true;
          setStatus('DISCONNECTED');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, fetchAndDispatch]);

  return { status };
}
