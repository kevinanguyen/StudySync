import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/db';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env.local and fill in your Supabase project URL and anon key.'
  );
}

// Pass-through lock — disables supabase-js navigator-lock, which can deadlock
// in Chrome when a previous page crashed without releasing the lock. We run
// as a single-tab SPA so cross-tab coordination is unnecessary for MVP.
// See: https://github.com/supabase/auth-js/issues/841
const passThroughLock = async <R>(_name: string, _timeout: number, fn: () => Promise<R>): Promise<R> => fn();

/** Default safety timeout for every Supabase REST / Auth request. */
export const SUPABASE_FETCH_TIMEOUT_MS = 10_000;

/**
 * Wraps global `fetch` with an AbortController timeout so stuck connections
 * — e.g. an auth refresh paused while the tab was on a backgrounded macOS
 * Space — fail in bounded time instead of blocking every subsequent query.
 * If the caller passed its own AbortSignal, we honor both.
 */
function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Supabase request timed out')), SUPABASE_FETCH_TIMEOUT_MS);

  // If the caller already supplied a signal, forward its abort to ours.
  if (init.signal) {
    if (init.signal.aborted) controller.abort(init.signal.reason);
    else init.signal.addEventListener('abort', () => controller.abort(init.signal?.reason), { once: true });
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
}

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: passThroughLock,
  },
  global: {
    fetch: fetchWithTimeout,
  },
});
