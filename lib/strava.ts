// ---------------------------------------------------------------------------
// Strava — server-only helpers (service role Supabase, token refresh)
// ---------------------------------------------------------------------------
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Service-role Supabase client (bypasses RLS — never expose to client)
// ---------------------------------------------------------------------------
let _admin: SupabaseClient | null = null;
export function getStravaAdmin(): SupabaseClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  _admin = createClient(url, key, { auth: { persistSession: false } });
  return _admin;
}

// ---------------------------------------------------------------------------
// Token shape
// ---------------------------------------------------------------------------
export interface StravaTokenRow {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete_id: number;
  athlete_name: string | null;
  athlete_avatar: string | null;
  last_sync_at: string | null;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Retrieve a valid (non-expired) access token, refreshing if needed
// ---------------------------------------------------------------------------
export async function getValidToken(): Promise<StravaTokenRow | null> {
  const supabase = getStravaAdmin();
  const { data } = await supabase
    .from("strava_tokens")
    .select("*")
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  const now = Math.floor(Date.now() / 1000);
  if (now < (data as StravaTokenRow).expires_at - 300) {
    return data as StravaTokenRow;
  }

  // Token expired — refresh
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: (data as StravaTokenRow).refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    console.error("[strava] token refresh failed:", await res.text());
    return null;
  }

  const refreshed = await res.json();
  const updated = {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token ?? (data as StravaTokenRow).refresh_token,
    expires_at: refreshed.expires_at,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from("strava_tokens")
    .update(updated)
    .eq("id", (data as StravaTokenRow).id);

  return { ...(data as StravaTokenRow), ...updated };
}

// ---------------------------------------------------------------------------
// Convert Strava UTC timestamp → day_key ("Jun_13")
// ---------------------------------------------------------------------------
export function stravaDateToDayKey(startDate: string): string {
  const d = new Date(startDate);
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return `${months[d.getUTCMonth()]}_${d.getUTCDate()}`;
}
