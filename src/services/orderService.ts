import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/utils/withTimeout';
import type { CartItem } from '@/context/CartContext';
import type { DatabaseOrder, DatabaseOrderItem } from '@/types/database';
import { discountService, calculateDiscount, type PublicDiscount } from '@/services/discountService';

export type OrderType = 'DELIVERY' | 'PICKUP';

export type CheckoutFormPayload = {
  customerName: string;
  customerPhone: string;
  orderType: OrderType;
  deliveryAddress?: string;
  notes?: string;
  branchId: string;
  items: CartItem[];
};

export type OrderCreationResult = {
  order: DatabaseOrder;
  items: DatabaseOrderItem[];
  orderNumber: string;
};

export const orderService = {
  /**
   * Securely validates and persists a multi-item customer order in Supabase.
   * Performs server-grade catalog and discount re-verification to prevent price tampering.
   */
  async createCustomerOrder(
    payload: CheckoutFormPayload
  ): Promise<{ data: OrderCreationResult | null; error: Error | null }> {
    try {
      // 1. Basic validation
      const name = payload.customerName.trim();
      const phone = payload.customerPhone.trim();
      if (!name) throw new Error('Please provide your full name.');
      if (!phone) throw new Error('Please provide your contact phone / WhatsApp number.');
      if (payload.orderType === 'DELIVERY' && (!payload.deliveryAddress || !payload.deliveryAddress.trim())) {
        throw new Error('Please provide a complete delivery address for delivery orders.');
      }
      if (!payload.items || payload.items.length === 0) {
        throw new Error('Your cart is empty. Please add items before checking out.');
      }

      // 2. Resolve & verify Branch ID
      const branchQueryStart = Date.now();
      console.log('[orderService] Branch verification query started:', {
        branchIdRequested: payload.branchId,
        queryStartTime: new Date(branchQueryStart).toISOString(),
      });

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.branchId);
      let branchQuery = supabase
        .from('branches')
        .select('id, name, slug, is_active')
        .eq('is_active', true);

      if (isUuid) {
        branchQuery = branchQuery.eq('id', payload.branchId);
      } else {
        branchQuery = branchQuery.eq('slug', payload.branchId);
      }

      const { data: branchData, error: branchError } = await withTimeout(
        branchQuery.maybeSingle(),
        10_000,
        'Branch verification'
      );

      const branchQueryEnd = Date.now();
      console.log('[orderService] Branch verification query completed:', {
        branchIdRequested: payload.branchId,
        queryStartTime: new Date(branchQueryStart).toISOString(),
        queryCompletionTime: new Date(branchQueryEnd).toISOString(),
        durationMs: branchQueryEnd - branchQueryStart,
        returnedData: branchData,
        returnedError: branchError,
      });

      if (branchError) {
        throw new Error(`Branch verification failed: ${branchError.message}`);
      }

      let resolvedBranchId: string;

      if (branchData) {
        resolvedBranchId = branchData.id;
      } else {
        console.warn('[orderService] Branch identifier did not match, querying single active branch fallback...');
        const { data: fallbackBranch, error: fallbackError } = await withTimeout(
          supabase
            .from('branches')
            .select('id, name, slug, is_active')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle(),
          10_000,
          'Fallback branch lookup'
        );

        if (fallbackError) {
          throw new Error(`Fallback branch lookup failed: ${fallbackError.message}`);
        }

        if (!fallbackBranch) {
          throw new Error('Selected branch is unavailable.');
        }

        resolvedBranchId = fallbackBranch.id;
      }

      // 3. Fetch active discounts for re-verification
      const { data: activeDiscounts } = await discountService.getActiveDiscounts();

      // 4. Catalog Price Re-verification
      // Query database products to verify live prices
      const productSlugsOrIds = payload.items.map((i) => i.productId);
      const uuidList = productSlugsOrIds.filter((id) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );
      const slugList = productSlugsOrIds.filter(
        (id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      );

      type DbProductLookup = {
        id: string;
        name: string;
        slug: string;
        is_active: boolean;
        product_price_options: Array<{ id: string; label: string; price: number; is_active: boolean }>;
        categories: { id: string; name: string } | null;
      };

      const rawDbProducts: DbProductLookup[] = [];

      if (slugList.length > 0) {
        const { data: slugProducts, error: slugErr } = await withTimeout(
          supabase
            .from('products')
            .select(`
              id,
              name,
              slug,
              is_active,
              product_price_options ( id, label, price, is_active ),
              categories ( id, name )
            `)
            .in('slug', slugList),
          10_000,
          'Product price verification (by slug)'
        );
        if (slugErr) throw slugErr;
        if (slugProducts) rawDbProducts.push(...(slugProducts as unknown as DbProductLookup[]));
      }

      if (uuidList.length > 0) {
        const { data: idProducts, error: idErr } = await withTimeout(
          supabase
            .from('products')
            .select(`
              id,
              name,
              slug,
              is_active,
              product_price_options ( id, label, price, is_active ),
              categories ( id, name )
            `)
            .in('id', uuidList),
          10_000,
          'Product price verification (by id)'
        );
        if (idErr) throw idErr;
        if (idProducts) rawDbProducts.push(...(idProducts as unknown as DbProductLookup[]));
      }

      const dbProductMap = new Map<string, DbProductLookup>();
      if (rawDbProducts) {
        rawDbProducts.forEach((p) => {
          dbProductMap.set(p.slug, p);
          dbProductMap.set(p.id, p);
        });
      }

      // 5. Compute verified line items and totals
      let verifiedSubtotal = 0;
      let verifiedDiscount = 0;

      const verifiedLineItems = payload.items.map((cartItem) => {
        let verifiedBasePrice = cartItem.baseUnitPrice;
        let dbProductRecordId: string | null = null;
        let categoryName = cartItem.category;

        const dbProd = dbProductMap.get(cartItem.productId);
        if (dbProd) {
          dbProductRecordId = dbProd.id;
          if (dbProd.categories?.name) {
            categoryName = dbProd.categories.name;
          }

          if (cartItem.selectedSize && dbProd.product_price_options?.length) {
            const matchedOpt = dbProd.product_price_options.find(
              (o: { label: string; price: number }) =>
                o.label.toLowerCase() === cartItem.selectedSize?.toLowerCase()
            );
            if (matchedOpt) {
              verifiedBasePrice = Number(matchedOpt.price);
            }
          } else if (dbProd.product_price_options?.length === 1) {
            verifiedBasePrice = Number(dbProd.product_price_options[0].price);
          }
        }

        // Revalidate best discount for this item
        let unitDiscount = 0;
        if (activeDiscounts && activeDiscounts.length > 0) {
          const matching = activeDiscounts.filter((d: PublicDiscount) => {
            if (!d.is_active) return false;
            // Branch check
            if (d.discount_branches?.length) {
              if (!d.discount_branches.some((b) => b.branch_id === resolvedBranchId)) return false;
            }
            // Scope check
            if (d.scope === 'ALL_PRODUCTS') return true;
            if (d.scope === 'SELECTED_CATEGORIES') {
              return d.discount_categories?.some(
                (c) => c.category_id.toLowerCase() === categoryName.toLowerCase()
              );
            }
            if (d.scope === 'SELECTED_PRODUCTS') {
              return d.discount_products?.some(
                (p) => p.product_id === cartItem.productId || p.product_id === dbProductRecordId
              );
            }
            return false;
          });

          for (const d of matching) {
            const { discountAmount } = calculateDiscount(
              verifiedBasePrice,
              d.discount_type,
              Number(d.discount_value)
            );
            if (discountAmount > unitDiscount) {
              unitDiscount = discountAmount;
            }
          }
        }

        const finalUnit = Math.max(0, verifiedBasePrice - unitDiscount);
        const lineTotal = finalUnit * cartItem.quantity;
        const rawLineTotal = verifiedBasePrice * cartItem.quantity;

        verifiedSubtotal += rawLineTotal;
        verifiedDiscount += unitDiscount * cartItem.quantity;

        return {
          dbProductId: dbProductRecordId,
          productName: cartItem.productName,
          quantity: cartItem.quantity,
          verifiedUnit: finalUnit,
          lineTotal,
          selectedSize: cartItem.selectedSize || null,
          selectedVariants: cartItem.selectedVariants || {},
        };
      });

      const verifiedTotal = Math.max(0, verifiedSubtotal - verifiedDiscount);

      // 6. Structured Operational Notes
      const structuredNotes = [
        `[ORDER TYPE]: ${payload.orderType}`,
        `[DELIVERY ADDRESS]: ${payload.deliveryAddress?.trim() || 'N/A (Store Pickup)'}`,
        `[CUSTOMER NOTES]: ${payload.notes?.trim() || 'None'}`,
      ].join('\n');

      // 7. Insert Order Record (Strictly status = 'PENDING')
      const { data: orderData, error: orderError } = await withTimeout(
        supabase
          .from('orders')
          .insert({
            branch_id: resolvedBranchId,
            customer_name: name,
            customer_phone: phone,
            status: 'PENDING',
            subtotal: verifiedSubtotal,
            discount_amount: verifiedDiscount,
            total: verifiedTotal,
            notes: structuredNotes,
          })
          .select()
          .single(),
        10_000,
        'Order creation'
      );

      if (orderError || !orderData) {
        throw new Error(orderError?.message || 'Failed to initialize customer order.');
      }

      // 8. Insert Order Items Records
      const orderItemsPayload = verifiedLineItems.map((item) => ({
        order_id: orderData.id,
        product_id: item.dbProductId,
        product_name_snapshot: item.productName,
        quantity: item.quantity,
        unit_price: item.verifiedUnit,
        line_total: item.lineTotal,
        selected_size: item.selectedSize,
        selected_variants: item.selectedVariants,
      }));

      const { data: itemsData, error: itemsError } = await withTimeout(
        supabase
          .from('order_items')
          .insert(orderItemsPayload)
          .select(),
        10_000,
        'Order items insertion'
      );

      if (itemsError) {
        console.error('Order item insertion failed:', itemsError);
        throw new Error(`Order created but item recording failed: ${itemsError.message}`);
      }

      const orderNumber = `DNC-${orderData.id.slice(0, 6).toUpperCase()}`;

      return {
        data: {
          order: orderData as DatabaseOrder,
          items: (itemsData || []) as DatabaseOrderItem[],
          orderNumber,
        },
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to complete order checkout.'),
      };
    }
  },
};
