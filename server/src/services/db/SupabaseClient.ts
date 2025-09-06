import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/supabase.generated.js';

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) {
    console.warn('[Supabase] Missing SUPABASE_URL; DB access disabled');
    return null;
  }
  if (!serviceKey) {
    console.warn('[Supabase] Missing SUPABASE_SERVICE_ROLE_KEY; server requires service role key');
    return null;
  }
  client = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
    global: { headers: { 'x-veyra-server': 'true' } }
  });
  return client;
}
