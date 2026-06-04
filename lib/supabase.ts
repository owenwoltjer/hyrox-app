import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SessionLog, GarminEntry } from "./types";

// ---------------------------------------------------------------------------
// Typed Supabase database schema
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      session_logs: {
        Row: SessionLog;
        Insert: Omit<SessionLog, "id" | "updated_at">;
        Update: Partial<Omit<SessionLog, "id">>;
      };
      garmin_logs: {
        Row: GarminEntry;
        Insert: Omit<GarminEntry, "id" | "created_at">;
        Update: Partial<Omit<GarminEntry, "id">>;
      };
    };
  };
}

// ---------------------------------------------------------------------------
// Lazy singleton — the client is created on first call, not at module load.
//
// Next.js 14 loads every route module at build time (even with force-dynamic)
// to inspect exports.  A module-level createClient() call would run during
// that pass, before env vars exist locally.  Deferring to a getter means the
// client is only instantiated inside a real request handler, where Vercel's
// injected env vars are always present.
// ---------------------------------------------------------------------------
let _client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set."
    );
  }

  _client = createClient<Database>(url, key);
  return _client;
}

// ---------------------------------------------------------------------------
// Convenience re-export so callers can write either:
//   import { getSupabase } from "@/lib/supabase"   → getSupabase()
//   import { supabase } from "@/lib/supabase"       → supabase (same thing)
// ---------------------------------------------------------------------------
export const supabase = {
  from: (...args: Parameters<SupabaseClient<Database>["from"]>) =>
    getSupabase().from(...args),
} as unknown as SupabaseClient<Database>;
