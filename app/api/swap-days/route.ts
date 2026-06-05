/**
 * POST /api/swap-days
 *
 * Swaps the session content between two training_plan rows (by day_key),
 * then swaps any matching session_logs so logs follow the content to the
 * new calendar date.
 *
 * Uses the service role key so it can bypass the anon-read-only RLS
 * policy on training_plan.
 *
 * Body: { keyA: string, keyB: string }
 *
 * Returns: { data: { sessionMovedTo: string }, error: null }
 *       or { data: null, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface PlanRow {
  day_key: string;
  dow: string;
  date: string;
  type: string;
  type_label: string;
  session_name: string;
  description: string;
  is_rest: boolean;
  original_session_name: string | null;
  original_description: string | null;
}

export async function POST(request: NextRequest) {
  let keyA: string, keyB: string;
  try {
    ({ keyA, keyB } = await request.json());
  } catch {
    return NextResponse.json({ data: null, error: "Invalid JSON body" }, { status: 400 });
  }

  if (!keyA || !keyB || keyA === keyB) {
    return NextResponse.json({ data: null, error: "keyA and keyB must be different non-empty strings" }, { status: 400 });
  }

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ data: null, error: "Missing Supabase env vars" }, { status: 500 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  // ── 1. Fetch both training_plan rows ──────────────────────────────────────
  const { data: planRows, error: planFetchErr } = await supabase
    .from("training_plan")
    .select("day_key, dow, date, type, type_label, session_name, description, is_rest, original_session_name, original_description")
    .in("day_key", [keyA, keyB]);

  if (planFetchErr) {
    console.error("[SWAP] plan fetch error:", planFetchErr.message);
    return NextResponse.json({ data: null, error: "Failed to fetch plan: " + planFetchErr.message }, { status: 500 });
  }

  const rowA = (planRows as PlanRow[])?.find((r) => r.day_key === keyA);
  const rowB = (planRows as PlanRow[])?.find((r) => r.day_key === keyB);

  if (!rowA || !rowB) {
    return NextResponse.json({ data: null, error: `Day(s) not found in training_plan: ${!rowA ? keyA : ""} ${!rowB ? keyB : ""}`.trim() }, { status: 404 });
  }

  // ── 2. Swap session content in training_plan ──────────────────────────────
  //    Keep dow/date/day_key/week_number in place; only swap the workout fields.
  //    Record original values if not already modified.
  const { error: updateAErr } = await supabase
    .from("training_plan")
    .update({
      type:                  rowB.type,
      type_label:            rowB.type_label,
      session_name:          rowB.session_name,
      description:           rowB.description,
      is_rest:               rowB.is_rest,
      is_modified:           true,
      original_session_name: rowA.original_session_name ?? rowA.session_name,
      original_description:  rowA.original_description  ?? rowA.description,
      modified_at:           now,
      modified_reason:       `Swapped with ${keyB}`,
    })
    .eq("day_key", keyA);

  if (updateAErr) {
    console.error("[SWAP] update A error:", updateAErr.message);
    return NextResponse.json({ data: null, error: "Failed to update plan row A: " + updateAErr.message }, { status: 500 });
  }

  const { error: updateBErr } = await supabase
    .from("training_plan")
    .update({
      type:                  rowA.type,
      type_label:            rowA.type_label,
      session_name:          rowA.session_name,
      description:           rowA.description,
      is_rest:               rowA.is_rest,
      is_modified:           true,
      original_session_name: rowB.original_session_name ?? rowB.session_name,
      original_description:  rowB.original_description  ?? rowB.description,
      modified_at:           now,
      modified_reason:       `Swapped with ${keyA}`,
    })
    .eq("day_key", keyB);

  if (updateBErr) {
    console.error("[SWAP] update B error:", updateBErr.message);
    return NextResponse.json({ data: null, error: "Failed to update plan row B: " + updateBErr.message }, { status: 500 });
  }

  // ── 3. Swap session_logs ──────────────────────────────────────────────────
  const { data: logRows } = await supabase
    .from("session_logs")
    .select("*")
    .in("day_key", [keyA, keyB]);

  const logA = logRows?.find((l) => l.day_key === keyA) ?? null;
  const logB = logRows?.find((l) => l.day_key === keyB) ?? null;

  if (logA && logB) {
    // Both slots have logs — delete both, re-insert with swapped calendar data.
    const { id: _idA, ...dataA } = logA as { id: string } & Record<string, unknown>;
    const { id: _idB, ...dataB } = logB as { id: string } & Record<string, unknown>;

    await supabase.from("session_logs").delete().in("day_key", [keyA, keyB]);

    await supabase.from("session_logs").insert([
      { ...dataA, day_key: keyB, date: rowB.date, dow: rowB.dow, updated_at: now },
      { ...dataB, day_key: keyA, date: rowA.date, dow: rowA.dow, updated_at: now },
    ]);
  } else if (logA) {
    // Only A has a log — move it to B's calendar slot.
    await supabase
      .from("session_logs")
      .update({ day_key: keyB, date: rowB.date, dow: rowB.dow, updated_at: now })
      .eq("day_key", keyA);
  } else if (logB) {
    // Only B has a log — move it to A's calendar slot.
    await supabase
      .from("session_logs")
      .update({ day_key: keyA, date: rowA.date, dow: rowA.dow, updated_at: now })
      .eq("day_key", keyB);
  }
  // Neither has a log — no session_logs changes needed.

  console.log(`[SWAP] ${keyA} ↔ ${keyB} complete. logA=${!!logA} logB=${!!logB}`);

  return NextResponse.json({
    data: {
      // Surface enough for the client toast: "Moved [session] to [day]"
      movedSession: rowA.session_name,   // content from A is now at B
      movedTo:      `${rowB.dow} ${rowB.date}`,
    },
    error: null,
  });
}
