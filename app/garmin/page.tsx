"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Home,
  Calendar,
  Watch,
  MessageCircle,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import type { GarminEntry } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ChartMetric = "sleep" | "hr" | "vo2";

// ---------------------------------------------------------------------------
// Benchmark helpers
// ---------------------------------------------------------------------------
function sleepStatus(v: number | null): { label: string; color: string; bg: string } {
  if (v == null) return { label: "No data",       color: "#6B7280", bg: "#1A1A1A" };
  if (v >= 85)   return { label: "Excellent",     color: "#1D9E75", bg: "#0A3D2E" };
  if (v >= 75)   return { label: "On track",      color: "#D4A017", bg: "#3D2A00" };
  return              { label: "Below target",  color: "#D85A30", bg: "#3D1208" };
}
function hrStatus(v: number | null): { label: string; color: string; bg: string } {
  if (v == null) return { label: "No data",       color: "#6B7280", bg: "#1A1A1A" };
  if (v < 50)    return { label: "Excellent",     color: "#1D9E75", bg: "#0A3D2E" };
  if (v <= 55)   return { label: "On track",      color: "#D4A017", bg: "#3D2A00" };
  return              { label: "Below target",  color: "#D85A30", bg: "#3D1208" };
}
function vo2Status(v: number | null): { label: string; color: string; bg: string } {
  if (v == null) return { label: "No data",       color: "#6B7280", bg: "#1A1A1A" };
  if (v >= 58)   return { label: "Excellent",     color: "#1D9E75", bg: "#0A3D2E" };
  if (v >= 54)   return { label: "On track",      color: "#D4A017", bg: "#3D2A00" };
  return              { label: "Below target",  color: "#D85A30", bg: "#3D1208" };
}

// ---------------------------------------------------------------------------
// Trend helper — returns display string and colour
// ---------------------------------------------------------------------------
function trend(
  latest: number | null,
  avg7: number | null,
  lowerIsBetter = false
): { text: string; color: string; icon: "up" | "down" | "flat" } {
  if (latest == null || avg7 == null || avg7 === 0) {
    return { text: "—", color: "#6B7280", icon: "flat" };
  }
  const delta = latest - avg7;
  if (Math.abs(delta) < 0.05) return { text: "—", color: "#6B7280", icon: "flat" };
  const abs = Math.abs(delta).toFixed(delta % 1 === 0 ? 0 : 1);
  const improving = lowerIsBetter ? delta < 0 : delta > 0;
  const arrow = delta > 0 ? "↑" : "↓";
  const icon: "up" | "down" = delta > 0 ? "up" : "down";
  return {
    text: `${arrow} ${abs}`,
    color: improving ? "#1D9E75" : "#D85A30",
    icon,
  };
}

