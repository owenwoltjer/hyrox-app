import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import type { SessionLog, GarminEntry } from "@/lib/types";
import { formatPacePerMile } from "@/lib/stravaUtils";

export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// Athlete profile — included in every system prompt
// ---------------------------------------------------------------------------
const ATHLETE_PROFILE = `
ATHLETE PROFILE — Owen Woltjer
- Height: 6'5"  |  Weight: 220 lbs
- Background: Former NAIA All-American distance runner
- 5k PR: 15:07
- Goal: Sub-60 HYROX Open by November 20, 2026
- Primary limiters: Running under fatigue, walking lunges
- Training structure: 24-week periodised plan (Phase 1–4)
  • Phase 1 (weeks 1-8): Base build — Jun 1 – Jul 26
  • Phase 2 (weeks 9-17): Threshold + HYROX specificity — Jul 27 – Sep 27
  • Phase 3 (weeks 18-21): Race-specific sharpening — Sep 28 – Oct 25
  • Phase 4 (weeks 22-24): Taper + Race Week — Oct 26 – Nov 20
`.trim();

// ---------------------------------------------------------------------------
// POST /api/review
// Reads all session logs + Garmin data from Supabase, builds a context
// prompt, and returns an AI coach response using Claude.
//
// Body: { question: string }
// Response: { response: string, planUpdated: boolean }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let question = "Give me a weekly training review and recommendations.";

  try {
    const body = await request.json();
    if (body.question && typeof body.question === "string") {
      question = body.question;
    }
  } catch {
    // No body is fine — use default question
  }

  // ── 1. Fetch all session logs ──────────────────────────────────────────────
  const { data: sessions, error: sessionsError } = await supabase
    .from("session_logs")
    .select("*")
    .order("date", { ascending: true });

  if (sessionsError) {
    return NextResponse.json(
      { response: null, planUpdated: false, error: `Failed to fetch sessions: ${sessionsError.message}` },
      { status: 500 }
    );
  }

  // ── 2. Fetch all Garmin data ───────────────────────────────────────────────
  const { data: garmin, error: garminError } = await supabase
    .from("garmin_logs")
    .select("*")
    .order("date", { ascending: false })
    .limit(30);

  if (garminError) {
    return NextResponse.json(
      { response: null, planUpdated: false, error: `Failed to fetch Garmin data: ${garminError.message}` },
      { status: 500 }
    );
  }

  // ── 3. Fetch recent Strava activities ──────────────────────────────────────
  const { data: stravaActivities } = await supabase
    .from("strava_activities" as "session_logs")
    .select("name, type, sport_type, start_date, distance, moving_time, average_speed, average_heartrate, suffer_score, day_key")
    .order("start_date" as "date", { ascending: false })
    .limit(20) as unknown as { data: StravaActivityRow[] | null };

  // ── 4. Build context ───────────────────────────────────────────────────────
  const context = buildCoachContext(
    (sessions as SessionLog[]) ?? [],
    (garmin as GarminEntry[]) ?? [],
    (stravaActivities as StravaActivityRow[]) ?? []
  );

  // ── 4. Call Claude ─────────────────────────────────────────────────────────
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: `You are an expert HYROX coach and sports scientist working with a specific athlete. Here is their full profile:

${ATHLETE_PROFILE}

Your role:
- Analyse their training data and provide personalised, actionable coaching advice
- Be direct, encouraging, and specific — reference actual numbers from their logs
- Use bullet points where helpful; keep responses focused (under 350 words unless asked for more)
- When discussing pace targets, use min/mile (e.g. 7:15/mi) not km
- Always relate advice back to the sub-60 HYROX goal
- Acknowledge rest days are planned recovery, not failures
- If the athlete is asking about race readiness, be honest but encouraging`,
      messages: [
        {
          role: "user",
          content: `Here is my recent training data:\n\n${context}\n\nMy question: ${question}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    console.log("[API/review] Claude responded, tokens:", message.usage);

    return NextResponse.json({
      response: content.text,
      planUpdated: false,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown AI error";
    console.error("[API/review] Claude error:", msg);
    return NextResponse.json(
      { response: null, planUpdated: false, error: `Claude API error: ${msg}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Strava activity row type (partial — only what we fetch)
// ---------------------------------------------------------------------------
interface StravaActivityRow {
  name: string | null;
  type: string | null;
  sport_type: string | null;
  start_date: string | null;
  distance: number | null;
  moving_time: number | null;
  average_speed: number | null;
  average_heartrate: number | null;
  suffer_score: number | null;
  day_key: string | null;
}

// ---------------------------------------------------------------------------
// Build a readable context block from DB records
// ---------------------------------------------------------------------------
function buildCoachContext(
  sessions: SessionLog[],
  garmin: GarminEntry[],
  stravaActivities: StravaActivityRow[] = []
): string {
  const lines: string[] = [];

  // Session summary stats
  const completed = sessions.filter(
    (s) => s.status === "done" || s.status === "modified"
  );
  const skipped = sessions.filter((s) => s.status === "skipped");
  const withRpe = sessions.filter((s) => s.rpe != null);
  const avgRpe =
    withRpe.length > 0
      ? (withRpe.reduce((s, l) => s + (l.rpe ?? 0), 0) / withRpe.length).toFixed(1)
      : "N/A";

  lines.push("=== SUMMARY ===");
  lines.push(`Total sessions logged: ${sessions.length}`);
  lines.push(`Completed: ${completed.length}  |  Skipped: ${skipped.length}`);
  lines.push(`Average RPE: ${avgRpe}`);

  // Individual session logs — each with notes/paces/weights on their own line
  lines.push("\n=== SESSION LOGS (chronological) ===");
  if (sessions.length === 0) {
    lines.push("No sessions logged yet.");
  } else {
    for (const s of sessions) {
      const statusLabel =
        s.status === "done"     ? "DONE"    :
        s.status === "skipped"  ? "SKIPPED" :
        s.status === "modified" ? "EDITED"  :
        "PLANNED";
      const rpeStr = s.rpe != null ? `RPE ${s.rpe}` : "RPE not recorded";
      lines.push(`${s.dow} ${s.date} — ${s.session} [${statusLabel}] ${rpeStr}`);
      if (s.notes) {
        lines.push(`  Notes: "${s.notes}"`);
      }
      const paceVal = s.paces && typeof s.paces === "object"
        ? Object.values(s.paces as Record<string, string>)[0]
        : typeof s.paces === "string" ? s.paces : null;
      if (paceVal) lines.push(`  Pace: ${paceVal}`);
      const weightVal = s.weights && typeof s.weights === "object"
        ? Object.values(s.weights as Record<string, string>)[0]
        : typeof s.weights === "string" ? s.weights : null;
      if (weightVal) lines.push(`  Weights: ${weightVal}`);
    }
  }

  // Garmin / biometric data — richly formatted for AI coaching
  lines.push("\n=== GARMIN BIOMETRIC DATA ===");
  if (garmin.length === 0) {
    lines.push("No Garmin data recorded yet.");
  } else {
    // Latest values
    const lat = garmin[0];
    const latSleep = lat.sleep_score != null ? String(lat.sleep_score) : "N/A";
    const latHR    = lat.avg_hr      != null ? `${lat.avg_hr} bpm`    : "N/A";
    const latVO2   = lat.vo2_max     != null ? String(lat.vo2_max)     : "N/A";
    lines.push(`Latest: Sleep ${latSleep} · HR ${latHR} · VO2 ${latVO2}`);

    // 7-day averages
    const last7  = garmin.slice(0, 7);
    const prior7 = garmin.slice(7, 14);
    const numAvg = (arr: GarminEntry[], k: keyof GarminEntry): number | null => {
      const vals = arr.map(e => e[k] as number | null).filter((v): v is number => v != null);
      return vals.length ? vals.reduce((a,b) => a+b, 0) / vals.length : null;
    };
    const avg7Sleep = numAvg(last7,  "sleep_score");
    const avg7HR    = numAvg(last7,  "avg_hr");
    const avg7VO2   = numAvg(last7,  "vo2_max");
    lines.push(`7-day avg: Sleep ${avg7Sleep?.toFixed(0) ?? "N/A"} · HR ${avg7HR?.toFixed(0) ?? "N/A"} bpm · VO2 ${avg7VO2?.toFixed(1) ?? "N/A"}`);

    // Trend vs prior week
    const avgPSleep = numAvg(prior7, "sleep_score");
    const avgPHR    = numAvg(prior7, "avg_hr");
    const avgPVO2   = numAvg(prior7, "vo2_max");
    const delta = (curr: number | null, prev: number | null, lowerBetter = false): string => {
      if (curr == null || prev == null) return "N/A";
      const d = curr - prev;
      const improving = lowerBetter ? d < 0 : d > 0;
      return `${improving ? "▲" : "▼"} ${Math.abs(d).toFixed(1)} ${improving ? "(improving)" : "(declining)"}`;
    };
    lines.push(`Trend vs prior week: Sleep ${delta(avg7Sleep, avgPSleep)} · HR ${delta(avg7HR, avgPHR, true)} · VO2 ${delta(avg7VO2, avgPVO2)}`);

    // Benchmark status
    const sleepSt = (v: number | null): string => v == null ? "N/A" : v >= 85 ? "Excellent" : v >= 75 ? "On track" : "Below target";
    const hrSt    = (v: number | null): string => v == null ? "N/A" : v < 50  ? "Excellent" : v <= 55  ? "On track" : "Below target";
    const vo2St   = (v: number | null): string => v == null ? "N/A" : v >= 58 ? "Excellent" : v >= 54  ? "On track" : "Below target";
    lines.push(`Benchmark status: Sleep ${sleepSt(lat.sleep_score)} · HR ${hrSt(lat.avg_hr)} · VO2 ${vo2St(lat.vo2_max)}`);

    // Consecutive low-sleep detection
    const consecutiveLowSleep = garmin.slice(0, 7).filter(g => (g.sleep_score ?? 100) < 70).length;
    if (consecutiveLowSleep >= 3) {
      lines.push(`⚠ Sleep has been under 70 for ${consecutiveLowSleep} of the last 7 days — recommend reducing next week volume by 20%`);
    }
    // HR trending up detection
    const recentHR  = garmin.slice(0, 5).map(g => g.avg_hr).filter((v): v is number => v != null);
    const hrTrending = recentHR.length >= 3 && recentHR.every((v, i) => i === 0 || v >= recentHR[i - 1]);
    if (hrTrending) {
      lines.push(`⚠ Resting HR has been trending upward for ${recentHR.length} consecutive days — possible overtraining, flag it`);
    }

    lines.push(`
Sub-60 HYROX benchmark targets:
- Sleep 75+ (elite 78–82) — Sleep under 70 = avoid hard sessions
- Resting HR under 55 bpm (elite 48–54) — HR under 50 = excellent base
- VO2 max 55+ (elite 54–58) — VO2 under 52 = prioritise Zone 2

Interpretation (MUST USE when advising):
- Sleep under 70 → flag recovery, suggest dropping hard session to easy
- Sleep 70–79 → normal, proceed as planned
- Sleep 80+ → well recovered, good day for a hard session
- HR under 50 → excellent base, can handle high volume
- HR 50–55 → good, maintain current load
- HR over 55 → reduce intensity, prioritise recovery
- VO2 under 52 → more Zone 2 work needed
- VO2 52–55 → on track, threshold work appropriate
- VO2 over 55 → strong base, can handle race-specific work`);

    // Raw history (last 14)
    lines.push("\nRecent entries (newest first):");
    for (const g of garmin.slice(0, 14)) {
      const s = g.sleep_score != null ? `Sleep ${g.sleep_score}` : "";
      const h = g.avg_hr      != null ? `HR ${g.avg_hr}bpm`     : "";
      const v = g.vo2_max     != null ? `VO2 ${g.vo2_max}`      : "";
      lines.push(`  ${g.date}: ${[s, h, v].filter(Boolean).join(" · ") || "No metrics"}`);
    }
  }

  // ── Strava activities ──────────────────────────────────────────────────────
  lines.push("\n=== STRAVA ACTIVITIES (actual GPS data, newest first) ===");
  if (!stravaActivities.length) {
    lines.push("No Strava activities synced yet.");
  } else {
    for (const act of stravaActivities) {
      const date = act.start_date ? act.start_date.slice(0, 10) : "Unknown";
      const type = act.sport_type ?? act.type ?? "Activity";
      const distMi = act.distance ? (act.distance / 1609.344).toFixed(1) + "mi" : null;
      const pace = act.average_speed ? formatPacePerMile(act.average_speed) + "/mi" : null;
      const hr = act.average_heartrate
        ? `HR ${Math.round(act.average_heartrate)} bpm`
        : null;
      const suffer = act.suffer_score ? `Suffer ${act.suffer_score}` : null;
      const time = act.moving_time
        ? `${Math.floor(act.moving_time / 60)}min`
        : null;
      const parts = [distMi, pace ? `@ ${pace}` : null, time, hr, suffer].filter(Boolean);
      lines.push(`${date} [${type}]: ${parts.join(" · ")}`);
    }
  }

  return lines.join("\n");
}
