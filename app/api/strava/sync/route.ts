import { NextResponse } from "next/server";
import { getStravaAdmin, getValidToken, stravaDateToDayKey } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = await getValidToken();
  if (!token) {
    return NextResponse.json(
      { error: "Not connected to Strava" },
      { status: 401 }
    );
  }

  const authHeader = { Authorization: `Bearer ${token.access_token}` };

  // Fetch the last 30 activities (list-level data)
  const listRes = await fetch(
    "https://www.strava.com/api/v3/athlete/activities?per_page=30",
    { headers: authHeader }
  );
  if (!listRes.ok) {
    return NextResponse.json(
      { error: `Strava list fetch failed: ${listRes.status}` },
      { status: 500 }
    );
  }

  const activities: Record<string, unknown>[] = await listRes.json();
  const supabase = getStravaAdmin();
  let synced = 0;

  for (const act of activities) {
    // Fetch full detail (includes splits_metric, laps, best_efforts, map.polyline)
    let full: Record<string, unknown> = act;
    try {
      const detailRes = await fetch(
        `https://www.strava.com/api/v3/activities/${act.id}`,
        { headers: authHeader }
      );
      if (detailRes.ok) full = await detailRes.json();
    } catch {
      // fall back to list-level data
    }

    const mapObj = full.map as Record<string, string> | null;
    const dayKey = stravaDateToDayKey(full.start_date as string);

    await supabase.from("strava_activities").upsert(
      {
        strava_id: full.id,
        day_key: dayKey,
        name: full.name ?? null,
        type: full.type ?? null,
        sport_type: full.sport_type ?? null,
        start_date: full.start_date ?? null,
        distance: full.distance ?? null,
        moving_time: full.moving_time ?? null,
        elapsed_time: full.elapsed_time ?? null,
        total_elevation_gain: full.total_elevation_gain ?? null,
        average_speed: full.average_speed ?? null,
        max_speed: full.max_speed ?? null,
        average_heartrate: full.average_heartrate ?? null,
        max_heartrate: full.max_heartrate ?? null,
        average_cadence: full.average_cadence ?? null,
        suffer_score: full.suffer_score ?? null,
        calories: full.calories ?? null,
        map_polyline: mapObj?.polyline ?? null,
        map_summary_polyline: mapObj?.summary_polyline ?? null,
        splits_metric: full.splits_metric ?? null,
        laps: full.laps ?? null,
        best_efforts: full.best_efforts ?? null,
        raw_data: full,
      },
      { onConflict: "strava_id" }
    );
    synced++;
  }

  // Record sync time
  await supabase
    .from("strava_tokens")
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", token.id);

  return NextResponse.json({ synced });
}
