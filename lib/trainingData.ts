import type { TrainingDay, WorkoutType } from "./types";

// ---------------------------------------------------------------------------
// Helper: map WorkoutType → human-readable label
// ---------------------------------------------------------------------------
const TYPE_LABELS: Record<WorkoutType, string> = {
  run: "Run",
  lift: "Lift",
  combo: "Combo",
  rest: "Rest",
  bike: "Bike",
  hyrox: "HYROX",
};

// ---------------------------------------------------------------------------
// Phase 1 Training Plan  ·  Jun 1 – Jul 26  ·  8 weeks / 56 days
//
// Dates are stored as "Mon D" (e.g. "Jun 4") with NO year so the plan works
// regardless of which calendar year the athlete runs it.  The matching
// helper uses the same format so new Date() year differences can't break it.
// ---------------------------------------------------------------------------
export const PHASE_1: TrainingDay[] = [
  // ── Week 1 ─────────────────────────────────────────────────────────────
  { week: 1, dow: "Mon", date: "Jun 1",  type: "combo", typeLabel: TYPE_LABELS.combo, session: "Lift + Run",      desc: "Upper lift + 5 mile run home" },
  { week: 1, dow: "Tue", date: "Jun 2",  type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },
  { week: 1, dow: "Wed", date: "Jun 3",  type: "combo", typeLabel: TYPE_LABELS.combo, session: "Erg + Lower",     desc: "30 min row Zone 2 + lower lift" },
  { week: 1, dow: "Thu", date: "Jun 4",  type: "run",   typeLabel: TYPE_LABELS.run,   session: "Speed",           desc: "6 × 1000m repeats — target 4:10–4:20" },
  { week: 1, dow: "Fri", date: "Jun 5",  type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "4 miles Zone 2" },
  { week: 1, dow: "Sat", date: "Jun 6",  type: "combo", typeLabel: TYPE_LABELS.combo, session: "Bike + HYROX",   desc: "45–60 min ride + lunge session" },
  { week: 1, dow: "Sun", date: "Jun 7",  type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },

  // ── Week 2 ─────────────────────────────────────────────────────────────
  { week: 2, dow: "Mon", date: "Jun 8",  type: "lift",  typeLabel: TYPE_LABELS.lift,  session: "Upper lift",      desc: "Upper — add small load" },
  { week: 2, dow: "Tue", date: "Jun 9",  type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "5 miles Zone 2" },
  { week: 2, dow: "Wed", date: "Jun 10", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Erg + Lower",     desc: "35 min row + lower lift" },
  { week: 2, dow: "Thu", date: "Jun 11", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Speed",           desc: "6 × 1000m — compare to Week 1" },
  { week: 2, dow: "Fri", date: "Jun 12", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "4 miles Zone 2" },
  { week: 2, dow: "Sat", date: "Jun 13", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Bike + HYROX",   desc: "60 min ride + Sled + Ski" },
  { week: 2, dow: "Sun", date: "Jun 14", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },

  // ── Week 3 ─────────────────────────────────────────────────────────────
  { week: 3, dow: "Mon", date: "Jun 15", type: "lift",  typeLabel: TYPE_LABELS.lift,  session: "Upper lift",      desc: "Upper — add pull-up set" },
  { week: 3, dow: "Tue", date: "Jun 16", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "5 miles Zone 2" },
  { week: 3, dow: "Wed", date: "Jun 17", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Ski + Lower",     desc: "35 min ski + lower lift" },
  { week: 3, dow: "Thu", date: "Jun 18", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Endless engine",  desc: "40 min — every 8 min: 800m at pace" },
  { week: 3, dow: "Fri", date: "Jun 19", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "4–5 miles Zone 2" },
  { week: 3, dow: "Sat", date: "Jun 20", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Bike + HYROX",   desc: "60 min ride + Broken HYROX 1Ks" },
  { week: 3, dow: "Sun", date: "Jun 21", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },

  // ── Week 4 (Deload) ────────────────────────────────────────────────────
  { week: 4, dow: "Mon", date: "Jun 22", type: "lift",  typeLabel: TYPE_LABELS.lift,  session: "Upper — deload",  desc: "Reduced volume · 3 sets · RPE 6" },
  { week: 4, dow: "Tue", date: "Jun 23", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "3 miles Zone 2" },
  { week: 4, dow: "Wed", date: "Jun 24", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },
  { week: 4, dow: "Thu", date: "Jun 25", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Speed (short)",   desc: "4 × 1000m deload" },
  { week: 4, dow: "Fri", date: "Jun 26", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },
  { week: 4, dow: "Sat", date: "Jun 27", type: "bike",  typeLabel: TYPE_LABELS.bike,  session: "Bike only",       desc: "60–75 min easy ride" },
  { week: 4, dow: "Sun", date: "Jun 28", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },

  // ── Week 5 ─────────────────────────────────────────────────────────────
  { week: 5, dow: "Mon", date: "Jun 29", type: "lift",  typeLabel: TYPE_LABELS.lift,  session: "Upper lift",      desc: "Upper — push post-deload" },
  { week: 5, dow: "Tue", date: "Jun 30", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "6 miles Zone 2" },
  { week: 5, dow: "Wed", date: "Jul 1",  type: "combo", typeLabel: TYPE_LABELS.combo, session: "Row + Lower",     desc: "40 min row + lower lift" },
  { week: 5, dow: "Thu", date: "Jul 2",  type: "run",   typeLabel: TYPE_LABELS.run,   session: "Speed",           desc: "6 × 1000m — target 4:05–4:15" },
  { week: 5, dow: "Fri", date: "Jul 3",  type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "5 miles Zone 2" },
  { week: 5, dow: "Sat", date: "Jul 4",  type: "combo", typeLabel: TYPE_LABELS.combo, session: "Bike + HYROX",   desc: "60–75 min ride + Intro Compromised" },
  { week: 5, dow: "Sun", date: "Jul 5",  type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },

  // ── Week 6 ─────────────────────────────────────────────────────────────
  { week: 6, dow: "Mon", date: "Jul 6",  type: "lift",  typeLabel: TYPE_LABELS.lift,  session: "Upper lift",      desc: "Upper — maintain load" },
  { week: 6, dow: "Tue", date: "Jul 7",  type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "6 miles Zone 2" },
  { week: 6, dow: "Wed", date: "Jul 8",  type: "combo", typeLabel: TYPE_LABELS.combo, session: "Ski + Lower",     desc: "40 min ski + lower lift" },
  { week: 6, dow: "Thu", date: "Jul 9",  type: "run",   typeLabel: TYPE_LABELS.run,   session: "Endless engine",  desc: "50 min — every 10 min: 1k at pace" },
  { week: 6, dow: "Fri", date: "Jul 10", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "5 miles Zone 2" },
  { week: 6, dow: "Sat", date: "Jul 11", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Bike + HYROX",   desc: "75 min ride + full station circuit" },
  { week: 6, dow: "Sun", date: "Jul 12", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },

  // ── Week 7 (Heavy) ─────────────────────────────────────────────────────
  { week: 7, dow: "Mon", date: "Jul 13", type: "lift",  typeLabel: TYPE_LABELS.lift,  session: "Upper lift",      desc: "Upper — heavy week" },
  { week: 7, dow: "Tue", date: "Jul 14", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "6 miles Zone 2" },
  { week: 7, dow: "Wed", date: "Jul 15", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Row + Lower",     desc: "45 min row + lower lift" },
  { week: 7, dow: "Thu", date: "Jul 16", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Speed",           desc: "6 × 1000m — target 4:00–4:10" },
  { week: 7, dow: "Fri", date: "Jul 17", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "5 miles Zone 2" },
  { week: 7, dow: "Sat", date: "Jul 18", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Bike + HYROX",   desc: "75 min ride + Compromised 8 (full)" },
  { week: 7, dow: "Sun", date: "Jul 19", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },

  // ── Week 8 (Deload / Phase Exit) ───────────────────────────────────────
  { week: 8, dow: "Mon", date: "Jul 20", type: "lift",  typeLabel: TYPE_LABELS.lift,  session: "Upper — deload",  desc: "Reduced volume" },
  { week: 8, dow: "Tue", date: "Jul 21", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Easy run",        desc: "4 miles Zone 2" },
  { week: 8, dow: "Wed", date: "Jul 22", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },
  { week: 8, dow: "Thu", date: "Jul 23", type: "run",   typeLabel: TYPE_LABELS.run,   session: "Benchmark",       desc: "6 × 1000m — Phase 1 exit test" },
  { week: 8, dow: "Fri", date: "Jul 24", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },
  { week: 8, dow: "Sat", date: "Jul 25", type: "combo", typeLabel: TYPE_LABELS.combo, session: "Bike + Benchmark", desc: "60 min ride + 100 lunge test" },
  { week: 8, dow: "Sun", date: "Jul 26", type: "rest",  typeLabel: TYPE_LABELS.rest,  session: "Rest",            desc: "Full rest day" },
];

// ---------------------------------------------------------------------------
// Core date helper — used everywhere to build "today" string
// ---------------------------------------------------------------------------

/**
 * Returns today's date as "Mon D" (e.g. "Jun 4") in the user's LOCAL timezone.
 * No year → plan works in any calendar year.
 * ONLY call this inside useEffect / event handlers (browser-side), never at
 * module load time on the server.
 */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
export function localDateStr(): string {
  const now = new Date();
  return `${MONTHS[now.getMonth()]} ${now.getDate()}`;
}

// ---------------------------------------------------------------------------
// Stable key used in URLs and as session_logs.day_key in Supabase.
// "Jun 4"  →  "Jun_4"  (space → underscore, URL-safe, no encoding needed)
// ---------------------------------------------------------------------------
export function getDayKey(day: TrainingDay): string {
  return day.date.replace(" ", "_");
}

/**
 * Reverse of getDayKey: "Jun_4" → "Jun 4" for looking up in PHASE_1.
 */
export function dateFromDayKey(dayKey: string): string {
  return dayKey.replace("_", " ");
}

// ---------------------------------------------------------------------------
// Lookup helpers — pure array operations, no new Date()
// ---------------------------------------------------------------------------

/**
 * Find a training day by its "Mon D" date string (e.g. "Jun 4").
 */
export function getDayByDate(dateStr: string): TrainingDay | undefined {
  return PHASE_1.find((d) => d.date === dateStr);
}

/**
 * Find a training day by its URL-safe dayKey (e.g. "Jun_4").
 */
export function getDayByKey(dayKey: string): TrainingDay | undefined {
  return PHASE_1.find((d) => getDayKey(d) === dayKey);
}

/**
 * Returns all TrainingDays for the given week number (1–8).
 */
export function getWeekDays(week: number): TrainingDay[] {
  return PHASE_1.filter((d) => d.week === week);
}

/**
 * Returns the week number for a given "Mon D" date string.
 * Falls back to 1 if the date is outside the plan.
 */
export function getWeekForDate(dateStr: string): number {
  const day = PHASE_1.find((d) => d.date === dateStr);
  if (day) return day.week;
  // Before plan or not found → default to week 1
  return 1;
}

/**
 * Returns the array index of a date string in PHASE_1 (-1 if not found).
 * Use this for "is past / is future" comparisons instead of string comparison,
 * since "Jun 4" strings aren't naturally sortable across months.
 */
export function getDayIndex(dateStr: string): number {
  return PHASE_1.findIndex((d) => d.date === dateStr);
}

// ---------------------------------------------------------------------------
// Legacy / deprecated — kept so existing callers don't break at build time.
// All call new Date() so they must only run in browser (useEffect) context.
// ---------------------------------------------------------------------------

/** @deprecated Use getDayByDate(localDateStr()) inside useEffect instead. */
export function isToday(dateStr: string): boolean {
  return dateStr === localDateStr();
}

/** @deprecated Use getDayByDate(localDateStr()) inside useEffect instead. */
export function getTodayDay(): TrainingDay | undefined {
  return getDayByDate(localDateStr());
}

/** @deprecated Use getWeekForDate(localDateStr()) inside useEffect instead. */
export function getCurrentWeek(): number {
  return getWeekForDate(localDateStr());
}
