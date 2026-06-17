import { NextResponse } from "next/server";
import { getStravaAdmin } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = getStravaAdmin();
  const { data, error } = await supabase
    .from("strava_tokens")
    .select("athlete_name, athlete_avatar, last_sync_at")
    .limit(1)
    .maybeSingle();

  if (error) {
    // Table might not exist yet — return not connected silently
    return NextResponse.json({ connected: false });
  }

  if (!data) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    athlete_name: (data as { athlete_name: string | null }).athlete_name,
    athlete_avatar: (data as { athlete_avatar: string | null }).athlete_avatar,
    last_sync: (data as { last_sync_at: string | null }).last_sync_at,
  });
}
