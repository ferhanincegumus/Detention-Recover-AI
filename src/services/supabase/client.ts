import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/config/env";

let client: SupabaseClient | null = null;

/**
 * Lazily-created Supabase client. Only constructed when the app runs in
 * `supabase` backend mode, so the mock build never needs Supabase config.
 */
export function getSupabase(): SupabaseClient {
  if (!client) {
    if (!env.supabase.url || !env.supabase.anonKey) {
      throw new Error(
        "Supabase backend selected but VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set.",
      );
    }
    client = createClient(env.supabase.url, env.supabase.anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** Base URL for invoking Edge Functions (public endpoints like lead intake). */
export function functionsBaseUrl(): string {
  if (env.supabase.functionsUrl) return env.supabase.functionsUrl.replace(/\/$/, "");
  // Derive from the project URL: https://<ref>.supabase.co → .../functions/v1
  return `${env.supabase.url.replace(/\/$/, "")}/functions/v1`;
}

/** The authenticated admin's user id (owner_id for all rows). */
export async function currentOwnerId(): Promise<string> {
  const { data } = await getSupabase().auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error("Not authenticated");
  return id;
}
