/**
 * Races a thenable (Promise or PromiseLike) against a configurable timeout.
 *
 * If the original thenable does not resolve or reject within `ms` milliseconds,
 * this helper rejects with a clear error message. This prevents Supabase (or any
 * other async) requests from hanging forever when the remote server is paused,
 * unreachable, or has a long cold-start time.
 *
 * Accepts PromiseLike<T> so Supabase's PostgrestBuilder (which implements .then()
 * but is not a native Promise) can be passed directly without type errors.
 *
 * Usage:
 *   const result = await withTimeout(supabase.from('x').select(), 15_000, 'Loading menu');
 */
export function withTimeout<T>(thenable: PromiseLike<T>, ms: number, label = 'Request'): Promise<T> {
  // Convert to a native Promise so we can use Promise.race() and .finally()
  const promise = Promise.resolve(thenable);

  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms / 1000}s. Please check your connection and try again.`));
    }, ms);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer);
  });
}

