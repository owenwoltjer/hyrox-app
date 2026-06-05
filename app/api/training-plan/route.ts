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

  // Order by week_number only — do NOT order by date text, because "Jun 10"
  // sorts before "Jun 8" alphabetically ("1" < "8").  Within each week, the
  // DOW_ORDER sort below guarantees Mon → Sun regardless of date string format.
  const { data, error } = await supabase
    .from("training_plan")
    .select("day_key, week_number, dow, date, type, type_label, session_name, description")
    .order("week_number", { ascending: true });

  if (error) {
    console.error("[API] training-plan fetch error:", error.message);
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    );
  }

  const DOW_ORDER: Record<string, number> = {
    Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6,
  };

  const days: TrainingDay[] = (data as DbRow[])
    .map((row) => ({
      week: row.week_number,
      dow: row.dow,
      date: row.date,
      type: row.type as TrainingDay["type"],
      typeLabel: row.type_label,
      session: row.session_name,
      desc: row.description,
    }))
    .sort((a, b) => {
      if (a.week !== b.week) return a.week - b.week;
      return (DOW_ORDER[a.dow] ?? 7) - (DOW_ORDER[b.dow] ?? 7);
    });

  console.log("[API] training-plan returning", days.length, "rows");

  return NextResponse.json(days, {
    headers: { "Cache-Control": "no-store" },
  });
}
