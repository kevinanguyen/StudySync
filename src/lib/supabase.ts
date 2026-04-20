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

export const supabase: SupabaseClient<Database> = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    lock: passThroughLock,
  },
});
