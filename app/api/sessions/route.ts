import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { SessionLog } from "@/lib/types";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/sessions
// Returns all session logs ordered by date descending.
// Optional query param: ?day_key=YYYY-MM-DD  to filter to a single day.
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dayKey = searchParams.get("day_key");

  let query = supabase
    .from("session_logs")
    .select("*")
    .order("date", { ascending: false });

  if (dayKey) {
    query = query.eq("day_key", dayKey);
  }

  console.log("[HYROX API] GET sessions called at:", new Date().toISOString());
  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  console.log("[HYROX API] returning", data?.length ?? 0, "sessions");
  return NextResponse.json({ data, error: null }, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate" },
  });
}

// ---------------------------------------------------------------------------
// POST /api/sessions
// Upserts a session log. The `day_key` field is used as the conflict key.
// Body: Partial<SessionLog> — must include `day_key`.
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let body: Partial<SessionLog>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.day_key) {
    return NextResponse.json(
      { data: null, error: "Missing required field: day_key" },
      { status: 400 }
    );
  }

  // Ensure updated_at is always refreshed on upsert
  const payload = {
    ...body,
    updated_at: new Date().toISOString(),
  };

  console.log("[HYROX API] POST sessions called with:", JSON.stringify(body));
  const { data, error } = await supabase
    .from("session_logs")
    .upsert(payload as any, { onConflict: "day_key" })
    .select()
    .single();

  console.log("[HYROX API] upsert result:", JSON.stringify(data), "error:", JSON.stringify(error));
  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 200 });
}
