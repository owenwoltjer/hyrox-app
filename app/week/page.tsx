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
  getDayByDate,
  getDayKey,
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

function todayDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WeekPage() {
  const [clientDate, setClientDate] = useState<string | null>(null);
  const [logs, setLogs] = useState<SessionLog[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    const d = todayDateStr();
    setClientDate(d);
    setSelectedWeek(getWeekForDate(d));
    fetch("/api/sessions")
      .then((r) => r.json())
      .then(({ data }) => { if (data) setLogs(data); })
      .catch(() => {});
  }, []);

  const weekDays = getWeekDays(selectedWeek);
  const logMap = new Map(logs.map((l) => [l.day_key, l]));
  const today = clientDate ?? "";

  function statusIcon(day: TrainingDay) {
    const log = logMap.get(getDayKey(day));
    if (!log) return null;
    if (log.status === "completed" || log.status === "modified") return "✓";
    if (log.status === "skipped") return "✗";
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white">
      <main className="flex-1 overflow-y-auto px-5 pt-12 pb-28">
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
          {Array.from({ length: 8 }, (_, i) => i + 1).map((w) => (
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
            const key = getDayKey(day);
            const log = logMap.get(key);
            const isToday = key === today;
            const isPast = key < today;
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
                          {day.dow} {day.date.slice(5).replace("-", "/")}
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
                  {!icon && !isRest && !isPast && (
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
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D]/95 backdrop-blur-md pt-4 pb-8 px-6 border-t border-[#3A3A3A] z-50">
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
