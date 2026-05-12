import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side admin client that bypasses RLS using the service role key.
 * Lazy singleton — instantiated on first call, not at import time,
 * so the build phase never fails when env vars are absent.
 * NEVER import this in client components or expose to the browser.
 */
let _client: SupabaseClient | null = null;

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_client) {
      _client = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
    }
    const value = (_client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(_client) : value;
  },
});
