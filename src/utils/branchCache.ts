/**
 * Dough N Cheese — Branch localStorage Cache
 *
 * A thin, versioned wrapper around localStorage for branch data.
 * Rules:
 *  - Supabase is ALWAYS the source of truth.
 *  - Cache is read-only until Supabase responds.
 *  - Cache is invalidated when the schema version changes.
 *  - Individual branch selection (id) is kept in a separate key so it
 *    survives a cache wipe.
 */

import type { Branch } from '@/types';

/** Bump this whenever the Branch type shape changes to auto-invalidate stale caches */
const CACHE_VERSION = 2;

const KEYS = {
  branches: 'dnc-branches-v' + CACHE_VERSION,
  selectedId: 'dnc-branch',
} as const;

/** Maximum age of cached branch list before a background refresh is forced (ms) */
const MAX_CACHE_AGE_MS = 5 * 60 * 1000; // 5 minutes

type CacheEnvelope = {
  v: number;
  ts: number;
  branches: Branch[];
};

// ---------------------------------------------------------------------------
// Read helpers
// ---------------------------------------------------------------------------

/**
 * Read cached branches from localStorage.
 * Returns `null` when no cache, version mismatch, or data is unparsable.
 */
export function readCachedBranches(): Branch[] | null {
  try {
    const raw = localStorage.getItem(KEYS.branches);
    if (!raw) return null;

    const envelope: CacheEnvelope = JSON.parse(raw);
    if (envelope.v !== CACHE_VERSION) return null;
    if (!Array.isArray(envelope.branches) || envelope.branches.length === 0) return null;

    return envelope.branches;
  } catch {
    return null;
  }
}

/**
 * Returns true when cached branches exist but are older than MAX_CACHE_AGE_MS.
 * Used to decide whether to display a background sync indicator.
 */
export function isCacheStale(): boolean {
  try {
    const raw = localStorage.getItem(KEYS.branches);
    if (!raw) return false;
    const envelope: CacheEnvelope = JSON.parse(raw);
    return Date.now() - envelope.ts > MAX_CACHE_AGE_MS;
  } catch {
    return false;
  }
}

/** Read persisted selected branch id (separate key so it survives cache wipes) */
export function readSelectedBranchId(): string | null {
  try {
    return localStorage.getItem(KEYS.selectedId) || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/** Persist the full branch list returned by Supabase */
export function writeCachedBranches(branches: Branch[]): void {
  try {
    const envelope: CacheEnvelope = {
      v: CACHE_VERSION,
      ts: Date.now(),
      branches,
    };
    localStorage.setItem(KEYS.branches, JSON.stringify(envelope));
  } catch {
    // localStorage may be unavailable in private browsing — fail silently
  }
}

/** Persist the user's chosen branch id */
export function writeSelectedBranchId(id: string): void {
  try {
    localStorage.setItem(KEYS.selectedId, id);
  } catch {
    // fail silently
  }
}

/** Remove the branch list cache (but keep the selected id) */
export function clearBranchCache(): void {
  try {
    localStorage.removeItem(KEYS.branches);
  } catch {
    // fail silently
  }
}
