"use client";

import { createClient } from "@supabase/supabase-js";

// Browser-side Supabase client with anon key
// Used for Realtime subscriptions in the dashboard
let client: ReturnType<typeof createClient> | null = null;

export function createBrowserSupabaseClient() {
  if (client) return client;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase public environment variables");
  }

  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
}
