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
// Phase 1 Training Plan  ·  June 1 – July 26  ·  8 weeks / 56 days
// ---------------------------------------------------------------------------
export const PHASE_1: TrainingDay[] = [
  // ── Week 1 ─────────────────────────────────────────────────────────────
  {
    week: 1,
    dow: "Mon",
    date: "2025-06-01",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Lift + Run",
    desc: "Upper lift + 5 mile run home",
  },
  {
    week: 1,
    dow: "Tue",
    date: "2025-06-02",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },
  {
    week: 1,
    dow: "Wed",
    date: "2025-06-03",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Erg + Lower",
    desc: "30 min row Zone 2 + lower lift",
  },
  {
    week: 1,
    dow: "Thu",
    date: "2025-06-04",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Speed",
    desc: "6 × 1000m repeats — target 4:10–4:20",
  },
  {
    week: 1,
    dow: "Fri",
    date: "2025-06-05",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "4 miles Zone 2",
  },
  {
    week: 1,
    dow: "Sat",
    date: "2025-06-06",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Bike + HYROX",
    desc: "45–60 min ride + lunge session",
  },
  {
    week: 1,
    dow: "Sun",
    date: "2025-06-07",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },

  // ── Week 2 ─────────────────────────────────────────────────────────────
  {
    week: 2,
    dow: "Mon",
    date: "2025-06-08",
    type: "lift",
    typeLabel: TYPE_LABELS.lift,
    session: "Upper lift",
    desc: "Upper — add small load",
  },
  {
    week: 2,
    dow: "Tue",
    date: "2025-06-09",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "5 miles Zone 2",
  },
  {
    week: 2,
    dow: "Wed",
    date: "2025-06-10",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Erg + Lower",
    desc: "35 min row + lower lift",
  },
  {
    week: 2,
    dow: "Thu",
    date: "2025-06-11",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Speed",
    desc: "6 × 1000m — compare to Week 1",
  },
  {
    week: 2,
    dow: "Fri",
    date: "2025-06-12",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "4 miles Zone 2",
  },
  {
    week: 2,
    dow: "Sat",
    date: "2025-06-13",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Bike + HYROX",
    desc: "60 min ride + Sled + Ski",
  },
  {
    week: 2,
    dow: "Sun",
    date: "2025-06-14",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },

  // ── Week 3 ─────────────────────────────────────────────────────────────
  {
    week: 3,
    dow: "Mon",
    date: "2025-06-15",
    type: "lift",
    typeLabel: TYPE_LABELS.lift,
    session: "Upper lift",
    desc: "Upper — add pull-up set",
  },
  {
    week: 3,
    dow: "Tue",
    date: "2025-06-16",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "5 miles Zone 2",
  },
  {
    week: 3,
    dow: "Wed",
    date: "2025-06-17",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Ski + Lower",
    desc: "35 min ski + lower lift",
  },
  {
    week: 3,
    dow: "Thu",
    date: "2025-06-18",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Endless engine",
    desc: "40 min — every 8 min: 800m at pace",
  },
  {
    week: 3,
    dow: "Fri",
    date: "2025-06-19",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "4–5 miles Zone 2",
  },
  {
    week: 3,
    dow: "Sat",
    date: "2025-06-20",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Bike + HYROX",
    desc: "60 min ride + Broken HYROX 1Ks",
  },
  {
    week: 3,
    dow: "Sun",
    date: "2025-06-21",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },

  // ── Week 4 (Deload) ────────────────────────────────────────────────────
  {
    week: 4,
    dow: "Mon",
    date: "2025-06-22",
    type: "lift",
    typeLabel: TYPE_LABELS.lift,
    session: "Upper — deload",
    desc: "Reduced volume · 3 sets · RPE 6",
  },
  {
    week: 4,
    dow: "Tue",
    date: "2025-06-23",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "3 miles Zone 2",
  },
  {
    week: 4,
    dow: "Wed",
    date: "2025-06-24",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },
  {
    week: 4,
    dow: "Thu",
    date: "2025-06-25",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Speed (short)",
    desc: "4 × 1000m deload",
  },
  {
    week: 4,
    dow: "Fri",
    date: "2025-06-26",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },
  {
    week: 4,
    dow: "Sat",
    date: "2025-06-27",
    type: "bike",
    typeLabel: TYPE_LABELS.bike,
    session: "Bike only",
    desc: "60–75 min easy ride",
  },
  {
    week: 4,
    dow: "Sun",
    date: "2025-06-28",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },

  // ── Week 5 ─────────────────────────────────────────────────────────────
  {
    week: 5,
    dow: "Mon",
    date: "2025-06-29",
    type: "lift",
    typeLabel: TYPE_LABELS.lift,
    session: "Upper lift",
    desc: "Upper — push post-deload",
  },
  {
    week: 5,
    dow: "Tue",
    date: "2025-06-30",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "6 miles Zone 2",
  },
  {
    week: 5,
    dow: "Wed",
    date: "2025-07-01",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Row + Lower",
    desc: "40 min row + lower lift",
  },
  {
    week: 5,
    dow: "Thu",
    date: "2025-07-02",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Speed",
    desc: "6 × 1000m — target 4:05–4:15",
  },
  {
    week: 5,
    dow: "Fri",
    date: "2025-07-03",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "5 miles Zone 2",
  },
  {
    week: 5,
    dow: "Sat",
    date: "2025-07-04",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Bike + HYROX",
    desc: "60–75 min ride + Intro Compromised",
  },
  {
    week: 5,
    dow: "Sun",
    date: "2025-07-05",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },

  // ── Week 6 ─────────────────────────────────────────────────────────────
  {
    week: 6,
    dow: "Mon",
    date: "2025-07-06",
    type: "lift",
    typeLabel: TYPE_LABELS.lift,
    session: "Upper lift",
    desc: "Upper — maintain load",
  },
  {
    week: 6,
    dow: "Tue",
    date: "2025-07-07",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "6 miles Zone 2",
  },
  {
    week: 6,
    dow: "Wed",
    date: "2025-07-08",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Ski + Lower",
    desc: "40 min ski + lower lift",
  },
  {
    week: 6,
    dow: "Thu",
    date: "2025-07-09",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Endless engine",
    desc: "50 min — every 10 min: 1k at pace",
  },
  {
    week: 6,
    dow: "Fri",
    date: "2025-07-10",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "5 miles Zone 2",
  },
  {
    week: 6,
    dow: "Sat",
    date: "2025-07-11",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Bike + HYROX",
    desc: "75 min ride + full station circuit",
  },
  {
    week: 6,
    dow: "Sun",
    date: "2025-07-12",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },

  // ── Week 7 (Heavy) ─────────────────────────────────────────────────────
  {
    week: 7,
    dow: "Mon",
    date: "2025-07-13",
    type: "lift",
    typeLabel: TYPE_LABELS.lift,
    session: "Upper lift",
    desc: "Upper — heavy week",
  },
  {
    week: 7,
    dow: "Tue",
    date: "2025-07-14",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "6 miles Zone 2",
  },
  {
    week: 7,
    dow: "Wed",
    date: "2025-07-15",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Row + Lower",
    desc: "45 min row + lower lift",
  },
  {
    week: 7,
    dow: "Thu",
    date: "2025-07-16",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Speed",
    desc: "6 × 1000m — target 4:00–4:10",
  },
  {
    week: 7,
    dow: "Fri",
    date: "2025-07-17",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "5 miles Zone 2",
  },
  {
    week: 7,
    dow: "Sat",
    date: "2025-07-18",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Bike + HYROX",
    desc: "75 min ride + Compromised 8 (full)",
  },
  {
    week: 7,
    dow: "Sun",
    date: "2025-07-19",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },

  // ── Week 8 (Deload / Phase Exit) ───────────────────────────────────────
  {
    week: 8,
    dow: "Mon",
    date: "2025-07-20",
    type: "lift",
    typeLabel: TYPE_LABELS.lift,
    session: "Upper — deload",
    desc: "Reduced volume",
  },
  {
    week: 8,
    dow: "Tue",
    date: "2025-07-21",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Easy run",
    desc: "4 miles Zone 2",
  },
  {
    week: 8,
    dow: "Wed",
    date: "2025-07-22",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },
  {
    week: 8,
    dow: "Thu",
    date: "2025-07-23",
    type: "run",
    typeLabel: TYPE_LABELS.run,
    session: "Benchmark",
    desc: "6 × 1000m — Phase 1 exit test",
  },
  {
    week: 8,
    dow: "Fri",
    date: "2025-07-24",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },
  {
    week: 8,
    dow: "Sat",
    date: "2025-07-25",
    type: "combo",
    typeLabel: TYPE_LABELS.combo,
    session: "Bike + Benchmark",
    desc: "60 min ride + 100 lunge test",
  },
  {
    week: 8,
    dow: "Sun",
    date: "2025-07-26",
    type: "rest",
    typeLabel: TYPE_LABELS.rest,
    session: "Rest",
    desc: "Full rest day",
  },
];

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Returns a stable composite key for a training day.
 * Format: "YYYY-MM-DD"  (matches session_logs.day_key in Supabase)
 */
