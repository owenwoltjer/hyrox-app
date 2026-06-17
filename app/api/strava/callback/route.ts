import { NextRequest, NextResponse } from "next/server";
import { getStravaAdmin } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/today?strava=error`);
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("[strava/callback] token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(`${appUrl}/today?strava=error`);
  }

  const tokenData = await tokenRes.json();
  const athlete = tokenData.athlete ?? {};

  const supabase = getStravaAdmin();

  // Delete any existing token row then insert fresh (simpler than ON CONFLICT unique)
  await supabase.from("strava_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  await supabase.from("strava_tokens").insert({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: tokenData.expires_at,
    athlete_id: athlete.id,
    athlete_name: `${athlete.firstname ?? ""} ${athlete.lastname ?? ""}`.trim() || null,
    athlete_avatar: athlete.profile_medium ?? athlete.profile ?? null,
    last_sync_at: null,
    updated_at: new Date().toISOString(),
  });

  return NextResponse.redirect(`${appUrl}/today?strava=connected`);
}
