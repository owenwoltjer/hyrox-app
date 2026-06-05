import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TrainingDay } from "@/lib/types";

export const dynamic = "force-dynamic";

interface DbRow {
  day_key: string;
  week_number: number;
  dow: string;
  date: string;
  type: string;
  type_label: string;
  session_name: string;
  description: string;
}

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json(
      { data: null, error: "Missing Supabase env vars" },
      { status: 500 }
    );
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from("training_plan")
    .select("day_key, week_number, dow, date, type, type_label, session_name, description")
    .order("week_number", { ascending: true })
    .order("date", { ascending: true });

  if (error) {
    console.error("[API] training-plan fetch error:", error.message);
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  const days: TrainingDay[] = (data as DbRow[]).map((row) => ({
    week: row.week_number,
    dow: row.dow,
    date: row.date,
    type: row.type as TrainingDay["type"],
    typeLabel: row.type_label,
    session: row.session_name,
    desc: row.description,
  }));

  console.log("[API] training-plan returning", days.length, "rows");

  return NextResponse.json(days, {
    headers: { "Cache-Control": "no-store" },
  });
}
