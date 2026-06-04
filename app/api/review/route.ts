import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import type { SessionLog, GarminEntry } from "@/lib/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// POST /api/review
// Reads all session logs + Garmin data from Supabase, builds a context
// prompt, and returns an AI coach review using Claude.
//
// Optional body fields:
//   { question?: string }  — athlete's specific question to the coach
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

  // ── 1. Fetch all session logs ──────────────────────────────────────────
  const { data: sessions, error: sessionsError } = await supabase
    .from("session_logs")
    .select("*")
    .order("date", { ascending: true });

  if (sessionsError) {
    return NextResponse.json(
      { data: null, error: `Failed to fetch sessions: ${sessionsError.message}` },
      { status: 500 }
    );
  }

  // ── 2. Fetch last 14 days of Garmin data ──────────────────────────────
  const { data: garmin, error: garminError } = await supabase
    .from("garmin_logs")
    .select("*")
    .order("date", { ascending: false })
    .limit(14);

  if (garminError) {
    return NextResponse.json(
      { data: null, error: `Failed to fetch Garmin data: ${garminError.message}` },
      { status: 500 }
    );
  }

  // ── 3. Build context string ────────────────────────────────────────────
  const context = buildCoachContext(
    (sessions as SessionLog[]) ?? [],
    (garmin as GarminEntry[]) ?? []
  );

  // ── 4. Call Claude ─────────────────────────────────────────────────────
  try {
    const message = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      system: `You are an expert HYROX coach and sports scientist. You analyse
training data and provide personalised, actionable coaching advice.
Be direct, encouraging, and specific. Use bullet points where helpful.
Reference actual numbers from the athlete's data when making observations.
Keep responses under 400 words unless the athlete asks for more detail.`,
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

    return NextResponse.json({
      data: {
        response: content.text,
        role: "assistant" as const,
        timestamp: new Date().toISOString(),
        sessionCount: sessions?.length ?? 0,
        garminCount: garmin?.length ?? 0,
      },
      error: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI error";
    return NextResponse.json(
      { data: null, error: `Claude API error: ${message}` },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Build a readable context block from DB records
// ---------------------------------------------------------------------------
function buildCoachContext(sessions: SessionLog[], garmin: GarminEntry[]): string {
  const lines: string[] = [];

  // Session log summary
  lines.push("=== SESSION LOGS ===");
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
  lines.push("\n=== BIOMETRIC / GARMIN DATA (last 14 days) ===");
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