function avg(arr: GarminEntry[], key: keyof GarminEntry): number | null {
  const vals = arr
    .map((e) => e[key] as number | null)
    .filter((v): v is number => v != null);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function GarminPage() {
  const [entries, setEntries] = useState<GarminEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayStr, setTodayStr] = useState("");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("sleep");
  const [showToast, setShowToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [sleepInput, setSleepInput] = useState("");
  const [hrInput, setHrInput] = useState("");
  const [vo2Input, setVo2Input] = useState("");

  // ── Mount: resolve date + fetch all garmin logs ───────────────────────────
  useEffect(() => {
    // "Jun 5" format — consistent with session_logs date display
    const d = new Date();
    setTodayStr(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));

    (async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("garmin_logs")
        .select("*")
        .order("created_at", { ascending: false });
      console.log("[GARMIN] fetched entries:", data?.length, error);
      if (data) setEntries(data as GarminEntry[]);
      setIsLoading(false);
    })();
  }, []);

  // ── Save handler ──────────────────────────────────────────────────────────
  async function handleSave() {
    if (!sleepInput && !hrInput && !vo2Input) return;
    setIsSaving(true);
    setSaveError(null);

    // ISO date for the DB date column — matches unique constraint key
    const now = new Date();
    const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const payload = {
      date: isoDate,
      sleep_score: sleepInput ? Math.min(100, Math.max(0, parseInt(sleepInput))) : null,
      avg_hr: hrInput ? parseInt(hrInput) : null,
      vo2_max: vo2Input ? parseFloat(parseFloat(vo2Input).toFixed(1)) : null,
      created_at: now.toISOString(),
    };
    console.log("[GARMIN] saving:", payload);

    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("garmin_logs")
      .insert(payload as any)
      .select();

    console.log("[GARMIN] save result:", data, error?.message, error?.code);

    if (error) {
      setSaveError(error.message ?? "Failed to save — try again");
    } else if (data?.[0]) {
      const saved = data[0] as GarminEntry;
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === saved.id);
        return idx >= 0
          ? prev.map((e, i) => (i === idx ? saved : e))
          : [saved, ...prev];
      });
      setSleepInput("");
      setHrInput("");
      setVo2Input("");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
    setIsSaving(false);
  }

  // ── Delete handler ────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    const supabase = getSupabase();
    await supabase.from("garmin_logs").delete().eq("id", id);
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const latest = entries[0] ?? null;
  const last7  = entries.slice(0, 7);
  const prior7 = entries.slice(7, 14);

  const avgSleep7  = avg(last7,  "sleep_score");
  const avgHr7     = avg(last7,  "avg_hr");
  const avgVo27    = avg(last7,  "vo2_max");
  const avgSleepP  = avg(prior7, "sleep_score");
  const avgHrP     = avg(prior7, "avg_hr");
  const avgVo2P    = avg(prior7, "vo2_max");

  const sleepTrend = trend(latest?.sleep_score ?? null, avgSleepP, false);
  const hrTrend    = trend(latest?.avg_hr      ?? null, avgHrP,    true);
  const vo2Trend   = trend(latest?.vo2_max     ?? null, avgVo2P,   false);

  // Chart — last 14 entries in chronological order
  const chartData = [...entries]
    .slice(0, 14)
    .reverse()
    .map((e) => ({
      date: e.date,
      sleep: e.sleep_score,
      hr:    e.avg_hr,
      vo2:   e.vo2_max,
    }));

  const CHART_CFG: Record<ChartMetric, { dataKey: string; color: string; label: string; unit: string }> = {
    sleep: { dataKey: "sleep", color: "#7F77DD", label: "Sleep Score", unit: "" },
    hr:    { dataKey: "hr",    color: "#D85A30", label: "Avg HR",       unit: " bpm" },
    vo2:   { dataKey: "vo2",   color: "#1D9E75", label: "VO2 Max",      unit: "" },
  };
  const cfg = CHART_CFG[chartMetric];

  // ── Sleep / HR / VO2 benchmark status for latest reading ─────────────────
  const sStatus  = sleepStatus(latest?.sleep_score ?? null);
  const hStatus  = hrStatus(latest?.avg_hr         ?? null);
  const v2Status = vo2Status(latest?.vo2_max        ?? null);

  // Format date for history display
  function fmtDate(d: string): string {
    if (!d) return "—";
    // Handle both ISO "2025-06-04" and "Jun 4" formats
    if (d.includes("-")) {
      const parts = d.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const m = parseInt(parts[1]) - 1;
      return `${months[m]} ${parseInt(parts[2])}`;
    }
    return d;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white">

        {/* ── Header ── */}
        <header className="min-h-[60px] flex justify-between items-end px-5 pb-3 pt-[env(safe-area-inset-top,0px)] shrink-0">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-light tracking-wider uppercase text-[#9CA3AF]">
              HYROX Coach
            </span>
            <h1 className="text-xl font-semibold tracking-tight text-white">
              Garmin · {todayStr}
            </h1>
          </div>
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: "#1D9E75", boxShadow: "0 0 8px rgba(29,158,117,0.6)" }}
          />
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto px-5 pt-2 pb-24 flex flex-col gap-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

          {/* ── 1. Log Today's Data ── */}
          <section className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-5">
            <h2 className="text-xs font-medium tracking-wider uppercase text-[#9CA3AF] mb-4">
              Log Today
            </h2>

            <div className="flex flex-col gap-3 mb-4">
              {/* Sleep */}
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-medium tracking-wider uppercase w-[80px] shrink-0"
                  style={{ color: "#7F77DD" }}
                >
                  Sleep
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={sleepInput}
                  onChange={(e) => setSleepInput(e.target.value)}
                  placeholder="0–100"
                  className="flex-1 bg-[#242424] border border-[#3A3A3A] rounded-xl px-4 py-2.5 text-sm font-light text-white placeholder-[#6B7280] outline-none focus:border-[#7F77DD]/60 transition-colors"
                />
              </div>
              {/* Heart Rate */}
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-medium tracking-wider uppercase w-[80px] shrink-0"
                  style={{ color: "#D85A30" }}
                >
                  Avg HR
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={hrInput}
                  onChange={(e) => setHrInput(e.target.value)}
                  placeholder="bpm"
                  className="flex-1 bg-[#242424] border border-[#3A3A3A] rounded-xl px-4 py-2.5 text-sm font-light text-white placeholder-[#6B7280] outline-none focus:border-[#D85A30]/60 transition-colors"
                />
              </div>
              {/* VO2 */}
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-medium tracking-wider uppercase w-[80px] shrink-0"
                  style={{ color: "#1D9E75" }}
                >
                  VO2 Max
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={vo2Input}
                  onChange={(e) => setVo2Input(e.target.value)}
                  placeholder="e.g. 54.3"
                  className="flex-1 bg-[#242424] border border-[#3A3A3A] rounded-xl px-4 py-2.5 text-sm font-light text-white placeholder-[#6B7280] outline-none focus:border-[#1D9E75]/60 transition-colors"
                />
              </div>
            </div>

            {saveError && (
              <p className="text-xs text-[#D85A30] mb-3">{saveError}</p>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || (!sleepInput && !hrInput && !vo2Input)}
              className="w-full h-[48px] bg-[#1D9E75] text-white text-sm font-semibold rounded-xl flex items-center justify-center transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-40"
            >
              {isSaving ? "Saving…" : "Save Today's Data"}
            </button>
          </section>

          {/* ── 2. Trend Summary Cards ── */}
          <section>
            <h2 className="text-xs font-medium tracking-wider uppercase text-[#9CA3AF] mb-3">
              Latest Metrics
            </h2>
            <div className="grid grid-cols-3 gap-3">
              {/* Sleep */}
              <div className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "#7F77DD" }}>
                  Sleep
                </span>
                <span className="text-2xl font-semibold tracking-tight text-white leading-none">
                  {isLoading ? "—" : (latest?.sleep_score ?? "—")}
                </span>
                <span className="text-[10px] font-light text-[#9CA3AF]">
                  7d avg {avgSleep7 != null ? avgSleep7.toFixed(0) : "—"}
                </span>
                <span className="text-xs font-medium mt-0.5" style={{ color: sleepTrend.color }}>
                  {sleepTrend.text}
                </span>
              </div>
              {/* HR */}
              <div className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "#D85A30" }}>
                  Avg HR
                </span>
                <span className="text-2xl font-semibold tracking-tight text-white leading-none">
                  {isLoading ? "—" : (latest?.avg_hr ?? "—")}
                </span>
                <span className="text-[10px] font-light text-[#9CA3AF]">
                  7d avg {avgHr7 != null ? avgHr7.toFixed(0) : "—"}
                </span>
                <span className="text-xs font-medium mt-0.5" style={{ color: hrTrend.color }}>
                  {hrTrend.text}
                </span>
              </div>
              {/* VO2 */}
              <div className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-3 flex flex-col gap-1">
                <span className="text-[10px] font-medium tracking-wider uppercase" style={{ color: "#1D9E75" }}>
                  VO2 Max
                </span>
                <span className="text-2xl font-semibold tracking-tight text-white leading-none">
                  {isLoading ? "—" : (latest?.vo2_max ?? "—")}
                </span>
                <span className="text-[10px] font-light text-[#9CA3AF]">
                  7d avg {avgVo27 != null ? avgVo27.toFixed(1) : "—"}
                </span>
                <span className="text-xs font-medium mt-0.5" style={{ color: vo2Trend.color }}>
                  {vo2Trend.text}
                </span>
              </div>
            </div>
          </section>

          {/* ── 3. 14-Day Chart ── */}
          <section className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-medium tracking-wider uppercase text-[#9CA3AF]">
                14-Day Trend
              </h2>
              {/* Metric tab selector */}
              <div className="flex gap-1">
                {(["sleep", "hr", "vo2"] as ChartMetric[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMetric(m)}
                    className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors"
                    style={
                      chartMetric === m
                        ? { backgroundColor: CHART_CFG[m].color + "22", color: CHART_CFG[m].color, border: `1px solid ${CHART_CFG[m].color}40` }
                        : { backgroundColor: "#242424", color: "#9CA3AF", border: "1px solid #3A3A3A" }
                    }
                  >
                    {m === "sleep" ? "Sleep" : m === "hr" ? "HR" : "VO2"}
                  </button>
                ))}
              </div>
            </div>

            {chartData.length < 2 ? (
              <div className="h-[180px] flex items-center justify-center">
                <p className="text-sm font-light text-[#6B7280]">
                  Log at least 2 days to see the chart
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    tickFormatter={fmtDate}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1A1A1A", border: "1px solid #3A3A3A", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#9CA3AF" }}
                    itemStyle={{ color: cfg.color }}
                    formatter={(v: number) => [`${v}${cfg.unit}`, cfg.label]}
                    labelFormatter={fmtDate}
                  />
                  <Line
                    type="monotone"
                    dataKey={cfg.dataKey}
                    stroke={cfg.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: cfg.color }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>

          {/* ── 4. Athlete Benchmarks ── */}
          <section className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-5">
            <h2 className="text-xs font-medium tracking-wider uppercase text-[#9CA3AF] mb-1">
              Sub-60 Benchmarks
            </h2>
            <p className="text-[11px] font-light text-[#6B7280] mb-4">
              Evidence-based targets for sub-60 HYROX Open athletes
            </p>

            <div className="flex flex-col gap-3">
              {/* Sleep benchmark */}
              <div className="bg-[#242424] rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "#7F77DD" }}>
                      Sleep Score
                    </span>
                    <span className="text-[10px] font-light text-[#6B7280]">Target 75+</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    Latest: {latest?.sleep_score ?? "—"}
                    <span className="text-xs font-light text-[#9CA3AF] ml-1">/ elite 78–82</span>
                  </span>
                </div>
                <span
                  className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: sStatus.bg, color: sStatus.color }}
                >
                  {sStatus.label}
                </span>
              </div>

              {/* HR benchmark */}
              <div className="bg-[#242424] rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "#D85A30" }}>
                      Resting HR
                    </span>
                    <span className="text-[10px] font-light text-[#6B7280]">Target &lt;55 bpm</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    Latest: {latest?.avg_hr != null ? `${latest.avg_hr} bpm` : "—"}
                    <span className="text-xs font-light text-[#9CA3AF] ml-1">/ elite 48–54</span>
                  </span>
                </div>
                <span
                  className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: hStatus.bg, color: hStatus.color }}
                >
                  {hStatus.label}
                </span>
              </div>

              {/* VO2 benchmark */}
              <div className="bg-[#242424] rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium tracking-wider uppercase" style={{ color: "#1D9E75" }}>
                      VO2 Max
                    </span>
                    <span className="text-[10px] font-light text-[#6B7280]">Target 55+</span>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    Latest: {latest?.vo2_max ?? "—"}
                    <span className="text-xs font-light text-[#9CA3AF] ml-1">/ elite 54–58</span>
                  </span>
                </div>
                <span
                  className="shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                  style={{ backgroundColor: v2Status.bg, color: v2Status.color }}
                >
                  {v2Status.label}
                </span>
              </div>
            </div>
          </section>

          {/* ── 5. History List ── */}
          <section>
            <h2 className="text-xs font-medium tracking-wider uppercase text-[#9CA3AF] mb-3">
              History
            </h2>

            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-[#1A1A1A] rounded-xl animate-pulse" />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl py-8 flex items-center justify-center">
                <p className="text-sm font-light text-[#6B7280]">
                  No data logged yet — start above
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Column header */}
                <div className="flex items-center px-4 gap-2">
                  <span className="text-[10px] font-medium uppercase text-[#6B7280] w-[60px] shrink-0">Date</span>
                  <span className="text-[10px] font-medium uppercase text-[#7F77DD] flex-1 text-center">Sleep</span>
                  <span className="text-[10px] font-medium uppercase text-[#D85A30] flex-1 text-center">HR</span>
                  <span className="text-[10px] font-medium uppercase text-[#1D9E75] flex-1 text-center">VO2</span>
                  <div className="w-8 shrink-0" />
                </div>

                {entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-[#1A1A1A] border border-[#3A3A3A] rounded-xl px-4 py-3 flex items-center gap-2"
                  >
                    <span className="text-xs font-medium text-white w-[60px] shrink-0">
                      {fmtDate(entry.date)}
                    </span>
                    <span className="text-xs font-light flex-1 text-center" style={{ color: "#7F77DD" }}>
                      {entry.sleep_score ?? "—"}
                    </span>
                    <span className="text-xs font-light flex-1 text-center" style={{ color: "#D85A30" }}>
                      {entry.avg_hr != null ? `${entry.avg_hr}` : "—"}
                    </span>
                    <span className="text-xs font-light flex-1 text-center" style={{ color: "#1D9E75" }}>
                      {entry.vo2_max ?? "—"}
                    </span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#D85A30] hover:bg-[#D85A30]/10 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

        </main>

        {/* ── Tab Bar ── */}
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D]/95 backdrop-blur-md pt-4 px-6 border-t border-[#3A3A3A] z-50 pb-[env(safe-area-inset-bottom,32px)]">
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
              className="flex flex-col items-center gap-1.5 text-[#1D9E75]"
            >
              <Watch
                size={24}
                fill="#1D9E75"
                className="drop-shadow-[0_0_8px_rgba(29,158,117,0.5)]"
              />
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

      {/* ── Toast ── */}
      {showToast && (
        <div className="fixed bottom-[130px] left-1/2 -translate-x-1/2 z-50 bg-[#0A3D2E] border border-[#1D9E75] rounded-xl px-5 py-3 flex items-center gap-2 shadow-xl">
          <span className="text-[#1D9E75] font-semibold text-sm">✓</span>
          <span className="text-white text-sm font-medium whitespace-nowrap">Logged</span>
        </div>
      )}
    </>
  );
}
