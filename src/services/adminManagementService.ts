import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AdminProfile, AdminRole } from '@/types/database';

export type CreateAdminPayload = {
  name: string;
  email: string;
  password?: string;
  role: AdminRole;
  is_active: boolean;
  existing_user_id?: string;
};

export type UpdateAdminPayload = {
  name: string;
  role: AdminRole;
  is_active: boolean;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const adminManagementService = {
  /**
   * Fetch all admin profiles (only permitted for OWNER under RLS)
   */
  async getAllAdmins(): Promise<{ data: AdminProfile[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: (data as AdminProfile[]) || [], error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to fetch administrator profiles'),
      };
    }
  },

  /**
   * Fetch a single admin profile by profile ID
   */
  async getAdminById(id: string): Promise<{ data: AdminProfile | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data: data as AdminProfile, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch administrator details'),
      };
    }
  },

  /**
   * Count active OWNER accounts to prevent removing or deactivating the last active OWNER
   */
  async getActiveOwnerCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('admin_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'OWNER')
        .eq('is_active', true);

      if (error) throw error;
      return count || 0;
    } catch (err) {
      console.error('Error counting active owners:', err);
      return 1; // Default to 1 to protect safety
    }
  },

  /**
   * Create a new administrator.
   * If email + password are provided, creates the Auth user via an isolated client (without disturbing current session),
   * then inserts the admin_profiles record via the active OWNER session.
   */
  async createAdmin(payload: CreateAdminPayload): Promise<{ data: AdminProfile | null; error: Error | null }> {
    try {
      let targetUserId = payload.existing_user_id?.trim();

      // If existing user ID was not provided, create user in Supabase Auth using isolated client
      if (!targetUserId) {
        if (!payload.email || !payload.password) {
          return {
            data: null,
            error: new Error('Both email and password are required to create a new administrator account.'),
          };
        }

        const isolatedClient = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });

        const { data: authData, error: authError } = await isolatedClient.auth.signUp({
          email: payload.email.trim(),
          password: payload.password,
          options: {
            data: {
              name: payload.name.trim(),
              role: payload.role,
            },
          },
        });

        if (authError) {
          return { data: null, error: new Error(`Authentication signup failed: ${authError.message}`) };
        }

        if (!authData.user?.id) {
          return {
            data: null,
            error: new Error('User creation returned no user ID. Please verify Supabase Auth settings.'),
          };
        }

        targetUserId = authData.user.id;
      }

      // Check if profile already exists for this user_id
      const { data: existingProfile } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existingProfile) {
        return {
          data: null,
          error: new Error('An administrator profile already exists for this user.'),
        };
      }

      // Insert admin_profiles record using active OWNER session
      const { data: profileData, error: profileError } = await supabase
        .from('admin_profiles')
        .insert({
          user_id: targetUserId,
          name: payload.name.trim(),
          role: payload.role,
          is_active: payload.is_active,
        })
        .select()
        .single();

      if (profileError) {
        return {
          data: null,
          error: new Error(`Failed to assign administrator role: ${profileError.message}`),
        };
      }

      return { data: profileData as AdminProfile, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('An unexpected error occurred creating administrator'),
      };
    }
  },

  /**
   * Update an administrator profile (name, role, active status)
   */
  async updateAdmin(
    id: string,
    payload: UpdateAdminPayload
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      // 1. Fetch current profile to check if it is currently an OWNER
      const { data: targetProfile, error: fetchErr } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !targetProfile) {
        return { success: false, error: new Error('Administrator profile not found.') };
      }

      // 2. If target is currently an active OWNER and being deactivated or demoted, ensure at least one other active OWNER exists
      if (
        targetProfile.role === 'OWNER' &&
        targetProfile.is_active &&
        (!payload.is_active || payload.role !== 'OWNER')
      ) {
        const activeOwners = await this.getActiveOwnerCount();
        if (activeOwners <= 1) {
          return {
            success: false,
            error: new Error('Cannot demote or deactivate the last remaining active OWNER.'),
          };
        }
      }

      // 3. Update profile record
      const { error: updateErr } = await supabase
        .from('admin_profiles')
        .update({
          name: payload.name.trim(),
          role: payload.role,
          is_active: payload.is_active,
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to update administrator profile'),
      };
    }
  },

  /**
   * Toggle active status of an administrator profile
   */
  async toggleActive(
    id: string,
    nextActive: boolean
  ): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: targetProfile, error: fetchErr } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !targetProfile) {
        return { success: false, error: new Error('Profile not found.') };
      }

      // Protect last active OWNER from deactivation
      if (targetProfile.role === 'OWNER' && targetProfile.is_active && !nextActive) {
        const activeOwners = await this.getActiveOwnerCount();
        if (activeOwners <= 1) {
          return {
            success: false,
            error: new Error('Cannot deactivate the last remaining active OWNER.'),
          };
        }
      }

      const { error: updateErr } = await supabase
        .from('admin_profiles')
        .update({ is_active: nextActive })
        .eq('id', id);

      if (updateErr) throw updateErr;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to toggle administrator status'),
      };
    }
  },

  /**
   * Permanently delete an administrator profile (does not delete auth user to avoid accidental loss)
   */
  async deleteAdmin(id: string, currentUserId?: string): Promise<{ success: boolean; error: Error | null }> {
    try {
      const { data: targetProfile, error: fetchErr } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr || !targetProfile) {
        return { success: false, error: new Error('Profile not found.') };
      }

      // Prevent self-deletion if current user
      if (currentUserId && targetProfile.user_id === currentUserId) {
        return {
          success: false,
          error: new Error('You cannot delete your own administrator profile while signed in.'),
        };
      }

      // Protect last active OWNER
      if (targetProfile.role === 'OWNER') {
        const activeOwners = await this.getActiveOwnerCount();
        if (activeOwners <= 1) {
          return {
            success: false,
            error: new Error('Cannot delete the last remaining active OWNER.'),
          };
        }
      }

      const { error: deleteErr } = await supabase
        .from('admin_profiles')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;
      return { success: true, error: null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error('Failed to delete administrator profile'),
      };
    }
  },
};
