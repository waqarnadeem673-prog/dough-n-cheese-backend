import { supabase } from '@/lib/supabase';
import type { DatabaseBranch } from '@/types/database';

export type BranchFormPayload = {
  name: string;
  slug: string;
  city: string;
  address: string;
  phone: string;
  whatsapp_number: string;
  google_maps_url: string | null;
  opening_time: string;
  closing_time: string;
  days_open: string;
  is_active: boolean;
};

export const branchAdminService = {
  /**
   * Fetch all branches for admin management (active & inactive)
   */
  async getAllBranches(): Promise<{ data: DatabaseBranch[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data as DatabaseBranch[]) || [], error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to fetch branches'),
      };
    }
  },

  /**
   * Fetch a single branch by ID for editing
   */
  async getBranchById(id: string): Promise<{ data: DatabaseBranch | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as DatabaseBranch, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch branch details'),
      };
    }
  },

  /**
   * Create a new branch
   */
  async createBranch(payload: BranchFormPayload): Promise<{ data: DatabaseBranch | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('branches')
        .insert({
          name: payload.name.trim(),
          slug: payload.slug.trim().toLowerCase(),
          city: payload.city.trim(),
          address: payload.address.trim(),
          phone: payload.phone.trim(),
          whatsapp_number: payload.whatsapp_number.trim().replace(/[^0-9]/g, ''),
          google_maps_url: payload.google_maps_url ? payload.google_maps_url.trim() : null,
          opening_time: payload.opening_time.trim(),
          closing_time: payload.closing_time.trim(),
          days_open: payload.days_open.trim() || 'Mon - Sun',
          is_active: payload.is_active,
        })
        .select()
        .single();

      if (error) throw error;
      return { data: data as DatabaseBranch, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to create branch'),
      };
    }
  },

  /**
   * Update an existing branch
   */
  async updateBranch(id: string, payload: BranchFormPayload): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('branches')
        .update({
          name: payload.name.trim(),
          slug: payload.slug.trim().toLowerCase(),
          city: payload.city.trim(),
          address: payload.address.trim(),
          phone: payload.phone.trim(),
          whatsapp_number: payload.whatsapp_number.trim().replace(/[^0-9]/g, ''),
          google_maps_url: payload.google_maps_url ? payload.google_maps_url.trim() : null,
          opening_time: payload.opening_time.trim(),
          closing_time: payload.closing_time.trim(),
          days_open: payload.days_open.trim() || 'Mon - Sun',
          is_active: payload.is_active,
        })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to update branch'),
      };
    }
  },

  /**
   * Soft toggle active status
   */
  async toggleActive(id: string, is_active: boolean): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase
        .from('branches')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to toggle branch status'),
      };
    }
  },

  /**
   * Permanently delete a branch
   */
  async deleteBranch(id: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to delete branch'),
      };
    }
  },
};
