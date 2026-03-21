import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseAdmin() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return cachedAdminClient;
}

export function requireSupabaseAdmin() {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error("Supabase admin client is not configured");
  }
  return client;
}

export const PATCHPILOT_ARTIFACTS_BUCKET = "patchpilot-artifacts";
export const PATCHPILOT_RECEIPTS_BUCKET = "patchpilot-receipts";
