"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { getSupabase } from "@/lib/supabase";
import {
  decodePolyline,
  polylineToSvgPath,
  formatPacePerMile,
  formatDuration,
  formatDistanceMiles,
  formatElevationFt,
  classifySplitToPaceZone,
  PACE_ZONE_META,
  HR_ZONE_META,
} from "@/lib/stravaUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface SplitMetric {
  split: number;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  elevation_difference: number;
  average_speed: number;
  pace_zone: number;
  average_heartrate?: number;
}

interface StravaActivity {
  id: string;
  strava_id: number;
  day_key: string | null;
  name: string | null;
  type: string | null;
  sport_type: string | null;
  start_date: string | null;
  distance: number | null;
  moving_time: number | null;
  elapsed_time: number | null;
  total_elevation_gain: number | null;
  average_speed: number | null;
  max_speed: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_cadence: number | null;
  suffer_score: number | null;
  calories: number | null;
  map_polyline: string | null;
  map_summary_polyline: string | null;
  splits_metric: SplitMetric[] | null;
  laps: unknown[] | null;
  best_efforts: unknown[] | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Route Art SVG
// ---------------------------------------------------------------------------
function RouteArt({ polyline }: { polyline: string }) {
  const W = 380, H = 220;
  const coords = decodePolyline(polyline);
  const path = polylineToSvgPath(coords, W, H, 28);
  if (!path) return null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ background: "#0D0D0D", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        {/* Glow filter */}
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Route gradient */}
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#1D9E75" stopOpacity="0.5" />
          <stop offset="40%"  stopColor="#1D9E75" stopOpacity="1" />
          <stop offset="70%"  stopColor="#22D3A0" stopOpacity="1" />
          <stop offset="100%" stopColor="#1D9E75" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Outer glow */}
      <path
        d={path.d}
        fill="none"
        stroke="#1D9E75"
        strokeWidth="6"
        strokeOpacity="0.18"
        filter="url(#glow)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Mid glow */}
      <path
        d={path.d}
        fill="none"
        stroke="#1D9E75"
        strokeWidth="3"
        strokeOpacity="0.35"
        filter="url(#glow)"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Main line */}
      <path
        d={path.d}
        fill="none"
        stroke="url(#routeGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Start dot */}
      <circle
        cx={path.start.x} cy={path.start.y} r="7"
        fill="#1D9E75" filter="url(#glow)" opacity="0.6"
      />
      <circle cx={path.start.x} cy={path.start.y} r="4" fill="#1D9E75" />
      <circle cx={path.start.x} cy={path.start.y} r="2" fill="white" />

      {/* End dot */}
      <circle
        cx={path.end.x} cy={path.end.y} r="7"
        fill="#FC4C02" filter="url(#glow)" opacity="0.6"
      />
      <circle cx={path.end.x} cy={path.end.y} r="4" fill="#FC4C02" />
      <circle cx={path.end.x} cy={path.end.y} r="2" fill="white" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------
function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4 flex flex-col gap-1">
      <span className="text-[10px] font-medium tracking-widest uppercase text-[#6B7280]">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-white leading-none">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-light text-[#9CA3AF]">{unit}</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pace Zones Chart
