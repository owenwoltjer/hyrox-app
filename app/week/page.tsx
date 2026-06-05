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
  const [clientDate, setClientDate] = useState<string | null>(null);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>(PHASE_1);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);

  // ── Drag / swap state ──────────────────────────────────────────────────────
  // dayOrder: array of day_keys in current display order for this week.
  // Reordered locally on swap — does NOT persist to DB.
  const [dayOrder, setDayOrder] = useState<string[]>([]);
  const [dragFrom, setDragFrom]     = useState<number | null>(null);
  const [dragOver, setDragOver]     = useState<number | null>(null);
  // Mobile tap-to-select: tap a grip to select, tap another grip to swap.
  const [mobileSelected, setMobileSelected] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Prevents the Link from navigating immediately after a drag ends.
  const didDragRef = useRef(false);

  // ── Data fetch ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = `${months[now.getMonth()]} ${now.getDate()}`;
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

  // ── Reset day order whenever the week or plan changes ──────────────────────
  useEffect(() => {
    const days = getWeekDays(selectedWeek, trainingDays);
    setDayOrder(days.map((d) => getDayKey(d)));
    setDragFrom(null);
    setDragOver(null);
    setMobileSelected(null);
  }, [selectedWeek, trainingDays]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived values ─────────────────────────────────────────────────────────
  const weekDays = getWeekDays(selectedWeek, trainingDays);
  const maxWeek  = trainingDays.reduce((m, d) => Math.max(m, d.week), 1);
  const logMap   = new Map(logs.map((l) => [l.day_key, l]));
  const todayDayKey = clientDate ? clientDate.replace(" ", "_") : null;
  const todayIdx    = clientDate ? getDayIndex(clientDate, trainingDays) : -1;

  // Derive orderedDays from dayOrder (fallback: natural weekDays order)
  const orderedDays: TrainingDay[] =
    dayOrder.length === weekDays.length
      ? dayOrder
          .map((key) => weekDays.find((d) => getDayKey(d) === key))
          .filter((d): d is TrainingDay => d != null)
      : weekDays;

  // ── Swap helpers ───────────────────────────────────────────────────────────
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  function swapDays(i: number, j: number) {
    if (i === j) return;
    setDayOrder((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    showToast("Days swapped ✓");
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
    if (dragFrom !== null && dragFrom !== i) swapDays(dragFrom, i);
    setDragFrom(null);
    setDragOver(null);
  }

  function onDragEnd() {
    setDragFrom(null);
    setDragOver(null);
    // Keep didDragRef true briefly so the Link onClick can see it.
    setTimeout(() => { didDragRef.current = false; }, 100);
  }

  // ── Mobile grip tap handler ────────────────────────────────────────────────
  function onGripTap(e: React.MouseEvent | React.TouchEvent, i: number) {
    e.stopPropagation();
    e.preventDefault();
    if (mobileSelected === null) {
      // First tap — select this card
      setMobileSelected(i);
    } else if (mobileSelected === i) {
      // Second tap on same card — deselect
      setMobileSelected(null);
    } else {
      // Second tap on different card — swap
      swapDays(mobileSelected, i);
      setMobileSelected(null);
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
          {mobileSelected !== null && (
            <p className="text-xs text-[#1D9E75] mt-1">
              Tap another day&apos;s grip <span className="opacity-70">(⠿)</span> to swap — or tap the same one to cancel
            </p>
          )}
        </header>

        {/* Week selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto [&::-webkit-scrollbar]:hidden pb-1">
          {Array.from({ length: maxWeek }, (_, i) => i + 1).map((w) => (
            <button
              key={w}
              onClick={() => setSelectedWeek(w)}
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

        {/* Day list */}
        <div className="flex flex-col gap-3">
          {orderedDays.map((day, i) => {
            const key      = getDayKey(day);
            const log      = logMap.get(key);
            const thisIdx  = getDayIndex(day.date, trainingDays);
            const isToday  = todayDayKey !== null && key === todayDayKey;
            const isPast   = todayIdx >= 0 && thisIdx >= 0 && thisIdx < todayIdx;
            const isRest   = day.type === "rest";
            const icon     = statusIcon(day);
            const accent   = TYPE_COLOR[day.type];
            const isDragging  = dragFrom === i;
            const isDropTarget = dragOver === i && dragFrom !== null && dragFrom !== i;
            const isMobileSelected = mobileSelected === i;

            return (
              <div
                key={key}
                draggable={!isRest}
                onDragStart={() => onDragStart(i)}
                onDragOver={(e) => onDragOver(e, i)}
                onDrop={() => onDrop(i)}
                onDragEnd={onDragEnd}
                className={[
                  "flex items-stretch bg-[#1A1A1A] rounded-2xl border transition-colors select-none",
                  isToday    ? "border-[#1D9E75]"    : "border-[#3A3A3A]",
                  isDropTarget ? "border-dashed !border-[#1D9E75] bg-[#0A3D2E]/20" : "",
                  isDragging   ? "opacity-40"           : "",
                  isMobileSelected ? "ring-2 ring-[#1D9E75]" : "",
                ].filter(Boolean).join(" ")}
              >
                {/* ── Drag / swap handle ── */}
                <button
                  type="button"
                  aria-label="Drag to reorder"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => onGripTap(e, i)}
                  onTouchEnd={(e) => onGripTap(e, i)}
                  style={{ minWidth: "40px", flexShrink: 0 }}
                  className={[
                    "flex items-center justify-center rounded-l-2xl transition-colors h-full",
                    isRest ? "cursor-default" : "cursor-grab active:cursor-grabbing hover:bg-[#2A2A2A]",
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
                    if (isRest || didDragRef.current) { e.preventDefault(); return; }
                  }}
                  className={`flex-1 p-4 min-w-0 ${isRest ? "cursor-default opacity-60" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Color dot */}
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

                  {/* RPE + notes pill */}
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
