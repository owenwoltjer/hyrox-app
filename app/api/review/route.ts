import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import type { SessionLog, GarminEntry } from "@/lib/types";

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

  // ── 3. Build context ───────────────────────────────────────────────────────
  const context = buildCoachContext(
    (sessions as SessionLog[]) ?? [],
    (garmin as GarminEntry[]) ?? []
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
// Build a readable context block from DB records
// ---------------------------------------------------------------------------
function buildCoachContext(sessions: SessionLog[], garmin: GarminEntry[]): string {
  const lines: string[] = [];

  // Session summary stats
  const completed = sessions.filter(
    (s) => s.status === "completed" || s.status === "modified"
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

  // Individual session logs
  lines.push("\n=== SESSION LOGS (chronological) ===");
  if (sessions.length === 0) {
    lines.push("No sessions logged yet.");
  } else {
    for (const s of sessions) {
      const rpe = s.rpe != null ? `RPE ${s.rpe}` : "RPE not recorded";
      const status = s.status ?? "planned";
      const notes = s.notes ? ` | Notes: "${s.notes}"` : "";
      const paces =
        s.paces && Object.keys(s.paces).length > 0
          ? ` | Paces: ${JSON.stringify(s.paces)}`
          : "";
      const weights =
        s.weights && Object.keys(s.weights).length > 0
          ? ` | Weights: ${JSON.stringify(s.weights)}`
          : "";
      lines.push(
        `${s.date} (${s.dow}) — ${s.session} [${status}] — ${rpe}${notes}${paces}${weights}`
      );
    }
  }

  // Garmin / biometric data
  lines.push("\n=== BIOMETRIC / GARMIN DATA ===");
  if (garmin.length === 0) {
    lines.push("No Garmin data recorded yet.");
  } else {
    for (const g of garmin) {
      const sleep = g.sleep_score != null ? `Sleep ${g.sleep_score}/100` : "";
      const hr = g.avg_hr != null ? `AvgHR ${g.avg_hr}bpm` : "";
      const vo2 = g.vo2_max != null ? `VO2max ${g.vo2_max}` : "";
      const metrics = [sleep, hr, vo2].filter(Boolean).join(" | ");
      lines.push(`${g.date}: ${metrics || "No metrics recorded"}`);
    }
  }

  return lines.join("\n");
}
