import { useState, useEffect, useCallback } from 'react';
import { settingsService, defaultSettings, type SettingsFormPayload } from '@/services/settingsService';
import { site } from '@/data/site';

export function useRestaurantSettings() {
  const [settings, setSettings] = useState<SettingsFormPayload>({
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
  });

  const [loading, setLoading] = useState<boolean>(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await settingsService.getSettings();
      if (!error && data) {
        setSettings({
          restaurant_name: data.restaurant_name || site.name,
          tagline: data.tagline || site.tagline,
          logo_url: data.logo_url || site.logo,
          hero_image_url: data.hero_image_url || site.heroImage,
          delivery_image_url: data.delivery_image_url || site.deliveryImage,
          menu_pdf_url: data.menu_pdf_url || site.menuPdf,
          instagram_url: data.instagram_url || site.socials.instagram,
          tiktok_url: data.tiktok_url || site.socials.tiktok,
          facebook_url: data.facebook_url || site.socials.facebook,
          extra_data: {
            ...defaultSettings.extra_data,
            ...(data.extra_data as Record<string, unknown>),
          },
        });
      }
    } catch {
      // Fallback seamlessly to site.ts static defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    refresh: fetchSettings,
  };
}
