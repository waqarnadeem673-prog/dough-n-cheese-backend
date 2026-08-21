import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Phone,
  MessageCircle,
  Eye,
  Navigation,
} from 'lucide-react';
import {
  branchAdminService,
  type BranchFormPayload,
} from '@/services/branchAdminService';

type AdminBranchFormProps = {
  mode: 'create' | 'edit';
};

export default function AdminBranchForm({ mode }: AdminBranchFormProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [openingTime, setOpeningTime] = useState('11:00');
  const [closingTime, setClosingTime] = useState('01:00');
  const [daysOpen, setDaysOpen] = useState('Mon - Sun');
  const [isActive, setIsActive] = useState(true);

  // Status
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugManuallyEdited) {
      const generated = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setSlug(generated);
    }
  };

  useEffect(() => {
    let mounted = true;

    async function loadBranch() {
      if (mode !== 'edit' || !id) return;
      setIsLoading(true);
      try {
        const { data: branch, error } = await branchAdminService.getBranchById(id);
        if (!mounted) return;

        if (error || !branch) {
          setErrorMessage('Failed to load branch details: ' + (error?.message || 'Not found'));
        } else {
          setName(branch.name);
          setSlug(branch.slug);
          setSlugManuallyEdited(true);
          setCity(branch.city);
          setAddress(branch.address);
          setPhone(branch.phone);
          setWhatsappNumber(branch.whatsapp_number);
          setGoogleMapsUrl(branch.google_maps_url || '');
          setOpeningTime((branch.opening_time || '11:00').substring(0, 5));
          setClosingTime((branch.closing_time || '01:00').substring(0, 5));
          setDaysOpen(branch.days_open || 'Mon - Sun');
          setIsActive(branch.is_active);
        }
      } catch {
        if (mounted) setErrorMessage('An unexpected error occurred while loading branch.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadBranch();

    return () => {
      mounted = false;
    };
  }, [mode, id]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Branch name is required.');
      return;
    }
    if (!slug.trim()) {
      setErrorMessage('Branch slug is required.');
      return;
    }
    if (!city.trim()) {
      setErrorMessage('City is required.');
      return;
    }
    if (!address.trim()) {
      setErrorMessage('Full address is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Phone number is required.');
      return;
    }
    if (!whatsappNumber.trim()) {
      setErrorMessage('WhatsApp number is required.');
      return;
    }
    if (googleMapsUrl.trim()) {
      const cleanedUrl = googleMapsUrl.trim();
      // Allow raw iframe paste or standard http/https URL
      const isHttp = /^https?:\/\//i.test(cleanedUrl);
      const isIframe = /<iframe/i.test(cleanedUrl);
      if (!isHttp && !isIframe) {
        setErrorMessage('Google Maps URL must start with http:// or https:// (or be an embed code).');
        return;
      }
    }

    setIsSaving(true);

    const payload: BranchFormPayload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      city: city.trim(),
      address: address.trim(),
      phone: phone.trim(),
      whatsapp_number: whatsappNumber.trim().replace(/[^0-9]/g, ''),
      google_maps_url: googleMapsUrl.trim() || null,
      opening_time: openingTime.trim(),
      closing_time: closingTime.trim(),
      days_open: daysOpen.trim() || 'Mon - Sun',
      is_active: isActive,
    };

    try {
      if (mode === 'create') {
        const { data, error } = await branchAdminService.createBranch(payload);
        if (error || !data) {
          setErrorMessage(error?.message || 'Failed to create branch.');
        } else {
          setSuccessMessage('Branch created successfully!');
          setTimeout(() => {
            navigate('/admin/branches', {
              state: { notification: `Branch "${payload.name}" created successfully` },
            });
          }, 600);
        }
      } else if (mode === 'edit' && id) {
        const { error } = await branchAdminService.updateBranch(id, payload);
        if (error) {
          setErrorMessage(error.message || 'Failed to update branch.');
        } else {
          setSuccessMessage('Branch updated successfully!');
          setTimeout(() => {
            navigate('/admin/branches', {
              state: { notification: `Branch "${payload.name}" updated successfully` },
            });
          }, 600);
        }
      }
    } catch {
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-ink-400">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
        <p className="text-xs font-semibold uppercase tracking-wider">Loading branch details...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/branches"
            className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-ink-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-ink-50">
              {mode === 'create' ? 'Add New Branch' : `Edit: ${name}`}
            </h1>
            <p className="text-xs text-ink-400">
              {mode === 'create'
                ? 'Create a new location with contact info and ordering numbers'
                : 'Modify branch address, timing, or WhatsApp number'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="btn-primary shadow-lg shadow-primary-500/20 disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{mode === 'create' ? 'Create Branch' : 'Save Changes'}</span>
            </>
          )}
        </button>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-error-500/30 bg-error-500/10 p-4 text-xs text-error-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
          <div>{errorMessage}</div>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start gap-3 rounded-2xl border border-success-500/30 bg-success-500/10 p-4 text-xs text-success-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-400" />
          <div>{successMessage}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ========================================================================= */}
        {/* 1. BASIC INFORMATION                                                      */}
        {/* ========================================================================= */}
        <div className="space-y-6 rounded-2xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-ink-50 border-b border-white/5 pb-3">
            Location Information
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="branch-name"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Branch Name *
              </label>
              <input
                id="branch-name"
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Kamoke, Gujranwala Cantt, Lahore DHA"
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              />
            </div>

            <div>
              <label
                htmlFor="branch-slug"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                URL Slug *
              </label>
              <input
                id="branch-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="e.g. kamoke"
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm font-mono text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              />
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="branch-city"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                City *
              </label>
              <input
                id="branch-city"
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Kamoke, Lahore, Gujranwala"
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              />
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isSaving}
                  className="rounded border-white/20 bg-ink-900 text-primary-500 focus:ring-0"
                />
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Active on Public Website</span>
                </span>
              </label>
            </div>
          </div>

          <div>
            <label
              htmlFor="branch-address"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
            >
              Full Address *
            </label>
            <input
              id="branch-address"
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Opposite Risen Store, G.T Road, Kamoke"
              disabled={isSaving}
              className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. CONTACT & WHATSAPP ORDERING                                            */}
        {/* ========================================================================= */}
        <div className="space-y-6 rounded-2xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-ink-50 border-b border-white/5 pb-3">
            Contact & WhatsApp Ordering
          </h2>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label
                htmlFor="branch-phone"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Customer Phone *
              </label>
              <div className="relative mt-2">
                <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  id="branch-phone"
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0308-680-0004"
                  disabled={isSaving}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2.5 pl-11 pr-4 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="branch-wa"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                WhatsApp Ordering Number (Country code included) *
              </label>
              <div className="relative mt-2">
                <MessageCircle className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                <input
                  id="branch-wa"
                  type="text"
                  required
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="923086800004"
                  disabled={isSaving}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2.5 pl-11 pr-4 text-sm font-mono text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-500">
                Digits only without '+' (e.g. 923086800004 for +92 308 6800004)
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="branch-maps"
              className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
            >
              Google Maps URL (Optional)
            </label>
            <div className="relative mt-2">
              <Navigation className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
              <input
                id="branch-maps"
                type="text"
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                placeholder="https://maps.google.com/... or https://maps.app.goo.gl/..."
                disabled={isSaving}
                className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2.5 pl-11 pr-4 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              />
            </div>
            <p className="mt-1.5 text-[11px] text-ink-500">
              Paste a Google Maps share link, place URL, coordinates, search link, or embed URL. If left empty, location will be derived from the branch address.
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. OPERATING HOURS                                                        */}
        {/* ========================================================================= */}
        <div className="space-y-6 rounded-2xl border border-white/5 bg-ink-900/60 p-6 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-ink-50 border-b border-white/5 pb-3">
            Operating Schedule
          </h2>

          <div className="grid gap-5 sm:grid-cols-3">
            <div>
              <label
                htmlFor="branch-open"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Opening Time (24h) *
              </label>
              <div className="relative mt-2">
                <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  id="branch-open"
                  type="time"
                  required
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2.5 pl-11 pr-4 text-sm text-ink-100 outline-none focus:border-primary-500/50 focus:bg-ink-950"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="branch-close"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Closing Time (24h) *
              </label>
              <div className="relative mt-2">
                <Clock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
                <input
                  id="branch-close"
                  type="time"
                  required
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  disabled={isSaving}
                  className="w-full rounded-xl border border-white/10 bg-ink-950/60 py-2.5 pl-11 pr-4 text-sm text-ink-100 outline-none focus:border-primary-500/50 focus:bg-ink-950"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="branch-days"
                className="block text-xs font-semibold uppercase tracking-wider text-ink-300"
              >
                Days Open *
              </label>
              <input
                id="branch-days"
                type="text"
                required
                value={daysOpen}
                onChange={(e) => setDaysOpen(e.target.value)}
                placeholder="e.g. Mon - Sun"
                disabled={isSaving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-ink-950/60 px-4 py-2.5 text-sm text-ink-100 placeholder-ink-600 outline-none focus:border-primary-500/50 focus:bg-ink-950"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full sm:w-auto shadow-lg shadow-primary-500/20 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving Branch...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{mode === 'create' ? 'Create Branch' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
