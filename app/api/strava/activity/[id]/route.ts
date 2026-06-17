import { NextRequest, NextResponse } from "next/server";
import { getValidToken } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = await getValidToken();
  if (!token) {
    return NextResponse.json({ error: "Not connected to Strava" }, { status: 401 });
  }

  const keys = "latlng,heartrate,velocity_smooth,altitude,cadence,watts,temp";
  const res = await fetch(
    `https://www.strava.com/api/v3/activities/${params.id}/streams?keys=${keys}&key_by_type=true`,
    { headers: { Authorization: `Bearer ${token.access_token}` } }
  );

  if (!res.ok) {
    return NextResponse.json(
      { error: `Strava streams fetch failed: ${res.status}` },
      { status: res.status }
    );
  }

  return NextResponse.json(await res.json());
}
