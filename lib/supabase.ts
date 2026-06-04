import { createClient } from "@supabase/supabase-js";
import type { SessionLog, GarminEntry } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  throw new Error(
    "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

// Typed Supabase database schema
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

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