// ---------------------------------------------------------------------------
function PaceZonesChart({ splits }: { splits: SplitMetric[] }) {
  const zoneSeconds = [0, 0, 0, 0, 0];
  for (const s of splits) {
    const z = classifySplitToPaceZone(s.average_speed);
    zoneSeconds[z] += s.moving_time;
  }

  const data = PACE_ZONE_META.map((z, i) => ({
    label: z.label,
    seconds: zoneSeconds[i],
    time: formatDuration(zoneSeconds[i]),
    color: z.color,
  })).filter((d) => d.seconds > 0);

  if (data.length === 0) return null;

  return (
    <section className="px-5 mb-8">
      <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF] mb-4">
        Pace Zones
      </h3>
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as { label: string; time: string };
                return (
                  <div className="bg-[#242424] border border-[#3A3A3A] rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-white">{d.label}</p>
                    <p className="text-xs text-[#9CA3AF]">{d.time}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-[10px] text-[#9CA3AF]">
                {d.label} {d.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// HR Zones Chart
// ---------------------------------------------------------------------------
function HRZonesChart({ splits }: { splits: SplitMetric[] }) {
  const splitsWithHR = splits.filter((s) => s.average_heartrate != null);
  if (splitsWithHR.length === 0) return null;

  const zoneSeconds = [0, 0, 0, 0, 0];
  for (const s of splitsWithHR) {
    const hr = s.average_heartrate!;
    const zi = HR_ZONE_META.findIndex((z) => hr >= z.min && hr < z.max);
    if (zi >= 0) zoneSeconds[zi] += s.moving_time;
  }

  const data = HR_ZONE_META.map((z, i) => ({
    label: z.label.replace("Zone ", "Z"),
    fullLabel: z.label,
    seconds: zoneSeconds[i],
    time: formatDuration(zoneSeconds[i]),
    color: z.color,
  })).filter((d) => d.seconds > 0);

  if (data.length === 0) return null;

  return (
    <section className="px-5 mb-8">
      <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF] mb-4">
        Heart Rate Zones
      </h3>
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl p-4">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: "#6B7280", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis hide />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as { fullLabel: string; time: string };
                return (
                  <div className="bg-[#242424] border border-[#3A3A3A] rounded-lg px-3 py-2">
                    <p className="text-xs font-medium text-white">{d.fullLabel}</p>
                    <p className="text-xs text-[#9CA3AF]">{d.time}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="seconds" radius={[4, 4, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
              <span className="text-[10px] text-[#9CA3AF]">{d.fullLabel}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Splits Table
// ---------------------------------------------------------------------------
function SplitsTable({
  splits,
  avgSpeed,
}: {
  splits: SplitMetric[];
  avgSpeed: number | null;
}) {
  if (splits.length === 0) return null;

  const avgPaceSec = avgSpeed ? 1609.344 / avgSpeed : null;

  function paceColor(speedMps: number): string {
    if (!avgPaceSec) return "#FFFFFF";
    const splitPaceSec = 1609.344 / speedMps;
    const delta = splitPaceSec - avgPaceSec;
    if (delta < -15) return "#34D399"; // much faster = bright green
    if (delta < 0)   return "#86EFAC"; // slightly faster = light green
    if (delta < 15)  return "#FCA5A5"; // slightly slower = light red
    return "#EF4444";                  // much slower = red
  }

  return (
    <section className="px-5 mb-10">
      <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF] mb-4">
        Splits
      </h3>
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-4 px-4 py-2 border-b border-[#2A2A2A]">
          {["km", "pace", "HR", "elev"].map((h) => (
            <span
              key={h}
              className="text-[10px] font-medium tracking-wider uppercase text-[#6B7280]"
            >
              {h}
            </span>
          ))}
        </div>
        {/* Rows */}
        <div className="overflow-y-auto max-h-[320px] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {splits.map((s) => (
            <div
              key={s.split}
              className="grid grid-cols-4 px-4 py-3 border-b border-[#1E1E1E] last:border-0"
            >
              <span className="text-sm font-medium text-[#9CA3AF]">
                {s.split}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ color: paceColor(s.average_speed) }}
              >
                {formatPacePerMile(s.average_speed)}
              </span>
              <span className="text-sm font-light text-white">
                {s.average_heartrate ? Math.round(s.average_heartrate) : "—"}
              </span>
              <span className="text-sm font-light text-[#9CA3AF]">
                {s.elevation_difference > 0 ? "+" : ""}
                {Math.round(s.elevation_difference)}m
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Type badge
// ---------------------------------------------------------------------------
function TypeBadge({ sportType }: { sportType: string | null }) {
  const t = (sportType ?? "").toLowerCase();
  const isRun   = t.includes("run");
  const isRide  = t.includes("ride") || t.includes("bike");
  const isWalk  = t.includes("walk");
  const color   = isRun ? "#1D9E75" : isRide ? "#3B82F6" : isWalk ? "#F59E0B" : "#9CA3AF";
  const bg      = isRun ? "#0A3D2E" : isRide ? "#0A2840" : isWalk ? "#3D2A00" : "#1A1A1A";
  const label   = sportType ?? "Activity";
  return (
    <span
      className="text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-full"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Strava wordmark icon
// ---------------------------------------------------------------------------
function StravaIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#FC4C02">
      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Format date
// ---------------------------------------------------------------------------
function formatActivityDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ActivityPage() {
  const params = useParams();
  const router = useRouter();
  const stravaId = params.stravaId as string;

  const [activity, setActivity] = useState<StravaActivity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!stravaId) return;
    (async () => {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("strava_activities" as "session_logs") // cast to bypass typed schema
        .select("*")
        .eq("strava_id", stravaId)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setActivity(data as unknown as StravaActivity);
      }
      setIsLoading(false);
    })();
  }, [stravaId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#1D9E75] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (notFound || !activity) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] text-white flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-[#9CA3AF] text-sm">Activity not found</p>
        <button
          onClick={() => router.back()}
          className="text-[#1D9E75] text-sm font-medium"
        >
          ← Back
        </button>
      </div>
    );
  }

  const polyline =
    activity.map_polyline || activity.map_summary_polyline;
  const hasRoute =
    !!polyline &&
    (
      (activity.sport_type ?? activity.type ?? "").toLowerCase().includes("run") ||
      (activity.sport_type ?? activity.type ?? "").toLowerCase().includes("ride") ||
      (activity.sport_type ?? activity.type ?? "").toLowerCase().includes("walk")
    );

  const splits = activity.splits_metric ?? [];
  const pace = activity.average_speed
    ? formatPacePerMile(activity.average_speed) + "/mi"
    : "—";
  const dist = activity.distance
    ? formatDistanceMiles(activity.distance)
    : "—";
  const time = activity.moving_time
    ? formatDuration(activity.moving_time)
    : "—";
  const elev = activity.total_elevation_gain != null
    ? formatElevationFt(activity.total_elevation_gain) + " ft"
    : "—";
  const hr = activity.average_heartrate
    ? Math.round(activity.average_heartrate) + " bpm"
    : "—";
  const cal = activity.calories ? Math.round(activity.calories).toString() : "—";
  const dateStr = activity.start_date
    ? formatActivityDate(activity.start_date)
    : "";

  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white pb-16">
      {/* ── Header ── */}
      <header className="min-h-[60px] flex justify-between items-end px-5 pb-3 pt-[env(safe-area-inset-top,0px)] shrink-0 bg-[#0D0D0D]/95 backdrop-blur-md z-20 sticky top-0">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 flex items-center justify-start text-white hover:text-[#9CA3AF] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-1.5">
          <StravaIcon size={16} />
          <span className="text-sm font-medium text-[#FC4C02]">Strava</span>
        </div>
        <div className="w-10" />
      </header>

      {/* ── Route Art ── */}
      {hasRoute && (
        <div className="relative w-full overflow-hidden" style={{ background: "#0D0D0D" }}>
          <RouteArt polyline={polyline!} />
          {/* Fade edges */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(to bottom, #0D0D0D 0%, transparent 15%, transparent 85%, #0D0D0D 100%)",
            }}
          />
        </div>
      )}

      {/* ── Title block ── */}
      <section className="px-5 pt-4 pb-6">
        <div className="flex items-start justify-between mb-2">
          <TypeBadge sportType={activity.sport_type ?? activity.type} />
          {activity.suffer_score != null && (
            <div className="flex items-center gap-1 bg-[#3D1E0F] px-2.5 py-1 rounded-full">
              <Zap size={11} className="text-[#FC4C02]" />
              <span className="text-xs font-medium text-[#FC4C02]">
                {activity.suffer_score} suffer
              </span>
            </div>
          )}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white mt-3 mb-1 leading-tight">
          {activity.name ?? "Untitled Activity"}
        </h1>
        <p className="text-sm font-light text-[#9CA3AF]">{dateStr}</p>
      </section>

      {/* ── Stats Grid ── */}
      <section className="px-5 mb-8">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Distance"    value={dist}  unit="mi" />
          <StatCard label="Time"        value={time} />
          <StatCard label="Avg Pace"    value={pace} />
          <StatCard label="Avg HR"      value={hr} />
          <StatCard label="Elevation"   value={elev} />
          <StatCard label="Calories"    value={cal}   unit="cal" />
        </div>
      </section>

      {/* ── Pace Zones ── */}
      {splits.length > 0 && <PaceZonesChart splits={splits} />}

      {/* ── HR Zones ── */}
      {splits.length > 0 && <HRZonesChart splits={splits} />}

      {/* ── Splits ── */}
      {splits.length > 0 && (
        <SplitsTable splits={splits} avgSpeed={activity.average_speed} />
      )}

      {/* ── View on Strava ── */}
      <div className="px-5">
        <a
          href={`https://www.strava.com/activities/${activity.strava_id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full h-12 bg-[#FC4C02] rounded-xl flex items-center justify-center gap-2 text-white font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          <StravaIcon size={16} />
          View on Strava
        </a>
      </div>

      {/* Spacer for bottom safe area */}
      <div className="h-8" />
    </div>
  );
}
