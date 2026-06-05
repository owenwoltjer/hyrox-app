/**
 * /week — Weekly calendar view.
 *
 * Full design spec pending. This scaffold renders all 7 days of the current
 * week as tappable links to /day/[dayKey], so the routing works end-to-end
 * before the polished UI is implemented.
 *
 * TODO: Replace with full design implementation once spec is delivered.
 */
"use client";

import { useState, useEffect } from "react";
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

// suppress unused-import lint — PHASE_1 is used as fallback below

const TYPE_COLOR: Record<WorkoutType, string> = {
  run: "#1A6B9E",
  lift: "#7F77DD",
  combo: "#D85A30",
  rest: "#3A3A3A",
  bike: "#1A6B9E",
  hyrox: "#1D9E75",
};

export default function WeekPage() {
  // clientDate = "Jun 4" format, set from browser in useEffect (no UTC issue)
  const [clientDate, setClientDate] = useState<string | null>(null);
  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>(PHASE_1);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    const now = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const d = `${months[now.getMonth()]} ${now.getDate()}`;
    setClientDate(d);

    (async () => {
      // Fetch training plan from DB (fall back to PHASE_1 on error)
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

      // Fetch session logs
      fetch("/api/sessions")
        .then((r) => r.json())
        .then(({ data }) => { if (data) setLogs(data); })
        .catch(() => {});
    })();
  }, []);

  const weekDays = getWeekDays(selectedWeek, trainingDays);
  const maxWeek = trainingDays.reduce((m, d) => Math.max(m, d.week), 1);
  // day_key in logs is "Jun_4"; getDayKey(day) is also "Jun_4"
  const logMap = new Map(logs.map((l) => [l.day_key, l]));
  // URL-safe version of today for isToday comparison
  const todayDayKey = clientDate ? clientDate.replace(" ", "_") : null;
  const todayIdx = clientDate ? getDayIndex(clientDate, trainingDays) : -1;

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
            Phase 1 · Week {selectedWeek}
          </h1>
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
          {weekDays.map((day) => {
            const key = getDayKey(day);           // "Jun_4"
            const log = logMap.get(key);
            const thisIdx = getDayIndex(day.date, trainingDays);
            const isToday = todayDayKey !== null && key === todayDayKey;
            const isPast  = todayIdx >= 0 && thisIdx >= 0 && thisIdx < todayIdx;
            const isRest = day.type === "rest";
            const icon = statusIcon(day);
            const accentColor = TYPE_COLOR[day.type];

            return (
              <Link
                key={key}
                href={isRest ? "#" : `/day/${key}`}
                onClick={isRest ? (e) => e.preventDefault() : undefined}
                className={`block bg-[#1A1A1A] rounded-2xl p-4 border transition-colors ${
                  isToday
                    ? "border-[#1D9E75]"
                    : "border-[#3A3A3A] hover:border-[#555555]"
                } ${isRest ? "cursor-default opacity-60" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Color dot */}
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: accentColor }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#9CA3AF]">
                          {day.dow} · {day.date}
                        </span>
                        {isToday && (
                          <span className="text-[10px] font-semibold text-[#1D9E75] uppercase tracking-wider">
                            Today
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white mt-0.5">
                        {day.session}
                      </p>
                      <p className="text-xs font-light text-[#9CA3AF] mt-0.5 leading-relaxed">
                        {day.desc}
                      </p>
                    </div>
                  </div>

                  {/* Status badge */}
                  {icon && (
                    <span
                      className={`text-lg font-bold shrink-0 ${
                        icon === "✓" ? "text-[#1D9E75]" : "text-[#D85A30]"
                      }`}
                    >
                      {icon}
                    </span>
                  )}
                  {!icon && !isRest && (
                    <span className="text-[#6B7280] text-lg">›</span>
                  )}
                </div>

                {/* RPE pill if logged */}
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
    </div>
  );
}
