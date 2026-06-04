import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ---------------------------------------------------------------------------
// POST /api/parse-notes
// Takes an athlete's raw session notes + session name, and returns a
// 1–2 sentence coach insight summarising what went well / what to watch.
//
// Request body:
//   { notes: string; sessionName: string; rpe?: number }
//
// Response:
//   { data: { insight: string; timestamp: string }; error: null }
// ---------------------------------------------------------------------------
export async function POST(request: NextRequest) {
  let notes: string;
  let sessionName: string;
  let rpe: number | undefined;

  try {
    const body = await request.json();
    notes = body.notes;
    sessionName = body.sessionName;
    rpe = body.rpe;
  } catch {
    return NextResponse.json(
      { data: null, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  if (!notes || typeof notes !== "string" || notes.trim().length === 0) {
    return NextResponse.json(
      { data: null, error: "Missing required field: notes" },
      { status: 400 }
    );
  }

  if (
    !sessionName ||
    typeof sessionName !== "string" ||
    sessionName.trim().length === 0
  ) {
    return NextResponse.json(
      { data: null, error: "Missing required field: sessionName" },
      { status: 400 }
    );
  }

  const rpeContext =
    rpe != null ? ` The athlete rated this session RPE ${rpe}/10.` : "";

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: `You are a concise HYROX coach. When given an athlete's raw session
notes, respond with exactly 1–2 sentences of coach insight. Be specific,
positive where warranted, and flag anything that needs attention.
Never use more than 2 sentences. Do not add headers or bullet points.`,
      messages: [
        {
          role: "user",
          content: `Session: "${sessionName}"${rpeContext}\n\nAthlete notes: "${notes.trim()}"`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    return NextResponse.json({
      data: {
        insight: content.text.trim(),
        timestamp: new Date().toISOString(),
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