export function getDayKey(day: TrainingDay): string {
  return day.date;
}

/**
 * Pure date-string lookup — no `new Date()`, timezone-safe.
 * Pass a "YYYY-MM-DD" string (always sourced from the client browser).
 * Returns the TrainingDay for that date, or undefined if outside Phase 1.
 */
export function getDayByDate(dateStr: string): TrainingDay | undefined {
  return PHASE_1.find((d) => d.date === dateStr);
}

/**
 * Returns all TrainingDays for the given week number (1–8).
 */
export function getWeekDays(week: number): TrainingDay[] {
  return PHASE_1.filter((d) => d.week === week);
}

/**
 * Pure string-based week lookup — no `new Date()`, timezone-safe.
 * Accepts a "YYYY-MM-DD" string (always sourced from the client browser).
 * Returns the week number (1–8), clamped to plan boundaries.
 */
export function getWeekForDate(dateStr: string): number {
  // Exact match inside the plan
  const day = PHASE_1.find((d) => d.date === dateStr);
  if (day) return day.week;

  // Before plan starts
  if (dateStr < PHASE_1[0].date) return 1;
  // After plan ends
  if (dateStr > PHASE_1[PHASE_1.length - 1].date) return 8;

  // Within plan range but not a training day (shouldn't happen, but safe fallback)
  // Find the most recent day that is <= dateStr
  const prior = [...PHASE_1].reverse().find((d) => d.date <= dateStr);
  return prior ? prior.week : 1;
}

// ---------------------------------------------------------------------------
// ⚠️  Legacy helpers — use new Date() so they return the server's UTC date
//     when called during SSR.  Only safe to call from client-side code.
//     Prefer getDayByDate() / getWeekForDate() in components.
// ---------------------------------------------------------------------------

/** @deprecated Use getDayByDate(todayDateStr()) instead */
export function isToday(dateStr: string): boolean {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return dateStr === `${y}-${m}-${d}`;
}

/** @deprecated Use getDayByDate(todayDateStr()) instead */
export function getTodayDay(): TrainingDay | undefined {
  return PHASE_1.find((d) => isToday(d.date));
}

/** @deprecated Use getWeekForDate(todayDateStr()) instead */
export function getCurrentWeek(): number {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return getWeekForDate(`${y}-${m}-${d}`);
}
