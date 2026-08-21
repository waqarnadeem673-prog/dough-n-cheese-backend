import { supabase } from '@/lib/supabase';
import { withTimeout } from '@/utils/withTimeout';
import type { DatabaseBranch } from '@/types/database';
import type { Branch } from '@/types';

/**
 * Format 24h time string (e.g. '11:00:00' or '11:00') into 12h format (e.g. '11:00 AM')
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let h = parseInt(parts[0], 10);
  const m = parts[1];
  const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

/**
 * Map Supabase database branch record to frontend Branch type
 */
export function mapDatabaseBranchToBranch(dbBranch: DatabaseBranch): Branch {
  const open12 = formatTime12h(dbBranch.opening_time);
  const close12 = formatTime12h(dbBranch.closing_time);
  const hours = open12 && close12 ? `${open12} - ${close12}` : '11:00 AM - 1:00 AM';

  // Normalize openTime and closeTime to HH:mm
  const openTime = (dbBranch.opening_time || '11:00').substring(0, 5);
  const closeTime = (dbBranch.closing_time || '01:00').substring(0, 5);

  return {
    id: dbBranch.slug || dbBranch.id,
    name: dbBranch.name,
    address: dbBranch.address,
    phone: dbBranch.phone,
    whatsapp: dbBranch.whatsapp_number,
    mapsUrl:
      dbBranch.google_maps_url ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `Dough N Cheese ${dbBranch.name} ${dbBranch.address}`
      )}`,
    hours,
    openTime,
    closeTime,
    daysOpen: dbBranch.days_open || 'Mon - Sun',
  };
}

export const branchService = {
  /**
   * Fetch active branches for the public customer website
   */
  async getActiveBranches(): Promise<{ data: Branch[]; error: Error | null }> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('branches')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true }),
        15_000,
        'Branches fetch'
      );

      if (error) throw error;
      const mapped = ((data as DatabaseBranch[]) || []).map(mapDatabaseBranchToBranch);
      return { data: mapped, error: null };
    } catch (err) {
      return {
        data: [],
        error: err instanceof Error ? err : new Error('Failed to fetch branches'),
      };
    }
  },
};
