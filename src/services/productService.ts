import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/utils/withTimeout';
import type { DatabaseCategory } from '@/types/database';

export type RawDatabaseProductWithRelations = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_popular: boolean;
  is_active: boolean;
  category_id: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    display_order: number;
    is_active: boolean;
  } | null;
  product_price_options: Array<{
    id: string;
    label: string;
    price: number;
    display_order: number;
    is_active: boolean;
  }>;
  product_variants: Array<{
    id: string;
    name: string;
    display_order: number;
    is_required: boolean;
    is_active: boolean;
    product_variant_options: Array<{
      id: string;
      name: string;
      price_modifier: number;
      display_order: number;
      is_active: boolean;
    }>;
  }>;
};

export const productService = {
  /**
   * Fetch all active categories ordered by display_order
   */
  async getActiveCategories(): Promise<{ data: DatabaseCategory[] | null; error: Error | null }> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        15_000,
        'Categories fetch'
      );

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return { data: (data as DatabaseCategory[]) || [], error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch categories'),
      };
    }
  },

  /**
   * Fetch all active products with joined active price options, variants, and categories
   */
  async getActiveProducts(): Promise<{
    data: RawDatabaseProductWithRelations[] | null;
    error: Error | null;
  }> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            description,
            image_url,
            is_popular,
            is_active,
            category_id,
            categories (
              id,
              name,
              slug,
              display_order,
              is_active
            ),
            product_price_options (
              id,
              label,
              price,
              display_order,
              is_active
            ),
            product_variants (
              id,
              name,
              display_order,
              is_required,
              is_active,
              product_variant_options (
                id,
                name,
                price_modifier,
                display_order,
                is_active
              )
            )
          `)
          .eq('is_active', true),
        15_000,
        'Products fetch'
      );

      if (error) {
        return { data: null, error: new Error(error.message) };
      }

      return {
        data: (data as unknown as RawDatabaseProductWithRelations[]) || [],
        error: null,
      };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch products from Supabase'),
      };
    }
  },
};
