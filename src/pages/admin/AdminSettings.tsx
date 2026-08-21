import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Save,
  RotateCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Building,
  Image as ImageIcon,
  FileText,
  Share2,
  Phone,
  Mail,
  ExternalLink,
  ShieldCheck,
  Megaphone,
} from 'lucide-react';
import {
  settingsService,
  defaultSettings,
  type SettingsFormPayload,
} from '@/services/settingsService';

export default function AdminSettings() {
  const { role } = useAuth();
  const isAuthorized = role === 'OWNER' || role === 'ADMIN';

  const [existingId, setExistingId] = useState<string | undefined>(undefined);
  const [formData, setFormData] = useState<SettingsFormPayload>(defaultSettings);
  const [initialData, setInitialData] = useState<SettingsFormPayload>(defaultSettings);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSettings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setErrorMessage(null);

    try {
      const { data, error } = await settingsService.getSettings();
      if (error) {
        setErrorMessage('Failed to load restaurant settings: ' + error.message);
      } else if (data) {
        setExistingId(data.id);
        const mapped: SettingsFormPayload = {
          restaurant_name: data.restaurant_name || defaultSettings.restaurant_name,
          tagline: data.tagline || defaultSettings.tagline,
          logo_url: data.logo_url || defaultSettings.logo_url,
          hero_image_url: data.hero_image_url || defaultSettings.hero_image_url,
          delivery_image_url: data.delivery_image_url || defaultSettings.delivery_image_url,
          menu_pdf_url: data.menu_pdf_url || defaultSettings.menu_pdf_url,
          instagram_url: data.instagram_url || defaultSettings.instagram_url,
          tiktok_url: data.tiktok_url || defaultSettings.tiktok_url,
          facebook_url: data.facebook_url || defaultSettings.facebook_url,
          extra_data: {
            ...defaultSettings.extra_data,
            ...(data.extra_data as Record<string, unknown>),
          },
        };
        setFormData(mapped);
        setInitialData(mapped);
      } else {
        // Fallback defaults
        setFormData(defaultSettings);
        setInitialData(defaultSettings);
      }
    } catch {
      setErrorMessage('An unexpected error occurred while loading settings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) {
      setErrorMessage('Permission denied: Only OWNER and ADMIN accounts may update restaurant settings.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const { data, error } = await settingsService.updateSettings(formData, existingId);
      if (error || !data) {
        setErrorMessage(error?.message || 'Failed to save restaurant settings.');
      } else {
        setExistingId(data.id);
        setInitialData(formData);
        setNotification('Restaurant settings and brand metadata updated successfully.');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    setFormData(defaultSettings);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary-400" />
        <p className="mt-4 text-xs font-medium text-ink-400">Loading restaurant settings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ========================================================================= */}
      {/* HEADER                                                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary-400">
            <Sparkles className="h-4 w-4" />
            <span>Global Configuration</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink-50 sm:text-3xl">
            Restaurant Settings
          </h1>
          <p className="mt-0.5 text-xs text-ink-400">
            Configure global brand assets, marketing media, social media connections, and operational announcements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadSettings(true)}
            disabled={loading || refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-semibold text-ink-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
            title="Reload settings"
          >
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Reload</span>
          </button>

          {isAuthorized && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving || !hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-xs font-bold text-ink-950 shadow-md shadow-primary-500/20 transition-all hover:bg-primary-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* NOTIFICATIONS & ALERTS                                                    */}
      {/* ========================================================================= */}
      {notification && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-medium text-emerald-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 rounded-2xl border border-error-500/20 bg-error-500/10 p-4 text-xs font-medium text-error-400 animate-in fade-in slide-in-from-top-2 duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!isAuthorized && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs font-medium text-amber-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-amber-400" />
          <span>
            You are viewing settings in read-only mode. Only <strong>OWNER</strong> and <strong>ADMIN</strong> roles possess database modification privileges.
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SETTINGS FORM                                                             */}
      {/* ========================================================================= */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Brand & Identity */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Building className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Brand & Identity</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Restaurant Name */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Restaurant Name <span className="text-error-400">*</span>
              </label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={formData.restaurant_name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, restaurant_name: e.target.value }))
                }
                placeholder="Dough N Cheese"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
                required
              />
            </div>

            {/* Tagline */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Brand Tagline
              </label>
              <input
                type="text"
                disabled={!isAuthorized}
                value={formData.tagline}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                }
                placeholder="Meet. Eat. Repeat."
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Logo URL */}
          <div>
            <label className="block text-xs font-semibold text-ink-200 mb-1.5">
              Brand Logo URL
            </label>
            <div className="flex items-center gap-3">
              <input
                type="url"
                disabled={!isAuthorized}
                value={formData.logo_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, logo_url: e.target.value }))
                }
                placeholder="https://..."
                className="flex-1 rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
              />
              {formData.logo_url && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-ink-950/80 p-1 shrink-0">
                  <img
                    src={formData.logo_url}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.opacity = '0.3';
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Visual Assets & Marketing Media */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <ImageIcon className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Visual Assets & Media</h2>
          </div>

          <div className="space-y-4">
            {/* Hero Image URL */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Hero Section Image URL
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  disabled={!isAuthorized}
                  value={formData.hero_image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, hero_image_url: e.target.value }))
                  }
                  placeholder="/public/hero.png or https://..."
                  className="flex-1 rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
                />
                {formData.hero_image_url && (
                  <div className="h-10 w-16 overflow-hidden rounded-xl border border-white/10 bg-ink-950 shrink-0">
                    <img
                      src={formData.hero_image_url}
                      alt="Hero preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Graphic URL */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Delivery Feature Graphic URL
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  disabled={!isAuthorized}
                  value={formData.delivery_image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, delivery_image_url: e.target.value }))
                  }
                  placeholder="https://..."
                  className="flex-1 rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
                />
                {formData.delivery_image_url && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-ink-950/80 p-1 shrink-0">
                    <img
                      src={formData.delivery_image_url}
                      alt="Delivery preview"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = '0.3';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Menu PDF URL */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Downloadable Menu PDF URL
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="url"
                  disabled={!isAuthorized}
                  value={formData.menu_pdf_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, menu_pdf_url: e.target.value }))
                  }
                  placeholder="https://.../menu.pdf"
                  className="flex-1 rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
                />
                {formData.menu_pdf_url && (
                  <a
                    href={formData.menu_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-primary-400 transition-colors hover:bg-white/10"
                    title="Test PDF link"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Test Link</span>
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Social Media Connections */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Share2 className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Social Media Connections</h2>
          </div>

          <div className="space-y-4">
            {/* Instagram */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Instagram Profile URL
              </label>
              <input
                type="url"
                disabled={!isAuthorized}
                value={formData.instagram_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, instagram_url: e.target.value }))
                }
                placeholder="https://www.instagram.com/doughncheese.pk"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
              />
            </div>

            {/* TikTok */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                TikTok Profile URL
              </label>
              <input
                type="url"
                disabled={!isAuthorized}
                value={formData.tiktok_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tiktok_url: e.target.value }))
                }
                placeholder="https://www.tiktok.com/@dough.n.cheese"
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
              />
            </div>

            {/* Facebook */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Facebook Page URL
              </label>
              <input
                type="url"
                disabled={!isAuthorized}
                value={formData.facebook_url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, facebook_url: e.target.value }))
                }
                placeholder="https://www.facebook.com/share/..."
                className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Operational & Support Metadata */}
        <div className="rounded-3xl border border-white/5 bg-ink-900/70 p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-3">
            <Megaphone className="h-4 w-4 text-primary-400" />
            <h2 className="text-sm font-bold text-ink-50">Support & Operational Metadata</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Support Email */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Customer Support Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  type="email"
                  disabled={!isAuthorized}
                  value={formData.extra_data.contact_email || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      extra_data: { ...prev.extra_data, contact_email: e.target.value },
                    }))
                  }
                  placeholder="contact@doughncheese.com"
                  className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2.5 pl-10 pr-4 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
                />
              </div>
            </div>

            {/* Helpline Phone */}
            <div>
              <label className="block text-xs font-semibold text-ink-200 mb-1.5">
                Central Helpline / UAN
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  type="text"
                  disabled={!isAuthorized}
                  value={formData.extra_data.contact_phone || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      extra_data: { ...prev.extra_data, contact_phone: e.target.value },
                    }))
                  }
                  placeholder="+92 312 3456789"
                  className="w-full rounded-xl border border-white/10 bg-ink-950/80 py-2.5 pl-10 pr-4 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Delivery Notice */}
          <div>
            <label className="block text-xs font-semibold text-ink-200 mb-1.5">
              Delivery Policy / Notice Note
            </label>
            <input
              type="text"
              disabled={!isAuthorized}
              value={formData.extra_data.delivery_notice || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  extra_data: { ...prev.extra_data, delivery_notice: e.target.value },
                }))
              }
              placeholder="Free delivery on orders over Rs. 2,000 across Kamoke."
              className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
            />
          </div>

          {/* Announcement Banner */}
          <div>
            <label className="block text-xs font-semibold text-ink-200 mb-1.5">
              Global Header Announcement Banner (Optional)
            </label>
            <input
              type="text"
              disabled={!isAuthorized}
              value={formData.extra_data.announcement_banner || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  extra_data: { ...prev.extra_data, announcement_banner: e.target.value },
                }))
              }
              placeholder="Special Ramadan Timings: 5:00 PM - 4:00 AM (Sehri & Iftari available)"
              className="w-full rounded-xl border border-white/10 bg-ink-950/80 px-4 py-2.5 text-xs text-ink-50 placeholder-ink-500 outline-none transition-colors focus:border-primary-500/50 disabled:opacity-60"
            />
          </div>
        </div>

        {/* Action Row */}
        {isAuthorized && (
          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/10 hover:text-white"
            >
              Reset to Defaults
            </button>

            <button
              type="submit"
              disabled={saving || !hasUnsavedChanges}
              className="inline-flex items-center gap-2 rounded-xl bg-primary-500 px-6 py-2.5 text-xs font-bold text-ink-950 shadow-md shadow-primary-500/20 transition-all hover:bg-primary-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
