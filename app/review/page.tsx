"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Home, Calendar, Watch, MessageCircle, ArrowRight } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { PHASE_1, getDayKey, getDayIndex } from "@/lib/trainingData";
import type { SessionLog, GarminEntry } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Message {
  role: "user" | "coach";
  content: string;
  timestamp: Date;
}

interface Snapshot {
  sessionsDone: number;
  avgRpe: string;
  streak: number;
  vo2Max: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const QUICK_QUESTIONS = [
  "How was my week?",
  "Am I on track for sub-60?",
  "What should I focus on?",
  "Analyse my RPE trends",
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function computeStreak(logs: SessionLog[], todayStr: string): number {
  const logMap = new Map(logs.map((l) => [l.day_key, l]));
  const todayIdx = getDayIndex(todayStr);
  if (todayIdx <= 0) return 0;
  let streak = 0;
  for (let i = todayIdx - 1; i >= 0; i--) {
    const day = PHASE_1[i];
    if (day.type === "rest") continue;
    const log = logMap.get(getDayKey(day));
    if (log?.status === "completed" || log?.status === "modified") {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex flex-col gap-1 max-w-[85%]">
      <span className="text-[10px] font-medium text-[#7F77DD] ml-1">✦ Coach</span>
      <div className="bg-[#1A1A1A] border-l-[3px] border-[#7F77DD] rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
        <div className="w-2 h-2 rounded-full bg-[#7F77DD] animate-bounce [animation-delay:0ms]" />
        <div className="w-2 h-2 rounded-full bg-[#7F77DD] animate-bounce [animation-delay:150ms]" />
        <div className="w-2 h-2 rounded-full bg-[#7F77DD] animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xl font-semibold tracking-tight text-white leading-none">
        {value}
      </span>
      <span className="text-[11px] font-light tracking-wider uppercase text-[#9CA3AF]">
        {label}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ReviewPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [activeChip, setActiveChip] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [todayDisplay, setTodayDisplay] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Resolve date + fetch snapshot on mount ────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const todayStr = `${months[now.getMonth()]} ${now.getDate()}`;
    setTodayDisplay(todayStr);

    (async () => {
      try {
        const supabase = getSupabase();
        const [{ data: rawSessions }, { data: rawGarmin }] = await Promise.all([
          supabase.from("session_logs").select("*"),
          supabase.from("garmin_logs").select("*").order("date", { ascending: false }).limit(1),
        ]);

        const logs = (rawSessions as SessionLog[] | null) ?? [];
        const garminRows = (rawGarmin as GarminEntry[] | null) ?? [];

        const done = logs.filter(
          (l) => l.status === "completed" || l.status === "modified"
        );
        const withRpe = logs.filter((l) => l.rpe != null);
        const avgRpe =
          withRpe.length > 0
            ? (
                withRpe.reduce((s, l) => s + (l.rpe ?? 0), 0) / withRpe.length
              ).toFixed(1)
            : "—";
        const streak = computeStreak(logs, todayStr);
        const vo2 =
          garminRows[0]?.vo2_max != null ? String(garminRows[0].vo2_max) : "—";

        setSnapshot({ sessionsDone: done.length, avgRpe, streak, vo2Max: vo2 });
      } catch {
        setSnapshot({ sessionsDone: 0, avgRpe: "—", streak: 0, vo2Max: "—" });
      } finally {
        setSnapshotLoading(false);
      }
    })();
  }, []);

  // ── Auto-scroll to bottom on new messages ─────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // ── Send message ──────────────────────────────────────────────────────────
  async function sendMessage(text?: string) {
    const q = (text ?? input).trim();
    if (!q || isLoading) return;

    const userMsg: Message = { role: "user", content: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setActiveChip(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const json = await res.json();

      // Handle both response shapes: { response } or { data: { response } }
      const response: string =
        json.response ??
        json.data?.response ??
        "Something went wrong — try again.";
      const planUpdated: boolean = json.planUpdated ?? false;

      setMessages((prev) => [
        ...prev,
        { role: "coach", content: response, timestamp: new Date() },
      ]);

      if (planUpdated) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "coach",
          content: "Something went wrong — try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleChipTap(q: string) {
    if (isLoading) return;
    setActiveChip(q);
    sendMessage(q);
  }

  const hasMessages = messages.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Outer container — 100dvh so keyboard push works on iOS */}
      <div
        className="flex flex-col bg-[#0D0D0D] text-white"
        style={{ height: "100dvh" }}
      >
        {/* ── Header ── */}
        <header className="shrink-0 h-[60px] flex justify-between items-center px-5 bg-[#0D0D0D]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
              HYROX Coach
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              AI Coach
            </h1>
          </div>
          {/* Purple dot to indicate AI active */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#7F77DD] shadow-[0_0_8px_rgba(127,119,221,0.6)]" />
        </header>

        {/* ── Training Snapshot Card ── */}
        <div className="shrink-0 px-5 pb-3">
          <div
            className="bg-[#1A1A1A] rounded-2xl p-4 border border-[#3A3A3A] relative overflow-hidden"
            style={{ borderLeft: "3px solid #7F77DD" }}
          >
            {/* Purple glow */}
            <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-[#7F77DD]/8 to-transparent pointer-events-none" />
            <div className="relative z-10">
              <p className="text-[11px] font-medium tracking-wider uppercase text-[#7F77DD] mb-3">
                Training Snapshot
              </p>
              {snapshotLoading ? (
                <div className="grid grid-cols-2 gap-y-4 animate-pulse">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="h-7 w-12 bg-[#2A2A2A] rounded" />
                      <div className="h-3 w-20 bg-[#2A2A2A] rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-y-4">
                  <StatCell label="Sessions Done" value={snapshot?.sessionsDone ?? 0} />
                  <StatCell label="Avg RPE" value={snapshot?.avgRpe ?? "—"} />
                  <StatCell label="Day Streak" value={snapshot?.streak ?? 0} />
                  <StatCell label="VO2 Max" value={snapshot?.vo2Max ?? "—"} />
                </div>
              )}
              <p className="text-[10px] font-light text-[#6B7280] mt-3">
                Last updated · {todayDisplay}
              </p>
            </div>
          </div>
        </div>

        {/* ── Quick Question Chips ── */}
        <div className="shrink-0 px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {QUICK_QUESTIONS.map((q) => {
              const isActive = activeChip === q && isLoading;
              return (
                <button
                  key={q}
                  onClick={() => handleChipTap(q)}
                  disabled={isLoading}
                  className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-[#1E1C3D] border border-[#7F77DD] text-[#7F77DD]"
                      : "bg-[#1A1A1A] border border-[#3A3A3A] text-white hover:border-[#7F77DD]/50"
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-5 py-2 flex flex-col [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* Empty state */}
          {!hasMessages && !isLoading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 pb-8">
              <div className="text-5xl font-bold text-[#7F77DD] drop-shadow-[0_0_16px_rgba(127,119,221,0.4)]">
                ✦
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Your AI Coach
                </h2>
                <p className="text-sm font-light text-[#9CA3AF] max-w-xs leading-relaxed">
                  Ask anything about your training — your coach has read all your
                  data.
                </p>
              </div>
            </div>
          )}

          {/* Message bubbles */}
          <div className="flex flex-col gap-5 pb-2">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                // User bubble — right aligned
                <div key={i} className="flex flex-col items-end gap-1 ml-auto max-w-[80%]">
                  <div className="bg-[#1D9E75] text-white text-sm font-light leading-relaxed px-4 py-3 rounded-2xl rounded-tr-sm">
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] pr-1">
                    {fmtTime(msg.timestamp)}
                  </span>
                </div>
              ) : (
                // Coach bubble — left aligned
                <div key={i} className="flex flex-col gap-1 max-w-[85%]">
                  <span className="text-[10px] font-medium text-[#7F77DD] ml-1">
                    ✦ Coach
                  </span>
                  <div className="bg-[#1A1A1A] border-l-[3px] border-[#7F77DD] rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm font-light text-white leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] ml-1">
                    {fmtTime(msg.timestamp)}
                  </span>
                </div>
              )
            )}

            {/* Typing indicator */}
            {isLoading && <TypingIndicator />}

            {/* Scroll anchor */}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Input Bar ── */}
        <div className="shrink-0 bg-[#1A1A1A] border-t border-[#3A3A3A] px-4 py-3 flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask your coach…"
            disabled={isLoading}
            inputMode="text"
            autoComplete="off"
            className="flex-1 bg-[#0D0D0D] text-white text-sm font-light placeholder-[#9CA3AF] rounded-full px-4 py-2.5 outline-none border border-transparent focus:border-[#7F77DD]/40 transition-colors min-w-0 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 shrink-0 rounded-full bg-[#7F77DD] flex items-center justify-center transition-opacity disabled:opacity-40 hover:opacity-90 active:opacity-80"
          >
            <ArrowRight size={18} className="text-white" />
          </button>
        </div>

        {/* ── Tab Bar ── */}
        <nav className="shrink-0 bg-[#0D0D0D]/95 backdrop-blur-md pt-4 pb-8 px-6 border-t border-[#3A3A3A]">
          <div className="flex justify-between items-center max-w-md mx-auto">
            <Link
              href="/today"
              className="flex flex-col items-center gap-1.5 text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
            >
              <Home size={24} />
              <span className="text-xs font-medium">Today</span>
            </Link>
            <Link
              href="/week"
              className="flex flex-col items-center gap-1.5 text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
            >
              <Calendar size={24} />
              <span className="text-xs font-medium">Week</span>
            </Link>
            <Link
              href="/garmin"
              className="flex flex-col items-center gap-1.5 text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
            >
              <Watch size={24} />
              <span className="text-xs font-medium">Garmin</span>
            </Link>
            <Link
              href="/review"
              className="flex flex-col items-center gap-1.5 text-[#7F77DD]"
            >
              <MessageCircle
                size={24}
                fill="#7F77DD"
                className="drop-shadow-[0_0_8px_rgba(127,119,221,0.5)]"
              />
              <span className="text-xs font-medium">Review</span>
            </Link>
          </div>
        </nav>
      </div>

      {/* ── Toast ── */}
      {showToast && (
        <div className="fixed bottom-[140px] left-1/2 -translate-x-1/2 z-50 bg-[#0A3D2E] border border-[#1D9E75] rounded-xl px-5 py-3 flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
          <span className="text-[#1D9E75] font-medium text-sm">✓</span>
          <span className="text-white text-sm font-medium whitespace-nowrap">
            Training plan updated
          </span>
        </div>
      )}
    </>
  );
}
