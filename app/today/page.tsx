"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Calendar,
  Watch,
  MessageCircle,
  User,
  CheckCircle2,
  XCircle,
  Pencil,
  Plus,
} from "lucide-react";
import {
  getDayByDate,
  getWeekDays,
  getWeekForDate,
  getDayIndex,
  getDayKey,
  PHASE_1,
} from "@/lib/trainingData";
import type { SessionLog, WorkoutType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Dot colour per workout type (upcoming / unlogged days) */
const TYPE_DOT: Record<WorkoutType, string> = {
  run: "#1A6B9E",
  lift: "#7F77DD",
  combo: "#D85A30",
  rest: "#3A3A3A",
  bike: "#1A6B9E",
  hyrox: "#1D9E75",
};

/** Badge background per workout type */
const TYPE_BADGE_BG: Record<WorkoutType, string> = {
  run: "#0A2840",
  lift: "#1E1B40",
  combo: "#3D1E0F",
  rest: "#1A1A1A",
  bike: "#0A2840",
  hyrox: "#0A3D2E",
};

/** Badge text colour per workout type */
const TYPE_BADGE_TEXT: Record<WorkoutType, string> = {
  run: "#1A6B9E",
  lift: "#7F77DD",
  combo: "#D85A30",
  rest: "#9CA3AF",
  bike: "#1A6B9E",
  hyrox: "#1D9E75",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Format a "Mon D" date string (e.g. "Jun 4") as "Thursday, Jun 4".
 * Builds the weekday from the training day's dow field — no new Date() needed.
 */
function formatDate(dateStr: string, dow?: string): string {
  const FULL_DAYS: Record<string, string> = {
    Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
    Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
  };
  const weekday = dow ? (FULL_DAYS[dow] ?? dow) : "";
  return weekday ? `${weekday}, ${dateStr}` : dateStr;
}

/**
 * Count consecutive completed days going backward from (not including) today.
 * Uses array index comparison so "Jun 4" vs "Jul 1" strings sort correctly.
 * Rest days are free — they don't break the streak.
 */
function computeStreak(logs: SessionLog[], todayStr: string): number {
  const logMap = new Map(logs.map((l) => [l.day_key, l]));
  const todayIdx = getDayIndex(todayStr);
  if (todayIdx <= 0) return 0;

  let streak = 0;
  // Walk backwards through days before today
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

function rpeLabel(rpe: number): string {
  if (rpe <= 3) return "Easy";
  if (rpe <= 5) return "Moderate";
  if (rpe <= 7) return "Hard Effort";
  if (rpe <= 9) return "Very Hard";
  return "Max Effort";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function RpeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const pct = ((value - 1) / 9) * 100;

  // Interpolate colour: green → yellow → red
  function rpeColor(v: number): string {
    if (v <= 5) return "#1D9E75";
    if (v <= 7) return "#D4A017";
    return "#D85A30";
  }

  function valueFromEvent(clientX: number): number {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const raw = (clientX - rect.left) / rect.width;
    const clamped = Math.min(1, Math.max(0, raw));
    return Math.round(clamped * 9) + 1;
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.buttons !== 1) return;
    onChange(valueFromEvent(e.clientX));
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onChange(valueFromEvent(e.clientX));
  }

  const color = rpeColor(value);

  return (
    <div className="mb-8 px-2 relative">
      {/* Floating value label */}
      <div
        className="absolute -top-6 text-sm font-semibold tracking-tight text-white transition-all duration-75"
        style={{ left: `calc(${pct}% + 8px)`, transform: "translateX(-50%)" }}
      >
        {value}
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="w-full h-1.5 bg-[#242424] rounded-full relative cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Fill */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-75"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 bg-white rounded-full shadow-lg border-[3px] transition-all duration-75"
          style={{ left: `${pct}%`, borderColor: color }}
        />
      </div>

      {/* Scale ticks */}
      <div className="flex justify-between mt-3 px-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <span
            key={n}
            className="text-[10px] font-light"
            style={{ color: n === value ? "#FFFFFF" : "#4B5563" }}
          >
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function TodayPage() {
  const pathname = usePathname();

  // ── clientDate: null during SSR, set to "Mon D" string (e.g. "Jun 4") on mount
  // Never call new Date() outside of useEffect — Vercel SSRs in UTC which
  // gives the wrong local date for most users.
  const [clientDate, setClientDate] = useState<string | null>(null);

  // All lookups derived from clientDate — pure array finds, no new Date()
  const today = clientDate ? getDayByDate(clientDate) : undefined;
  const currentWeek = clientDate ? getWeekForDate(clientDate) : 1;
  const weekDays = getWeekDays(currentWeek);

  const [allLogs, setAllLogs] = useState<SessionLog[]>([]);
  const [todayLog, setTodayLog] = useState<SessionLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [rpe, setRpe] = useState(7);
  const [notes, setNotes] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ── Effect 1: log mount once ──────────────────────────────────────────────
  useEffect(() => {
    console.log("[HYROX] component mounted");
  }, []);

  // ── Effect 2: log every pathname change ───────────────────────────────────
  useEffect(() => {
    console.log("[HYROX] pathname changed:", pathname);
  }, [pathname]);

  // ── Fetch sessions — cache-busted so browser never returns stale data ─────
  const fetchSessions = useCallback((todayKey: string) => {
    console.log("[HYROX] fetchSessions called at:", new Date().toISOString());
    fetch(`/api/sessions?t=${Date.now()}`)
      .then((r) => r.json())
      .then(({ data, error }: { data: SessionLog[] | null; error: string | null }) => {
        if (error) console.error("[HYROX] sessions API error:", error);
        console.log("[HYROX] raw API response:", JSON.stringify(data));
        if (data) {
          setAllLogs(data);
          console.log("[HYROX] sessions state updated:", data.length);
          const existing = data.find((l) => l.day_key === todayKey);
          if (existing) {
            setTodayLog(existing);
            setRpe(existing.rpe ?? 7);
            setNotes(existing.notes ?? "");
          } else {
            setTodayLog(null);
          }
        }
      })
      .catch((err) => console.error("[HYROX] fetch /api/sessions failed:", err))
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect 3: resolve local date once on mount ────────────────────────────
  useEffect(() => {
    const now = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const todayStr = `${months[now.getMonth()]} ${now.getDate()}`;
    setClientDate(todayStr);

    const todayDay = PHASE_1.find((d) => d.date === todayStr);
    console.log("[HYROX] looking for:", todayStr);
    console.log("[HYROX] found:", todayDay);
  }, []); // runs once

  // ── Effect 4: fetch whenever clientDate resolves OR pathname changes ───────
  // pathname changes every time Next.js navigates back to /today from /day/[key],
  // ensuring fresh session data even if the component stays mounted.
  useEffect(() => {
    if (!clientDate) return;
    const todayKey = clientDate.replace(" ", "_");
    setIsLoading(true);
    fetchSessions(todayKey);
  }, [clientDate, pathname, fetchSessions]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  // day_key in DB is "Jun_4"; getDayKey(d) returns "Jun_4" — consistent.
  const weekLogMap = new Map(
    allLogs
      .filter((l) => weekDays.some((d) => getDayKey(d) === l.day_key))
      .map((l) => [l.day_key, l])
  );

  const completedThisWeek = Array.from(weekLogMap.values()).filter(
    (l) => l.status === "completed" || l.status === "modified"
  ).length;

  const logsWithRpe = allLogs.filter((l) => l.rpe != null);
  const avgRpe =
    logsWithRpe.length > 0
      ? (
          logsWithRpe.reduce((s, l) => s + (l.rpe ?? 0), 0) /
          logsWithRpe.length
        ).toFixed(1)
      : "—";

  // Pass clientDate so computeStreak never calls new Date() itself
  const streak = clientDate ? computeStreak(allLogs, clientDate) : 0;

  // ── Upsert helper ─────────────────────────────────────────────────────────
  const upsertLog = useCallback(
    async (partial: Partial<SessionLog>): Promise<SessionLog | null> => {
      if (!today) return null;
      const body = {
        day_key: getDayKey(today),
        date: today.date,
        dow: today.dow,
        session: today.session,
        ...partial,
      };
      try {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const { data } = await res.json();
        if (data) {
          setAllLogs((prev) => {
            const idx = prev.findIndex((l) => l.day_key === data.day_key);
            return idx >= 0
              ? prev.map((l, i) => (i === idx ? data : l))
              : [data, ...prev];
          });
          return data;
        }
      } catch {/* network error — optimistic state already applied */}
      return null;
    },
    [today]
  );

  function optimisticBase(): SessionLog {
    return {
      id: todayLog?.id ?? "optimistic-" + Date.now(),
      day_key: today ? getDayKey(today) : (clientDate ?? ""),
      date: today?.date ?? (clientDate ?? ""),
      dow: today?.dow ?? "",
      session: today?.session ?? "",
      status: "planned",
      rpe: null,
      notes: null,
      paces: null,
      weights: null,
      updated_at: new Date().toISOString(),
    };
  }

  // ── Action handlers ───────────────────────────────────────────────────────
  function handleComplete() {
    const optimistic: SessionLog = {
      ...optimisticBase(),
      ...todayLog,
      status: "completed",
      rpe: rpe,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    setTodayLog(optimistic); // optimistic update
    setIsEditing(false);
    upsertLog({ status: "completed", rpe, notes: notes.trim() || null });
  }

  function handleSkip() {
    const optimistic: SessionLog = {
      ...optimisticBase(),
      ...todayLog,
      status: "skipped",
      updated_at: new Date().toISOString(),
    };
    setTodayLog(optimistic); // optimistic update
    setIsEditing(false);
    upsertLog({ status: "skipped" });
  }

  async function handleSaveEdit() {
    if (!todayLog) return;
    setIsSaving(true);
    const optimistic: SessionLog = {
      ...todayLog,
      rpe,
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    setTodayLog(optimistic);
    setIsEditing(false);
    await upsertLog({ status: todayLog.status, rpe, notes: notes.trim() || null });
    setIsSaving(false);
  }

  // ── Determine if today is logged ──────────────────────────────────────────
  const isLogged =
    todayLog != null &&
    (todayLog.status === "completed" ||
      todayLog.status === "skipped" ||
      todayLog.status === "modified");

  const isSkipped = todayLog?.status === "skipped";

  // ── Date display ──────────────────────────────────────────────────────────
  const dateDisplay = clientDate
    ? formatDate(clientDate, today?.dow)
    : "Loading…";

  // ── Off-season guard ──────────────────────────────────────────────────────
  // Only show "no session" AFTER clientDate has been resolved (non-null).
  const isOffPlan = clientDate !== null && !today;

  // ── Week strip rendering ──────────────────────────────────────────────────
  function WeekPill({ day }: { day: (typeof weekDays)[0] }) {
    const dayKey = getDayKey(day);           // "Jun_4"
    const log = weekLogMap.get(dayKey);
    // clientDate is "Jun 4"; clientDayKey is "Jun_4"
    const clientDayKey = clientDate ? clientDate.replace(" ", "_") : null;
    const clientDayIdx = clientDate ? getDayIndex(clientDate) : -1;
    const thisDayIdx   = getDayIndex(day.date);
    const isToday = clientDayKey !== null && dayKey === clientDayKey;
    const isPast  = clientDayIdx >= 0 && thisDayIdx >= 0 && thisDayIdx < clientDayIdx;
    const isCompleted =
      log?.status === "completed" || log?.status === "modified";
    const isSkippedDay = log?.status === "skipped";
    const isRestDay = day.type === "rest";

    const letter = day.dow.charAt(0);

    if (isToday) {
      const todayCompleted = isLogged && !isSkipped;
      const todaySkippedNow = isLogged && isSkipped;
      return (
        <div className="min-w-[44px] h-[64px] bg-[#0A3D2E]/40 border border-[#1D9E75] rounded-full flex flex-col items-center justify-between py-2.5 shrink-0">
          <span className="text-xs font-medium text-white">{letter}</span>
          <div
            className={`w-1.5 h-1.5 rounded-full bg-[#1D9E75] ${!isLogged ? "animate-pulse" : ""}`}
          />
          {todayCompleted ? (
            <CheckCircle2
              size={14}
              className="text-[#1D9E75] drop-shadow-[0_0_4px_rgba(29,158,117,0.5)]"
              fill="#1D9E75"
            />
          ) : todaySkippedNow ? (
            <XCircle size={14} className="text-[#D85A30]" fill="#D85A30" />
          ) : (
            <div className="w-3.5 h-3.5 rounded-full border border-[#1D9E75]" />
          )}
        </div>
      );
    }

    if (isPast) {
      if (isRestDay) {
        return (
          <div className="min-w-[44px] h-[64px] bg-[#1A1A1A] border border-[#3A3A3A] rounded-full flex flex-col items-center justify-between py-2.5 shrink-0">
            <span className="text-xs font-medium text-[#9CA3AF]">{letter}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#3A3A3A]" />
            <div className="w-3.5 h-3.5 rounded-full border border-[#3A3A3A]" />
          </div>
        );
      }
      if (isCompleted) {
        return (
          <div className="min-w-[44px] h-[64px] bg-[#1A1A1A] border border-[#3A3A3A] rounded-full flex flex-col items-center justify-between py-2.5 shrink-0">
            <span className="text-xs font-medium text-[#9CA3AF]">{letter}</span>
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: TYPE_DOT[day.type] }}
            />
            <CheckCircle2 size={14} className="text-[#1D9E75]" fill="#1D9E75" />
          </div>
        );
      }
      if (isSkippedDay) {
        return (
          <div className="min-w-[44px] h-[64px] bg-[#1A1A1A] border border-[#3A3A3A] rounded-full flex flex-col items-center justify-between py-2.5 shrink-0">
            <span className="text-xs font-medium text-[#9CA3AF]">{letter}</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#D85A30]" />
            <XCircle size={14} className="text-[#D85A30]" fill="#D85A30" />
          </div>
        );
      }
      // Past but unlogged
      return (
        <div className="min-w-[44px] h-[64px] bg-[#1A1A1A] border border-[#3A3A3A] rounded-full flex flex-col items-center justify-between py-2.5 shrink-0 opacity-60">
          <span className="text-xs font-medium text-[#9CA3AF]">{letter}</span>
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: TYPE_DOT[day.type] }}
          />
          <div className="w-3.5 h-3.5 rounded-full border border-[#6B7280]" />
        </div>
      );
    }

    // Future day
    return (
      <div className="min-w-[44px] h-[64px] bg-transparent border border-[#3A3A3A] rounded-full flex flex-col items-center justify-between py-2.5 shrink-0 opacity-50">
        <span className="text-xs font-medium text-[#9CA3AF]">{letter}</span>
        <div
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: isRestDay ? "#3A3A3A" : TYPE_DOT[day.type] }}
        />
        <div className="w-3.5 h-3.5 rounded-full border border-[#6B7280]" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white">
      {/* ── Scrollable content ── */}
      <main className="flex-1 overflow-y-auto px-5 pt-12 pb-28">

        {/* 1. Header */}
        <header className="h-[60px] flex justify-between items-center mb-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
              HYROX Coach
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              {dateDisplay}
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#3A3A3A] flex items-center justify-center shrink-0">
            <User size={18} className="text-[#9CA3AF]" />
          </div>
        </header>

        {/* 2. Stats Bar */}
        <section className="h-[80px] grid grid-cols-3 gap-3 mb-8">
          <div className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl flex flex-col justify-center items-center gap-1">
            <span className="text-2xl font-semibold tracking-tight text-white leading-none">
              {isLoading ? "—" : streak}
            </span>
            <span className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
              Day Streak
            </span>
          </div>
          <div className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl flex flex-col justify-center items-center gap-1">
            <span className="text-2xl font-semibold tracking-tight text-white leading-none">
              {isLoading ? "—" : completedThisWeek}
            </span>
            <span className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
              This Week
            </span>
          </div>
          <div className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl flex flex-col justify-center items-center gap-1">
            <span className="text-2xl font-semibold tracking-tight text-white leading-none">
              {isLoading ? "—" : avgRpe}
            </span>
            <span className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
              Avg RPE
            </span>
          </div>
        </section>

        {/* 3. Hero Session Card */}
        {/* Loading skeleton — shown during SSR and until clientDate resolves */}
        {clientDate === null ? (
          <section className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-5 mb-8 animate-pulse">
            <div className="h-5 w-24 bg-[#2A2A2A] rounded-full mb-4" />
            <div className="h-7 w-48 bg-[#2A2A2A] rounded mb-2" />
            <div className="h-4 w-64 bg-[#2A2A2A] rounded mb-6" />
            <div className="h-12 w-full bg-[#2A2A2A] rounded-xl" />
          </section>
        ) : isOffPlan ? (
          <section className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-5 mb-8">
            <p className="text-[#9CA3AF] text-sm font-light text-center py-4">
              No session planned for today — you&apos;re outside Phase 1.
            </p>
          </section>
        ) : isLogged && !isEditing ? (
          /* ── State B: Already logged ── */
          <section
            className={`bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-5 relative shadow-lg mb-8 overflow-hidden ${
              isSkipped
                ? "border-t-[3px] border-t-[#D85A30]"
                : "border-t-[3px] border-t-[#1D9E75]"
            }`}
          >
            {/* Gradient overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-b to-transparent z-0 pointer-events-none rounded-2xl ${
                isSkipped ? "from-[#D85A30]/5" : "from-[#1D9E75]/5"
              }`}
            />

            <div className="relative z-10">
              {/* Badges */}
              <div className="flex justify-between items-start mb-4">
                <span
                  className="text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: TYPE_BADGE_BG[today!.type],
                    color: TYPE_BADGE_TEXT[today!.type],
                  }}
                >
                  {today!.typeLabel}
                </span>
                <span className="bg-[#2A2A2A] text-white text-xs font-medium px-3 py-1 rounded-md">
                  Today
                </span>
              </div>

              <Link href={`/day/${getDayKey(today!)}`} className="block group">
                <h2 className="text-2xl font-semibold tracking-tight text-white mb-1 group-hover:text-[#1D9E75] transition-colors">
                  {today!.session}
                </h2>
                <p className="text-sm font-light text-[#9CA3AF]">{today!.desc}</p>
              </Link>

              {/* Status badge */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#2A2A2A]">
                {isSkipped ? (
                  <>
                    <XCircle size={20} className="text-[#D85A30]" fill="#D85A30" />
                    <span className="text-sm font-medium text-[#D85A30]">
                      Skipped
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle2
                      size={20}
                      className="text-[#1D9E75]"
                      fill="#1D9E75"
                    />
                    <span className="text-sm font-medium text-[#1D9E75]">
                      Completed
                    </span>
                  </>
                )}
              </div>

              {/* Logged data summary (only when completed + has rpe or notes) */}
              {!isSkipped &&
                (todayLog?.rpe != null || todayLog?.notes) && (
                  <div className="bg-[#0A3D2E]/20 border border-[#1D9E75]/20 rounded-xl p-4 mt-3 flex flex-col gap-3">
                    {todayLog?.rpe != null && (
                      <div className="flex items-center gap-2">
                        <span className="bg-[#1D9E75]/10 text-[#1D9E75] px-2 py-1 rounded text-xs font-medium">
                          {todayLog.rpe} RPE
                        </span>
                        <span className="text-xs font-light text-[#9CA3AF]">
                          {rpeLabel(todayLog.rpe)}
                        </span>
                      </div>
                    )}
                    {todayLog?.notes && (
                      <p className="text-sm font-light leading-relaxed text-white">
                        &quot;{todayLog.notes}&quot;
                      </p>
                    )}
                  </div>
                )}

              {/* Edit log button */}
              <button
                onClick={() => {
                  setRpe(todayLog?.rpe ?? 7);
                  setNotes(todayLog?.notes ?? "");
                  setIsEditing(true);
                }}
                className="w-full bg-transparent border border-[#3A3A3A] text-white font-medium text-sm h-[48px] rounded-xl flex items-center justify-center gap-2 mt-5 transition-colors hover:bg-[#242424] active:bg-[#2A2A2A]"
              >
                Edit log{" "}
                <Pencil size={14} />
              </button>
            </div>
          </section>
        ) : (
          /* ── State A: Not yet logged (or editing) ── */
          <section className="bg-[#1A1A1A] border-t-[3px] border-t-[#1D9E75] border border-[#3A3A3A] rounded-2xl p-5 relative shadow-lg mb-8 overflow-hidden">
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1D9E75]/5 to-transparent z-0 pointer-events-none rounded-2xl" />

            <div className="relative z-10">
              {/* Badges */}
              <div className="flex justify-between items-start mb-4">
                <span
                  className="text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-full"
                  style={{
                    backgroundColor: TYPE_BADGE_BG[today!.type],
                    color: TYPE_BADGE_TEXT[today!.type],
                  }}
                >
                  {today!.typeLabel}
                </span>
                <span className="bg-[#2A2A2A] text-white text-xs font-medium px-3 py-1 rounded-md">
                  {isEditing ? "Editing" : "Today"}
                </span>
              </div>

              <Link
                href={`/day/${getDayKey(today!)}`}
                className="block group"
              >
                <h2 className="text-2xl font-semibold tracking-tight text-white mb-1 group-hover:text-[#1D9E75] transition-colors">
                  {today!.session}
                </h2>
                <p className="text-sm font-light text-[#9CA3AF] mb-1">
                  {today!.desc}
                </p>
                <span className="text-xs font-medium text-[#1D9E75] opacity-0 group-hover:opacity-100 transition-opacity">
                  View full session →
                </span>
              </Link>

              <div className="mb-6" />

              {/* Action buttons */}
              {!isEditing && (
                <div className="flex justify-between items-center gap-3">
                  <button
                    onClick={handleComplete}
                    className="flex-[2] bg-[#1D9E75] text-white font-medium text-sm h-[48px] rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80"
                  >
                    Mark Complete{" "}
                    <CheckCircle2 size={18} fill="white" className="text-white" />
                  </button>
                  <button
                    onClick={handleSkip}
                    className="flex-[1] bg-transparent border border-[#D85A30] text-[#D85A30] font-medium text-sm h-[48px] rounded-xl flex items-center justify-center transition-colors hover:bg-[#3D1E0F] active:bg-[#3D1E0F]"
                  >
                    Skipped
                  </button>
                </div>
              )}

              {/* Save / cancel when editing */}
              {isEditing && (
                <div className="flex justify-between items-center gap-3 mt-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="flex-[2] bg-[#1D9E75] text-white font-medium text-sm h-[48px] rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-[1] bg-transparent border border-[#3A3A3A] text-[#9CA3AF] font-medium text-sm h-[48px] rounded-xl flex items-center justify-center"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 4. Quick Log / Edit section — shown when not yet logged OR when editing */}
        {today && (!isLogged || isEditing) && (
          <section className="mb-10">
            <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF] mb-8">
              {isEditing ? "Update your log" : "Log this session"}
            </h3>

            {/* RPE Slider */}
            <RpeSlider value={rpe} onChange={setRpe} />

            {/* Notes input */}
            <div className="relative w-full">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did it feel?"
                className="bg-[#1A1A1A] border border-[#3A3A3A] focus:border-[#1D9E75] rounded-xl px-4 py-3.5 text-sm font-light text-white placeholder-[#6B7280] w-full outline-none transition-colors"
              />
            </div>

            {/* Add detail toggle */}
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setShowDetail((p) => !p)}
                className="text-xs font-medium text-[#1D9E75] hover:text-white transition-colors flex items-center gap-1"
              >
                {showDetail ? "Hide detail" : "Add detail"}
                <Plus size={12} />
              </button>
            </div>

            {/* Expanded detail fields */}
            {showDetail && (
              <div className="mt-4 flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Key pace (e.g. 1000m avg: 4:12)"
                  className="bg-[#1A1A1A] border border-[#3A3A3A] focus:border-[#1D9E75] rounded-xl px-4 py-3.5 text-sm font-light text-white placeholder-[#6B7280] w-full outline-none transition-colors"
                />
                <input
                  type="text"
                  placeholder="Key weight (e.g. bench: 185lb)"
                  className="bg-[#1A1A1A] border border-[#3A3A3A] focus:border-[#1D9E75] rounded-xl px-4 py-3.5 text-sm font-light text-white placeholder-[#6B7280] w-full outline-none transition-colors"
                />
              </div>
            )}
          </section>
        )}

        {/* 5. This Week Mini Strip */}
        <section className={isLogged && !isEditing ? "mt-4" : ""}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
              This week
            </h3>
            <Link
              href="/week"
              className="text-xs font-medium text-[#1D9E75] hover:text-white transition-colors"
            >
              See all →
            </Link>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {weekDays.map((day) =>
              day.type === "rest" ? (
                <WeekPill key={day.date} day={day} />
              ) : (
                <Link key={day.date} href={`/day/${getDayKey(day)}`} className="shrink-0">
                  <WeekPill day={day} />
                </Link>
              )
            )}
          </div>
        </section>
      </main>

      {/* 6. Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D]/95 backdrop-blur-md pt-4 pb-8 px-6 border-t border-[#3A3A3A] z-50">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Link
            href="/today"
            className="flex flex-col items-center gap-1.5 text-[#1D9E75]"
          >
            <Home
              size={24}
              fill="#1D9E75"
              className="drop-shadow-[0_0_8px_rgba(29,158,117,0.5)]"
            />
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
            className="flex flex-col items-center gap-1.5 text-[#6B7280] hover:text-[#9CA3AF] transition-colors"
          >
            <MessageCircle size={24} />
            <span className="text-xs font-medium">Review</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
