import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  discountService,
  calculateDiscount,
  type PublicDiscount,
} from '@/services/discountService';
import type { Product } from '@/types';

export type ProductDiscountMatch = {
  discount: PublicDiscount;
  discountName: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  badgeLabel: string;
  calculate: (basePrice: number) => { finalPrice: number; discountAmount: number };
};

export function useActiveDiscounts() {
  const [discounts, setDiscounts] = useState<PublicDiscount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchDiscounts = useCallback(async () => {
    try {
      const { data, error } = await discountService.getActiveDiscounts();
      if (!error && data) {
        setDiscounts(data);
      }
    } catch {
      setDiscounts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  /**
   * Find the most advantageous applicable discount for a given product and branch.
   * Handles ALL_PRODUCTS, SELECTED_CATEGORIES, and SELECTED_PRODUCTS.
   * Universal branches vs. branch-specific targeting.
   */
  const getProductDiscount = useCallback(
    (product: Product, branchId: string): ProductDiscountMatch | null => {
      if (!discounts.length) return null;

      const now = new Date();

      // 1. Filter valid candidates
      const matchingDiscounts = discounts.filter((d) => {
        if (!d.is_active) return false;
        if (d.starts_at && new Date(d.starts_at) > now) return false;
        if (d.ends_at && new Date(d.ends_at) < now) return false;

        // Branch check: universal (empty discount_branches) or explicitly includes branchId
        if (d.discount_branches && d.discount_branches.length > 0) {
          const branchMatch = d.discount_branches.some((b) => b.branch_id === branchId);
          if (!branchMatch) return false;
        }

        // Scope check
        if (d.scope === 'ALL_PRODUCTS') {
          return true;
        }

        if (d.scope === 'SELECTED_CATEGORIES') {
          // Category matching
          if (d.discount_categories && d.discount_categories.length > 0) {
            return d.discount_categories.some(
              (c) => c.category_id.toLowerCase() === product.category.toLowerCase()
            );
          }
          return false;
        }

        if (d.scope === 'SELECTED_PRODUCTS') {
          // Product matching (by id or slug)
          if (d.discount_products && d.discount_products.length > 0) {
            return d.discount_products.some(
              (p) => p.product_id === product.id || p.product_id === product.name
            );
          }
          return false;
        }

        return false;
      });

      if (!matchingDiscounts.length) return null;

      // 2. Determine representative test price
      const testPrice =
        product.price ?? (product.priceOptions && product.priceOptions.length > 0
          ? product.priceOptions[0].price
          : 1000);

      // 3. Find the best discount yielding maximum savings
      let bestDiscount: PublicDiscount = matchingDiscounts[0];
      let maxSavings = -1;

      for (const d of matchingDiscounts) {
        const { discountAmount } = calculateDiscount(
          testPrice,
          d.discount_type,
          Number(d.discount_value)
        );
        if (discountAmount > maxSavings) {
          maxSavings = discountAmount;
          bestDiscount = d;
        }
      }

      const discountType = bestDiscount.discount_type;
      const discountValue = Number(bestDiscount.discount_value);
      const badgeLabel =
        discountType === 'PERCENTAGE'
          ? `${discountValue}% OFF`
          : `Rs. ${discountValue} OFF`;

      return {
        discount: bestDiscount,
        discountName: bestDiscount.title,
        discountType,
        discountValue,
        badgeLabel,
        calculate: (basePrice: number) =>
          calculateDiscount(basePrice, discountType, discountValue),
      };
    },
    [discounts]
  );

  return useMemo(
    () => ({
      discounts,
      loading,
      getProductDiscount,
      refresh: fetchDiscounts,
    }),
    [discounts, loading, getProductDiscount, fetchDiscounts]
  );
}
