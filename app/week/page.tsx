"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Home, Calendar, Watch, MessageCircle } from "lucide-react";
import {
  getWeekDays,
  getWeekForDate,
  getDayKey,
  getDayIndex,
  PHASE_1,
} from "@/lib/trainingData";
import type { TrainingDay, WorkoutType, SessionLog } from "@/lib/types";

const TYPE_COLOR: Record<WorkoutType, string> = {
  run: "#1A6B9E",
  lift: "#7F77DD",
  combo: "#D85A30",
  rest: "#3A3A3A",
  bike: "#1A6B9E",
  hyrox: "#1D9E75",
};

export default function WeekPage() {
  const [clientDate, setClientDate]     = useState<string | null>(null);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>(PHASE_1);
  const [logs, setLogs]                 = useState<SessionLog[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // ── Drag / tap-to-swap state ───────────────────────────────────────────────
  const [dragFrom, setDragFrom]           = useState<number | null>(null);
  const [dragOver, setDragOver]           = useState<number | null>(null);
  // Mobile: tap grip once to select, tap another to swap
  const [mobileSelected, setMobileSelected] = useState<number | null>(null);
  const [isSwapping, setIsSwapping]         = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);
  // Prevents Link navigation firing right after a drag ends
  const didDragRef = useRef(false);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const now    = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d      = `${months[now.getMonth()]} ${now.getDate()}`;
    setClientDate(d);

    (async () => {
      let activeDays = PHASE_1;
      try {
        const planRes = await fetch(`/api/training-plan?t=${Date.now()}`);
        if (planRes.ok) {
          const planData: TrainingDay[] = await planRes.json();
          if (Array.isArray(planData) && planData.length > 0) {
            setTrainingDays(planData);
            activeDays = planData;
          }
        }
      } catch (err) {
        console.warn("[WEEK] training-plan fetch failed, using fallback:", err);
      }
      setSelectedWeek(getWeekForDate(d, activeDays));

      fetch("/api/sessions")
        .then((r) => r.json())
        .then(({ data }) => { if (data) setLogs(data); })
        .catch(() => {});
    })();
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  // weekDays is ALWAYS in fixed calendar order (Mon → Sun) — never reordered.
  const weekDays    = getWeekDays(selectedWeek, trainingDays);
  const maxWeek     = trainingDays.reduce((m, d) => Math.max(m, d.week), 1);
  const logMap      = new Map(logs.map((l) => [l.day_key, l]));
  const todayDayKey = clientDate ? clientDate.replace(" ", "_") : null;
  const todayIdx    = clientDate ? getDayIndex(clientDate, trainingDays) : -1;

  // ── Toast helper ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Swap handler — writes to DB, then updates local state ─────────────────
  async function handleSwap(i: number, j: number) {
    if (i === j || isSwapping) return;

    const dayA = weekDays[i];
    const dayB = weekDays[j];
    const keyA = getDayKey(dayA);
    const keyB = getDayKey(dayB);

    // Capture session name before any state changes for the toast
    const movedSession = dayA.session;
    const toLabel      = `${dayB.dow} ${dayB.date}`;

    setIsSwapping(true);
    setMobileSelected(null);

    try {
      const res = await fetch("/api/swap-days", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ keyA, keyB }),
      });
      const { error } = await res.json();

      if (error) {
        console.error("[WEEK] swap error:", error);
        showToast(`Swap failed — ${error}`);
        return;
      }

      // ── Optimistic local update — swap session content between the two slots ──
      // The calendar slots (dow / date / week / day_key) stay fixed.
      // Only the workout payload moves.
      setTrainingDays((prev) => {
        const next = [...prev];
        const idxA = next.findIndex((d) => getDayKey(d) === keyA);
        const idxB = next.findIndex((d) => getDayKey(d) === keyB);
        if (idxA < 0 || idxB < 0) return prev;

        const { type: tA, typeLabel: tlA, session: sA, desc: dA } = next[idxA];
        const { type: tB, typeLabel: tlB, session: sB, desc: dB } = next[idxB];

        next[idxA] = { ...next[idxA], type: tB, typeLabel: tlB, session: sB, desc: dB };
        next[idxB] = { ...next[idxB], type: tA, typeLabel: tlA, session: sA, desc: dA };
        return next;
      });

      // Swap log day_keys / calendar fields in local state
      setLogs((prev) =>
        prev.map((log) => {
          if (log.day_key === keyA)
            return { ...log, day_key: keyB, date: dayB.date, dow: dayB.dow };
          if (log.day_key === keyB)
            return { ...log, day_key: keyA, date: dayA.date, dow: dayA.dow };
          return log;
        })
      );

      showToast(`✓ Moved ${movedSession} to ${toLabel}`);
    } finally {
      setIsSwapping(false);
    }
  }

  // ── HTML5 drag handlers ────────────────────────────────────────────────────
  function onDragStart(i: number) {
    didDragRef.current = true;
    setDragFrom(i);
    setMobileSelected(null);
  }

  function onDragOver(e: React.DragEvent, i: number) {
    e.preventDefault();
    setDragOver(i);
  }

  function onDrop(i: number) {
    if (dragFrom !== null && dragFrom !== i) handleSwap(dragFrom, i);
    setDragFrom(null);
    setDragOver(null);
  }

  function onDragEnd() {
    setDragFrom(null);
    setDragOver(null);
    setTimeout(() => { didDragRef.current = false; }, 100);
  }

  // ── Mobile grip tap ────────────────────────────────────────────────────────
  function onGripTap(e: React.MouseEvent | React.TouchEvent, i: number) {
    e.stopPropagation();
    e.preventDefault();
    if (isSwapping) return;
    if (mobileSelected === null) {
      setMobileSelected(i);
    } else if (mobileSelected === i) {
      setMobileSelected(null);
    } else {
      handleSwap(mobileSelected, i);
    }
  }

  function statusIcon(day: TrainingDay) {
    const log = logMap.get(getDayKey(day));
    if (!log) return null;
    if (log.status === "done" || log.status === "modified") return "✓";
    if (log.status === "skipped") return "✗";
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white">
      <main className="flex-1 overflow-y-auto px-5 pt-[max(48px,env(safe-area-inset-top))] pb-28">

        {/* Header */}
        <header className="mb-6">
          <span className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
            HYROX Coach
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-white mt-0.5">
            Week {selectedWeek}
          </h1>
          {mobileSelected !== null && !isSwapping && (
            <p className="text-xs text-[#1D9E75] mt-1">
              Tap another day&apos;s <span className="font-mono">⠿</span> handle to swap · tap same to cancel
            </p>
          )}
          {isSwapping && (
            <p className="text-xs text-[#9CA3AF] mt-1 animate-pulse">Saving swap…</p>
          )}
        </header>

        {/* Week selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              onClick={() => { setSelectedWeek(w); setMobileSelected(null); }}
              className={`min-w-[40px] h-9 rounded-full text-xs font-medium transition-colors shrink-0 ${
                w === selectedWeek
                  ? "bg-[#1D9E75] text-white"
                  : "bg-[#1A1A1A] text-[#9CA3AF] border border-[#3A3A3A] hover:border-[#1D9E75]"
              }`}
            >
              W{w}
            </button>
          ))}
        </div>

        {/* Day list — always in fixed Mon → Sun calendar order */}
        <div className="flex flex-col gap-3">
          {weekDays.map((day, i) => {
            const key      = getDayKey(day);
            const log      = logMap.get(key);
            const thisIdx  = getDayIndex(day.date, trainingDays);
            const isToday  = todayDayKey !== null && key === todayDayKey;
            const isPast   = todayIdx >= 0 && thisIdx >= 0 && thisIdx < todayIdx;
            const isRest   = day.type === "rest";
            const icon     = statusIcon(day);
            const accent   = TYPE_COLOR[day.type];

            const isDragging       = dragFrom === i;
            const isDropTarget     = dragOver === i && dragFrom !== null && dragFrom !== i;
            const isMobileSelected = mobileSelected === i;

            return (
              <div
                key={key}
                draggable={!isRest && !isSwapping}
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDrop={() => onDrop(i)}
                onDragEnd={onDragEnd}
                className={[
                  "flex items-stretch bg-[#1A1A1A] rounded-2xl border transition-colors select-none",
                  isToday      ? "border-[#1D9E75]"    : "border-[#3A3A3A]",
                  isDropTarget ? "!border-dashed !border-[#1D9E75] bg-[#0A3D2E]/20" : "",
                  isDragging   ? "opacity-40"           : "",
                  isMobileSelected ? "ring-2 ring-[#1D9E75]" : "",
                  isSwapping   ? "pointer-events-none opacity-70" : "",
                ].filter(Boolean).join(" ")}
              >
                {/* ── Drag / swap handle — visible on every card ── */}
                <button
                  type="button"
                  aria-label="Swap day"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => onGripTap(e, i)}
                  onTouchEnd={(e) => onGripTap(e, i)}
                  style={{ minWidth: "40px", flexShrink: 0 }}
                  className={[
                    "flex items-center justify-center rounded-l-2xl transition-colors h-full",
                    isRest || isSwapping
                      ? "cursor-default"
                      : "cursor-grab active:cursor-grabbing hover:bg-[#2A2A2A]",
                    isMobileSelected ? "bg-[#1D9E75]/20" : "",
                  ].filter(Boolean).join(" ")}
                >
                  <span
                    className="text-xl select-none leading-none"
                    style={{ color: "#9CA3AF", flexShrink: 0 }}
                  >
                    ⠿
                  </span>
                </button>

                {/* ── Card content — tappable link ── */}
                <Link
                  href={isRest ? "#" : `/day/${key}`}
                  onClick={(e) => {
                    if (isRest || didDragRef.current || isSwapping) {
                      e.preventDefault();
                      return;
                    }
                  }}
                  className={`flex-1 p-4 min-w-0 ${isRest ? "cursor-default opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Workout type dot */}
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-[#9CA3AF]">
                            {day.dow} · {day.date}
                          </span>
                          {isToday && (
                            <span className="text-[10px] font-semibold text-[#1D9E75] uppercase tracking-wider">
                              Today
                            </span>
                          )}
                          {isPast && !log && !isRest && (
                            <span className="text-[10px] font-medium text-[#D85A30] uppercase tracking-wider">
                              Missed
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-white mt-0.5 truncate">
                          {day.session}
                        </p>
                        <p className="text-xs font-light text-[#9CA3AF] mt-0.5 leading-relaxed line-clamp-2">
                          {day.desc}
                        </p>
                      </div>
                    </div>

                    {/* Status badge */}
                    {icon ? (
                      <span
                        className={`text-lg font-bold shrink-0 ml-2 ${
                          icon === "✓" ? "text-[#1D9E75]" : "text-[#D85A30]"
                        }`}
                      >
                        {icon}
                      </span>
                    ) : !isRest ? (
                      <span className="text-[#6B7280] text-lg ml-2 shrink-0">›</span>
                    ) : null}
                  </div>

                  {/* RPE + notes preview */}
                  {log?.rpe != null && (
                    <div className="mt-2 flex gap-2">
                      <span className="text-[10px] bg-[#1D9E75]/10 text-[#1D9E75] px-2 py-0.5 rounded font-medium">
                        RPE {log.rpe}
                      </span>
                      {log.notes && (
                        <span className="text-[10px] text-[#9CA3AF] truncate max-w-[180px]">
                          {log.notes}
                        </span>
                      )}
                    </div>
                  )}
                </Link>
              </div>
            );
          })}
        </div>
      </main>

      {/* Tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D]/95 backdrop-blur-md pt-4 px-6 border-t border-[#3A3A3A] z-50 pb-[env(safe-area-inset-bottom,32px)]">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <Link href="/today" className="flex flex-col items-center gap-1.5 text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
            <Home size={24} />
            <span className="text-xs font-medium">Today</span>
          </Link>
          <Link href="/week" className="flex flex-col items-center gap-1.5 text-[#1D9E75]">
            <Calendar size={24} fill="#1D9E75" className="drop-shadow-[0_0_8px_rgba(29,158,117,0.5)]" />
            <span className="text-xs font-medium">Week</span>
          </Link>
          <Link href="/garmin" className="flex flex-col items-center gap-1.5 text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
            <Watch size={24} />
            <span className="text-xs font-medium">Garmin</span>
          </Link>
          <Link href="/review" className="flex flex-col items-center gap-1.5 text-[#6B7280] hover:text-[#9CA3AF] transition-colors">
            <MessageCircle size={24} />
            <span className="text-xs font-medium">Review</span>
          </Link>
        </div>
      </nav>

      {/* Swap toast */}
      {toast && (
        <div className="fixed bottom-[130px] left-1/2 -translate-x-1/2 z-50 bg-[#0A3D2E] border border-[#1D9E75] rounded-xl px-5 py-3 flex items-center gap-2 shadow-xl pointer-events-none">
          <span className="text-[#1D9E75] font-semibold text-sm">✓</span>
          <span className="text-white text-sm font-medium whitespace-nowrap">{toast}</span>
        </div>
      )}
    </div>
  );
}
