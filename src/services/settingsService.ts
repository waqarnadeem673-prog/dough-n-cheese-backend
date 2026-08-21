import { supabase } from '@/lib/supabase';
import type { DatabaseRestaurantSettings } from '@/types/database';
import { site } from '@/data/site';

export type SettingsFormPayload = {
  restaurant_name: string;
  tagline: string;
  logo_url: string;
  hero_image_url: string;
  delivery_image_url: string;
  menu_pdf_url: string;
  instagram_url: string;
  tiktok_url: string;
  facebook_url: string;
  extra_data: {
    contact_email?: string;
    contact_phone?: string;
    announcement_banner?: string;
    delivery_notice?: string;
    [key: string]: unknown;
  };
};

export const defaultSettings: SettingsFormPayload = {
  restaurant_name: site.name,
  tagline: site.tagline,
  logo_url: site.logo,
  hero_image_url: site.heroImage,
  delivery_image_url: site.deliveryImage,
  menu_pdf_url: site.menuPdf,
  instagram_url: site.socials.instagram,
  tiktok_url: site.socials.tiktok,
  facebook_url: site.socials.facebook,
  extra_data: {
    contact_email: 'contact@doughncheese.com',
    contact_phone: '+92 312 3456789',
    announcement_banner: '',
    delivery_notice: 'Free delivery on orders over Rs. 2,000 across Kamoke.',
  },
};

export const settingsService = {
  /**
   * Fetch current restaurant settings singleton row.
   * If not yet seeded in database, returns fallback defaults.
   */
  async getSettings(): Promise<{ data: DatabaseRestaurantSettings | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('*')
        .eq('is_singleton', true)
        .maybeSingle();

      if (error) throw error;
      return { data: data as DatabaseRestaurantSettings | null, error: null };
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to fetch restaurant settings'),
      };
    }
  },

  /**
   * Upsert the singleton restaurant settings row.
   * Permissions strictly enforced by RLS: OWNER and ADMIN only.
   */
  async updateSettings(
    payload: SettingsFormPayload,
    existingId?: string
  ): Promise<{ data: DatabaseRestaurantSettings | null; error: Error | null }> {
    try {
      const updateData = {
        is_singleton: true,
        restaurant_name: payload.restaurant_name.trim() || 'Dough N Cheese',
        tagline: payload.tagline ? payload.tagline.trim() : null,
        logo_url: payload.logo_url ? payload.logo_url.trim() : null,
        hero_image_url: payload.hero_image_url ? payload.hero_image_url.trim() : null,
        delivery_image_url: payload.delivery_image_url ? payload.delivery_image_url.trim() : null,
        menu_pdf_url: payload.menu_pdf_url ? payload.menu_pdf_url.trim() : null,
        instagram_url: payload.instagram_url ? payload.instagram_url.trim() : null,
        tiktok_url: payload.tiktok_url ? payload.tiktok_url.trim() : null,
        facebook_url: payload.facebook_url ? payload.facebook_url.trim() : null,
        extra_data: payload.extra_data || {},
      };

      if (existingId) {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .update(updateData)
          .eq('id', existingId)
          .select()
          .single();

        if (error) throw error;
        return { data: data as DatabaseRestaurantSettings, error: null };
      } else {
        const { data, error } = await supabase
          .from('restaurant_settings')
          .upsert(updateData, { onConflict: 'is_singleton' })
          .select()
          .single();

        if (error) throw error;
        return { data: data as DatabaseRestaurantSettings, error: null };
      }
    } catch (err) {
      return {
        data: null,
        error: err instanceof Error ? err : new Error('Failed to update restaurant settings'),
      };
    }
  },
};
