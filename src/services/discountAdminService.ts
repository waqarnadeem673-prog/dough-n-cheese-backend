import { supabase } from '@/lib/supabase';
import type { DiscountType, DiscountScope, DatabaseDiscount } from '@/types/database';

export type DiscountFormPayload = {
  title: string;
  description: string;
  image_url: string;
  discount_type: DiscountType;
  discount_value: number;
  scope: DiscountScope;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  branch_ids: string[];
  category_ids: string[];
  product_ids: string[];
};

export type AdminDiscountWithRelations = DatabaseDiscount & {
  discount_branches: Array<{
    branch_id: string;
    branches: { id: string; name: string; city: string } | null;
  }>;
  discount_categories: Array<{
    category_id: string;
    categories: { id: string; name: string } | null;
  }>;
  discount_products: Array<{
    product_id: string;
    products: { id: string; name: string } | null;
  }>;
};

export const discountAdminService = {
  /**
   * Fetch all discounts with their relational targeting data for admin list
   */
  async getAllDiscounts(): Promise<{ data: AdminDiscountWithRelations[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select(`
          *,
          discount_branches (
            branch_id,
            branches ( id, name, city )
          ),
          discount_categories (
            category_id,
            categories ( id, name )
          ),
          discount_products (
            product_id,
            products ( id, name )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data as unknown as AdminDiscountWithRelations[]) || [], error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to fetch discounts'),
      };
    }
  },

  /**
   * Fetch a single discount by ID for editing
   */
  async getDiscountById(id: string): Promise<{ data: AdminDiscountWithRelations | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('discounts')
        .select(`
          *,
          discount_branches (
            branch_id,
            branches ( id, name, city )
          ),
          discount_categories (
            category_id,
            categories ( id, name )
          ),
          discount_products (
            product_id,
            products ( id, name )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as unknown as AdminDiscountWithRelations, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch discount details'),
      };
    }
  },

  /**
   * Create a new discount with associations
   */
  async createDiscount(payload: DiscountFormPayload): Promise<{ data: string | null; error: Error | null }> {
    try {
      // 1. Insert discount base record
      const { data: discount, error: discountError } = await supabase
        .from('discounts')
        .insert({
          title: payload.title.trim(),
          description: payload.description ? payload.description.trim() : null,
          image_url: payload.image_url ? payload.image_url.trim() : null,
          discount_type: payload.discount_type,
          discount_value: Number(payload.discount_value),
          scope: payload.scope,
          is_active: payload.is_active,
          starts_at: payload.starts_at || null,
          ends_at: payload.ends_at || null,
        })
        .select('id')
        .single();

      if (discountError) throw discountError;
      const discountId = discount.id;

      // 2. Insert branch associations if specific branches selected
      if (payload.branch_ids && payload.branch_ids.length > 0) {
        const branchRows = payload.branch_ids.map((bId) => ({
          discount_id: discountId,
          branch_id: bId,
        }));
        const { error: bErr } = await supabase.from('discount_branches').insert(branchRows);
        if (bErr) throw bErr;
      }

      // 3. Insert category associations if scope is SELECTED_CATEGORIES
      if (payload.scope === 'SELECTED_CATEGORIES' && payload.category_ids?.length > 0) {
        const catRows = payload.category_ids.map((cId) => ({
          discount_id: discountId,
          category_id: cId,
        }));
        const { error: cErr } = await supabase.from('discount_categories').insert(catRows);
        if (cErr) throw cErr;
      }

      // 4. Insert product associations if scope is SELECTED_PRODUCTS
      if (payload.scope === 'SELECTED_PRODUCTS' && payload.product_ids?.length > 0) {
        const prodRows = payload.product_ids.map((pId) => ({
          discount_id: discountId,
          product_id: pId,
        }));
        const { error: pErr } = await supabase.from('discount_products').insert(prodRows);
        if (pErr) throw pErr;
      }

      return { data: discountId, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to create discount'),
      };
    }
  },

  /**
   * Update an existing discount and synchronize association join tables
   */
  async updateDiscount(id: string, payload: DiscountFormPayload): Promise<{ success: boolean; error: Error | null }> {
    try {
      // 1. Update discount base record
      const { error: discountError } = await supabase
        .from('discounts')
        .update({
          title: payload.title.trim(),
          description: payload.description ? payload.description.trim() : null,
          image_url: payload.image_url ? payload.image_url.trim() : null,
          discount_type: payload.discount_type,
          discount_value: Number(payload.discount_value),
          scope: payload.scope,
          is_active: payload.is_active,
          starts_at: payload.starts_at || null,
          ends_at: payload.ends_at || null,
        })
        .eq('id', id);

      if (discountError) throw discountError;

      // 2. Synchronize branch associations
      await supabase.from('discount_branches').delete().eq('discount_id', id);
      if (payload.branch_ids && payload.branch_ids.length > 0) {
        const branchRows = payload.branch_ids.map((bId) => ({
          discount_id: id,
          branch_id: bId,
        }));
        const { error: bErr } = await supabase.from('discount_branches').insert(branchRows);
        if (bErr) throw bErr;
      }

      // 3. Synchronize category associations
      await supabase.from('discount_categories').delete().eq('discount_id', id);
      if (payload.scope === 'SELECTED_CATEGORIES' && payload.category_ids?.length > 0) {
        const catRows = payload.category_ids.map((cId) => ({
          discount_id: id,
          category_id: cId,
        }));
        const { error: cErr } = await supabase.from('discount_categories').insert(catRows);
        if (cErr) throw cErr;
      }

      // 4. Synchronize product associations
      await supabase.from('discount_products').delete().eq('discount_id', id);
      if (payload.scope === 'SELECTED_PRODUCTS' && payload.product_ids?.length > 0) {
        const prodRows = payload.product_ids.map((pId) => ({
          discount_id: id,
          product_id: pId,
        }));
        const { error: pErr } = await supabase.from('discount_products').insert(prodRows);
        if (pErr) throw pErr;
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to update discount'),
      };
    }
  },

  /**
   * Soft toggle active status
   */
  async toggleActive(id: string, is_active: boolean): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('discounts')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to update discount status'),
      };
    }
  },

  /**
   * Permanently delete a discount
   */
  async deleteDiscount(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from('discounts').delete().eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to delete discount'),
      };
    }
  },

  /**
   * Fetch active categories, products, and branches for targeting multi-selects
   */
  async getFormTargetingOptions(): Promise<{
    data: {
      categories: Array<{ id: string; name: string }>;
      products: Array<{ id: string; name: string; category_name: string }>;
      branches: Array<{ id: string; name: string; city: string }>;
    };
    error: Error | null;
  }> {
    try {
      const [catsRes, prodsRes, branchRes] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name')
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
        supabase
          .from('products')
          .select('id, name, categories(name)')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        supabase
          .from('branches')
          .select('id, name, city')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ]);

      if (catsRes.error) throw catsRes.error;
      if (prodsRes.error) throw prodsRes.error;
      if (branchRes.error) throw branchRes.error;

      const categories = (catsRes.data || []) as unknown as Array<{ id: string; name: string }>;
      const branches = (branchRes.data || []) as unknown as Array<{ id: string; name: string; city: string }>;
      const rawProducts = (prodsRes.data || []) as unknown as Array<{
        id: string;
        name: string;
        categories: { name: string } | Array<{ name: string }> | null;
      }>;

      const products = rawProducts.map((p) => {
        let categoryName = 'Uncategorized';
        if (Array.isArray(p.categories) && p.categories.length > 0) {
          categoryName = p.categories[0].name;
        } else if (p.categories && !Array.isArray(p.categories)) {
          categoryName = p.categories.name;
        }
        return {
          id: p.id,
          name: p.name,
          category_name: categoryName,
        };
      });

      return {
        data: { categories, products, branches },
        error: null,
      };
    } catch (err) {
      return {
        data: { categories: [], products: [], branches: [] },
        error: err instanceof Error ? err : new Error('Failed to load targeting options'),
      };
    }
  },
};
