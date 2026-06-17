import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!clientId) {
    return NextResponse.json(
      { error: "Strava not configured — set STRAVA_CLIENT_ID" },
      { status: 500 }
    );
  }

  const url = new URL("https://www.strava.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", `${appUrl}/api/strava/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "read,activity:read_all");
  url.searchParams.set("approval_prompt", "auto");

  return NextResponse.redirect(url.toString());
}
