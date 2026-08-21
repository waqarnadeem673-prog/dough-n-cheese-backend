/**
 * BranchContext — Cache-First + Background Supabase Sync
 *
 * Rendering lifecycle:
 *
 * 1. IMMEDIATE (sync, before first paint)
 *    - Read branches from localStorage cache (branchCache.ts).
 *    - Read previously selected branch id from localStorage.
 *    - allBranches is pre-populated → BranchSelection renders instantly.
 *    - `loading` is true only when there is NO cache (genuine first visit).
 *
 * 2. BACKGROUND (async, after mount)
 *    - Fetch active branches from Supabase.
 *    - On success → replace allBranches, update cache, reconcile selection.
 *    - On failure → keep cache; show non-blocking sync error badge.
 *    - `syncing` flag drives a tiny, non-disruptive indicator.
 *
 * 3. REALTIME
 *    - Supabase Realtime triggers a background re-fetch whenever any branch
 *      row is inserted / updated / deleted.
 *    - Cache is updated after every successful realtime refresh.
 *
 * Rules:
 *    - Supabase is ALWAYS the source of truth.
 *    - Cache NEVER permanently overrides Supabase data.
 *    - No hardcoded branch data (Kamoke, Lahore, etc.).
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from 'react';
import { branchService } from '@/services/branchService';
import { supabase } from '@/lib/supabase';
import {
  readCachedBranches,
  writeCachedBranches,
  readSelectedBranchId,
  writeSelectedBranchId,
  isCacheStale,
} from '@/utils/branchCache';
import type { Branch } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type BranchContextValue = {
  /** Currently selected branch (never null — falls back to first available) */
  selectedBranch: Branch;
  /** Switch the active branch by id */
  setSelectedBranch: (id: string) => void;
  /** All active branches known at this moment */
  allBranches: Branch[];
  /**
   * `true` only on a genuine first visit when no cached branches exist and
   * the Supabase request has not yet returned.
   */
  loading: boolean;
  /**
   * `true` while a background Supabase fetch is in-flight (cache exists,
   * branches are visible, but data may be stale).
   */
  syncing: boolean;
  /** Last sync error (null when OK). Does NOT block branch display. */
  syncError: string | null;
  /** Force a full re-fetch from Supabase */
  refreshBranches: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const BranchContext = createContext<BranchContextValue | null>(null);

// ---------------------------------------------------------------------------
// Baseline placeholder — rendered ONLY when localStorage is empty on very
// first visit AND Supabase has not responded yet.
// This is intentionally generic / not branch-specific.
// ---------------------------------------------------------------------------

const PLACEHOLDER_BRANCH: Branch = {
  id: '__placeholder__',
  name: 'Loading…',
  address: 'Fetching branch information',
  phone: '',
  whatsapp: '',
  mapsUrl: 'https://www.google.com/maps',
  hours: '',
  openTime: '11:00',
  closeTime: '01:00',
  daysOpen: 'Mon - Sun',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Given a full branch list and a candidate id (from localStorage or state),
 * return the matching branch or the first branch in the list.
 */
function resolveBranch(branches: Branch[], candidateId: string | null): Branch | null {
  if (!branches.length) return null;
  if (!candidateId) return branches[0];
  return (
    branches.find((b) => b.id === candidateId || b.name.toLowerCase() === candidateId.toLowerCase()) ||
    branches[0]
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function BranchProvider({ children }: { children: ReactNode }) {
  // ── 1. Synchronous cache hydration (runs before any render) ────────────
  const cachedBranches = readCachedBranches();   // null on first visit
  const cachedSelectedId = readSelectedBranchId(); // null on first visit

  // `allBranches` is pre-filled from cache so branches render immediately
  const [allBranches, setAllBranches] = useState<Branch[]>(cachedBranches ?? []);

  const [selectedId, setSelectedId] = useState<string | null>(cachedSelectedId);

  // True only when there is NO cache AND Supabase hasn't responded yet
  const [loading, setLoading] = useState<boolean>(!cachedBranches);

  // True whenever a background Supabase request is in-flight
  const [syncing, setSyncing] = useState<boolean>(false);

  // Non-blocking error for the background sync (does not hide branches)
  const [syncError, setSyncError] = useState<string | null>(null);

  // Prevent duplicate concurrent fetches
  const fetchingRef = useRef(false);

  // ── 2. Background Supabase sync ────────────────────────────────────────
  const syncFromSupabase = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setSyncing(true);
    setSyncError(null);

    const perfStart = performance.now();

    try {
      const { data, error } = await branchService.getActiveBranches();

      const elapsed = Math.round(performance.now() - perfStart);
      console.debug(`[BranchContext] Supabase sync completed in ${elapsed}ms`);

      if (error) {
        console.warn('[BranchContext] Supabase sync error:', error.message);
        setSyncError(error.message);
        // Keep existing cache / displayed branches — do NOT blank out the UI
        return;
      }

      if (!data || data.length === 0) {
        // Supabase returned 0 active branches — only clear UI if cache was also empty
        if (allBranches.length === 0) {
          setAllBranches([]);
        }
        setSyncError('No active branches found in database.');
        return;
      }

      // Authoritative Supabase data — replace display and update cache
      setAllBranches(data);
      writeCachedBranches(data);

      // Reconcile selection: if currently selected branch was deleted/deactivated, move to first
      setSelectedId((prev) => {
        const match = resolveBranch(data, prev);
        if (!match) return null;
        if (match.id !== prev) {
          writeSelectedBranchId(match.id);
          return match.id;
        }
        return prev;
      });
    } finally {
      fetchingRef.current = false;
      setSyncing(false);
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Note: intentionally empty deps — we manage concurrency with fetchingRef

  // ── 3. Mount: start background sync immediately ────────────────────────
  useEffect(() => {
    // If cache exists but is stale, or if no cache at all → sync now
    void syncFromSupabase();
  }, [syncFromSupabase]);

  // ── 4. Supabase Realtime subscription ─────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel('public-branches-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branches' },
        () => {
          // Re-fetch on any branch INSERT / UPDATE / DELETE
          void syncFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncFromSupabase]);

  // ── 5. Derived selected branch ─────────────────────────────────────────
  const selectedBranch: Branch =
    resolveBranch(allBranches, selectedId) ?? PLACEHOLDER_BRANCH;

  // ── 6. User branch selection ───────────────────────────────────────────
  const setSelectedBranch = useCallback((id: string) => {
    setSelectedId(id);
    writeSelectedBranchId(id);
  }, []);

  // ── 7. Development timing log ──────────────────────────────────────────
  useEffect(() => {
    if (allBranches.length > 0) {
      const fromCache = !!cachedBranches;
      console.debug(
        `[BranchContext] ${allBranches.length} branch(es) rendered.` +
        ` Source: ${fromCache ? 'localStorage cache' : 'Supabase'}. ` +
        `Cache stale: ${isCacheStale()}.`
      );
    }
  }, [allBranches.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BranchContext.Provider
      value={{
        selectedBranch,
        setSelectedBranch,
        allBranches,
        loading,
        syncing,
        syncError,
        refreshBranches: syncFromSupabase,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}
