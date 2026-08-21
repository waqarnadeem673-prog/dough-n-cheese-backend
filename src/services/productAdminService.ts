import { supabase } from '@/lib/supabase';
import type { DatabaseCategory } from '@/types/database';

export type PriceOptionFormItem = {
  id?: string;
  label: string;
  price: number;
  display_order: number;
  is_active: boolean;
};

export type VariantOptionFormItem = {
  id?: string;
  name: string;
  price_modifier: number;
  display_order: number;
  is_active: boolean;
};

export type VariantFormItem = {
  id?: string;
  name: string;
  is_required: boolean;
  is_active: boolean;
  display_order: number;
  options: VariantOptionFormItem[];
};

export type ProductFormPayload = {
  name: string;
  slug: string;
  category_id: string;
  description: string;
  image_url: string;
  is_popular: boolean;
  is_active: boolean;
  pricing_mode: 'SINGLE' | 'MULTIPLE';
  single_price?: number;
  price_options: PriceOptionFormItem[];
  variants: VariantFormItem[];
};

export type AdminProductListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_popular: boolean;
  is_active: boolean;
  category_id: string;
  created_at: string;
  categories: {
    id: string;
    name: string;
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

export const productAdminService = {
  /**
   * Fetch all categories for admin select dropdown
   */
  async getCategories(): Promise<{ data: DatabaseCategory[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      return { data: (data as DatabaseCategory[]) || [], error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to fetch categories'),
      };
    }
  },

  /**
   * Quick-create a new category if needed
   */
  async createCategory(name: string): Promise<{ data: DatabaseCategory | null; error: Error | null }> {
    try {
      const slug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: name.trim(),
          slug,
          is_active: true,
          display_order: 0,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as DatabaseCategory, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to create category'),
      };
    }
  },

  /**
   * Fetch all products with full relational data for admin management
   */
  async getAdminProducts(): Promise<{ data: AdminProductListItem[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
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
          created_at,
          categories (
            id,
            name
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data as unknown as AdminProductListItem[]) || [], error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to fetch products'),
      };
    }
  },

  /**
   * Fetch a single product by ID with all relations for editing
   */
  async getProductById(id: string): Promise<{ data: AdminProductListItem | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
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
          created_at,
          categories (
            id,
            name
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
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as unknown as AdminProductListItem, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to load product details'),
      };
    }
  },

  /**
   * Create a new product with all price options and variants
   */
  async createProduct(payload: ProductFormPayload): Promise<{ data: string | null; error: Error | null }> {
    try {
      // 1. Insert product row
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert({
          name: payload.name.trim(),
          slug: payload.slug.trim().toLowerCase(),
          category_id: payload.category_id,
          description: payload.description ? payload.description.trim() : null,
          image_url: payload.image_url ? payload.image_url.trim() : null,
          is_popular: payload.is_popular,
          is_active: payload.is_active,
        })
        .select('id')
        .single();

      if (productError) throw productError;
      const productId = productData.id;

      // 2. Insert price options
      if (payload.pricing_mode === 'SINGLE') {
        const basePrice = payload.single_price ?? 0;
        await supabase.from('product_price_options').insert({
          product_id: productId,
          label: 'Regular',
          price: basePrice,
          display_order: 0,
          is_active: true,
        });
      } else {
        const priceRows = payload.price_options.map((opt, idx) => ({
          product_id: productId,
          label: opt.label.trim(),
          price: Number(opt.price),
          display_order: opt.display_order ?? idx,
          is_active: opt.is_active ?? true,
        }));

        if (priceRows.length > 0) {
          const { error: priceError } = await supabase
            .from('product_price_options')
            .insert(priceRows);
          if (priceError) throw priceError;
        }
      }

      // 3. Insert variants and variant options
      for (let vIdx = 0; vIdx < payload.variants.length; vIdx++) {
        const variant = payload.variants[vIdx];
        if (!variant.name.trim()) continue;

        const { data: varData, error: varError } = await supabase
          .from('product_variants')
          .insert({
            product_id: productId,
            name: variant.name.trim(),
            display_order: variant.display_order ?? vIdx,
            is_required: variant.is_required ?? false,
            is_active: variant.is_active ?? true,
          })
          .select('id')
          .single();

        if (varError) throw varError;
        const variantId = varData.id;

        const optionRows = (variant.options || [])
          .filter((opt) => opt.name.trim())
          .map((opt, oIdx) => ({
            variant_id: variantId,
            name: opt.name.trim(),
            price_modifier: Number(opt.price_modifier || 0),
            display_order: opt.display_order ?? oIdx,
            is_active: opt.is_active ?? true,
          }));

        if (optionRows.length > 0) {
          const { error: optError } = await supabase
            .from('product_variant_options')
            .insert(optionRows);
          if (optError) throw optError;
        }
      }

      return { data: productId, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to create product'),
      };
    }
  },

  /**
   * Update an existing product and synchronize price options & variants
   */
  async updateProduct(id: string, payload: ProductFormPayload): Promise<{ success: boolean; error: Error | null }> {
    try {
      // 1. Update product base fields
      const { error: prodError } = await supabase
        .from('products')
        .update({
          name: payload.name.trim(),
          slug: payload.slug.trim().toLowerCase(),
          category_id: payload.category_id,
          description: payload.description ? payload.description.trim() : null,
          image_url: payload.image_url ? payload.image_url.trim() : null,
          is_popular: payload.is_popular,
          is_active: payload.is_active,
        })
        .eq('id', id);

      if (prodError) throw prodError;

      // 2. Synchronize price options (cleanly delete existing child rows and insert updated set)
      await supabase.from('product_price_options').delete().eq('product_id', id);

      if (payload.pricing_mode === 'SINGLE') {
        await supabase.from('product_price_options').insert({
          product_id: id,
          label: 'Regular',
          price: payload.single_price ?? 0,
          display_order: 0,
          is_active: true,
        });
      } else {
        const priceRows = payload.price_options.map((opt, idx) => ({
          product_id: id,
          label: opt.label.trim(),
          price: Number(opt.price),
          display_order: opt.display_order ?? idx,
          is_active: opt.is_active ?? true,
        }));

        if (priceRows.length > 0) {
          const { error: pErr } = await supabase.from('product_price_options').insert(priceRows);
          if (pErr) throw pErr;
        }
      }

      // 3. Synchronize variants (delete existing variants for product, which cascade-deletes options)
      await supabase.from('product_variants').delete().eq('product_id', id);

      for (let vIdx = 0; vIdx < payload.variants.length; vIdx++) {
        const variant = payload.variants[vIdx];
        if (!variant.name.trim()) continue;

        const { data: varData, error: varError } = await supabase
          .from('product_variants')
          .insert({
            product_id: id,
            name: variant.name.trim(),
            display_order: variant.display_order ?? vIdx,
            is_required: variant.is_required ?? false,
            is_active: variant.is_active ?? true,
          })
          .select('id')
          .single();

        if (varError) throw varError;
        const variantId = varData.id;

        const optionRows = (variant.options || [])
          .filter((opt) => opt.name.trim())
          .map((opt, oIdx) => ({
            variant_id: variantId,
            name: opt.name.trim(),
            price_modifier: Number(opt.price_modifier || 0),
            display_order: opt.display_order ?? oIdx,
            is_active: opt.is_active ?? true,
          }));

        if (optionRows.length > 0) {
          const { error: optError } = await supabase
            .from('product_variant_options')
            .insert(optionRows);
          if (optError) throw optError;
        }
      }

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to update product'),
      };
    }
  },

  /**
   * Toggle active state (soft activate / deactivate)
   */
  async toggleActive(id: string, is_active: boolean): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to update status'),
      };
    }
  },

  /**
   * Permanently delete a product
   */
  async deleteProduct(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to delete product'),
      };
    }
  },
};
