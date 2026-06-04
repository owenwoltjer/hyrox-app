import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import type { GarminEntry } from "@/lib/types";

// ---------------------------------------------------------------------------
// GET /api/garmin
// Returns all Garmin entries ordered by date descending.
// Optional query param: ?limit=N  to cap results (default 30).
// ---------------------------------------------------------------------------
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30", 10), 90);

  const { data, error } = await supabase
    .from("garmin_logs")
    .select("*")
    .order("date", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, error: null });
}

// ---------------------------------------------------------------------------
// POST /api/garmin
// Inserts a new Garmin entry. Upserts on `date` to prevent duplicates.
// Body: Omit<GarminEntry, "id" | "created_at">
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let body: Partial<GarminEntry>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!body.date) {
    return NextResponse.json(
      { data: null, error: "Missing required field: date" },
      { status: 400 }
    );
  }

  const payload = {
    date: body.date,
    sleep_score: body.sleep_score ?? null,
    avg_hr: body.avg_hr ?? null,
    vo2_max: body.vo2_max ?? null,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("garmin_logs")
    .upsert(payload, { onConflict: "date" })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/garmin?id=<uuid>
// Deletes a single Garmin entry by id.
// ---------------------------------------------------------------------------
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { data: null, error: "Missing required query param: id" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("garmin_logs")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: { deleted: id }, error: null });
}
