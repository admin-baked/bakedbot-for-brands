/**
 * Supabase client — server-side only (service role key).
 * Used for the cannabis science knowledge base (pgvector).
 * Lazy-initialized so missing env vars don't crash unrelated routes.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  _client = createClient(url, serviceKey, { auth: { persistSession: false } });
  return _client;
}
