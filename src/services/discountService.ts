import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/utils/withTimeout';
import type { DatabaseDiscount, DiscountType } from '@/types/database';

export type PublicDiscount = DatabaseDiscount & {
  discount_branches: Array<{ branch_id: string }>;
  discount_categories: Array<{ category_id: string }>;
  discount_products: Array<{ product_id: string }>;
};

/**
 * Calculate discounted price and amount saved
 */
export function calculateDiscount(
  basePrice: number,
  discountType: DiscountType,
  discountValue: number
): { finalPrice: number; discountAmount: number } {
  if (basePrice <= 0 || discountValue <= 0) {
    return { finalPrice: basePrice, discountAmount: 0 };
  }

  let discountAmount = 0;

  if (discountType === 'PERCENTAGE') {
    const pct = Math.min(100, Math.max(0, discountValue));
    discountAmount = Math.round((basePrice * pct) / 100);
  } else {
    discountAmount = Math.min(basePrice, discountValue);
  }

  const finalPrice = Math.max(0, basePrice - discountAmount);
  return { finalPrice, discountAmount };
}

/**
 * Evaluate status label for a discount (Active, Scheduled, Expired, Inactive)
 */
export function getDiscountStatus(discount: {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}): {
  status: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' | 'INACTIVE';
  label: string;
  badgeClass: string;
} {
  if (!discount.is_active) {
    return {
      status: 'INACTIVE',
      label: 'Inactive',
      badgeClass: 'bg-ink-800 text-ink-400',
    };
  }

  const now = new Date();

  if (discount.starts_at && new Date(discount.starts_at) > now) {
    return {
      status: 'SCHEDULED',
      label: 'Scheduled',
      badgeClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    };
  }

  if (discount.ends_at && new Date(discount.ends_at) < now) {
    return {
      status: 'EXPIRED',
      label: 'Expired',
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    };
  }

  return {
    status: 'ACTIVE',
    label: 'Live Now',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
  };
}

export const discountService = {
  /**
   * Fetch all currently valid public discounts
   */
  async getActiveDiscounts(): Promise<{ data: PublicDiscount[]; error: Error | null }> {
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await withTimeout(
        supabase
          .from('discounts')
          .select(`
            *,
            discount_branches ( branch_id ),
            discount_categories ( category_id ),
            discount_products ( product_id )
          `)
          .eq('is_active', true)
          .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
          .or(`ends_at.is.null,ends_at.gte.${nowIso}`),
        15_000,
        'Discounts fetch'
      );

      if (error) throw error;
      return { data: (data as unknown as PublicDiscount[]) || [], error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to fetch discounts'),
      };
    }
  },
};
