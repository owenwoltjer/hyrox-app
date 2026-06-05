"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Pencil,
  Plus,
  Minus,
  Sparkles,
  Home,
  Calendar,
  Watch,
  MessageCircle,
  Moon,
} from "lucide-react";
import { getDayByKey, getDayKey, getDayIndex, PHASE_1 } from "@/lib/trainingData";
import { getSupabase } from "@/lib/supabase";
import type { SessionLog, TrainingDay, WorkoutType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type ViewState = "logging" | "editing" | "completed" | "skipped";

// ---------------------------------------------------------------------------
// Design constants
// ---------------------------------------------------------------------------
const TYPE_BADGE_BG: Record<WorkoutType, string> = {
  run: "#0A2840",
  lift: "#1E1B40",
  combo: "#3D1E0F",
  rest: "#1A1A1A",
  bike: "#0A2840",
  hyrox: "#0A3D2E",
};
const TYPE_BADGE_TEXT: Record<WorkoutType, string> = {
  run: "#1A6B9E",
  lift: "#7F77DD",
  combo: "#D85A30",
  rest: "#9CA3AF",
  bike: "#1A6B9E",
  hyrox: "#1D9E75",
};
const TYPE_BORDER: Record<WorkoutType, string> = {
  run: "#1A6B9E",
  lift: "#7F77DD",
  combo: "#D85A30",
  rest: "#3A3A3A",
  bike: "#1A6B9E",
  hyrox: "#1D9E75",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/**
 * Format header from a TrainingDay — uses stored dow + date fields.
 * e.g. dow="Thu", date="Jun 4" → "Thursday · Jun 4"
 * No new Date() needed.
 */
function formatDayHeader(dow: string, date: string): string {
  const FULL: Record<string, string> = {
    Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
    Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
  };
  return `${FULL[dow] ?? dow} · ${date}`;
}

function rpeColor(v: number): string {
  if (v <= 3) return "#1D9E75";
  if (v <= 6) return "#D97706";
  return "#D85A30";
}

function rpeLabel(v: number): string {
  if (v <= 2) return "Very Easy";
  if (v <= 4) return "Moderate";
  if (v <= 6) return "Comfortably Hard";
  if (v <= 8) return "Hard Effort";
  if (v === 9) return "Very Hard";
  return "Max Effort";
}

interface BulletItem {
  text: string;
  primary?: boolean;
}

function getSessionBullets(day: TrainingDay): BulletItem[] {
  const mainSet: BulletItem = { text: day.desc, primary: true };

  switch (day.type) {
    case "run": {
      const isSpeed =
        /speed|repeat|1000m|interval/i.test(day.session + " " + day.desc);
      const isEndless = /endless/i.test(day.session);
      if (isSpeed || isEndless) {
        return [
          { text: "Warm up: 10 min easy jog + 4 × 100m strides" },
          mainSet,
          { text: "90 seconds standing rest between each interval" },
          { text: "Cool down: 10 min easy jog" },
          { text: "Log every individual split — not just the average" },
        ];
      }
      return [
        mainSet,
        { text: "Keep heart rate fully in Zone 2 — conversational pace" },
        { text: "Run by feel today, not by GPS pace" },
      ];
    }
    case "lift":
      return [
        mainSet,
        { text: "90–120 sec rest between working sets" },
        { text: "Log the weight and reps for every main lift" },
        { text: "Leave 1–2 reps in the tank — not to failure" },
      ];
    case "combo": {
      const [partA, partB] = day.desc.split("+").map((s) => s.trim());
      return [
        { text: partA ?? day.desc, primary: true },
        ...(partB ? [{ text: partB }] : []),
        { text: "Hydrate well between sections" },
        { text: "Note how the second element felt after the first" },
      ];
    }
    case "bike":
      return [
        mainSet,
        { text: "Cadence target: 85–95 rpm throughout" },
        { text: "Zone 2 heart rate — full conversation pace" },
        { text: "Note average power / HR for trend tracking" },
      ];
    case "hyrox":
      return [
        mainSet,
        { text: "Move with intent — quality of movement over speed" },
        { text: "Simulate race transitions where possible" },
        { text: "Record each station time individually" },
      ];
    default:
      return [mainSet];
  }
}

function getCoachTip(day: TrainingDay): string | null {
  if (day.type === "run" && /speed|1000m/i.test(day.session + day.desc)) {
    return "Start conservative — your best rep should be your last, not your first";
  }
  if (day.type === "lift") {
    return "Log your weights every session — this drives week-over-week progression";
  }
  if (day.type === "combo") {
    return "The transition between elements is where race fitness is built";
  }
  if (day.type === "bike") {
    return "Zone 2 work compounds over weeks — don't skip the easy days";
  }
  if (day.type === "hyrox") {
    return "Every rep in training is a rep banked for race day";
  }
  return null;
}

// ---------------------------------------------------------------------------
// RPE Slider (large, full-width, tactile)
// ---------------------------------------------------------------------------
function RpeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const color = rpeColor(value);
  const pct = ((value - 1) / 9) * 100;

  function valueFromClientX(clientX: number): number {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return Math.round(ratio * 9) + 1;
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    onChange(valueFromClientX(e.clientX));
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (e.buttons !== 1) return;
    onChange(valueFromClientX(e.clientX));
  }

  return (
    <div className="mb-10 px-2">
      {/* Large centered RPE number */}
      <div className="text-center mb-4">
        <span
          className="text-4xl font-semibold tracking-tight text-white transition-all duration-75"
          style={{ color: "#FFFFFF" }}
        >
          {value}
        </span>
        <p className="text-xs font-light text-[#9CA3AF] mt-1 uppercase tracking-wider">
          {rpeLabel(value)}
        </p>
      </div>

      {/* Track + thumb */}
      <div
        ref={trackRef}
        className="relative h-12 flex items-center cursor-pointer select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
      >
        {/* Track background */}
        <div className="absolute w-full h-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full" />

        {/* Gradient fill */}
        <div
          className="absolute left-0 h-3 rounded-full transition-all duration-75"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(to right, ${color}80, ${color})`,
          }}
        />

        {/* Thumb */}
        <div
          className="absolute z-20 flex items-center justify-center w-10 h-10 rounded-full bg-[#0D0D0D] -translate-x-1/2 transition-all duration-75"
          style={{
            left: `${pct}%`,
            border: `3px solid ${color}`,
            boxShadow: `0 0 15px ${color}40`,
          }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: color }}
          >
            {value}
          </span>
        </div>
      </div>

      {/* End labels */}
      <div className="flex justify-between text-xs font-light text-[#6B7280] mt-3 uppercase tracking-wider">
        <span>1 Easy</span>
        <span>10 Max</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0D0D0D]/95 backdrop-blur-md pt-4 px-6 border-t border-[#2A2A2A] z-50 pb-[env(safe-area-inset-bottom,32px)]">
      <div className="flex justify-between items-center">
        <Link href="/today" className="flex flex-col items-center gap-1.5 text-[#1D9E75]">
          <Home size={24} fill="#1D9E75" className="drop-shadow-[0_0_8px_rgba(29,158,117,0.5)]" />
          <span className="text-xs font-medium">Today</span>
        </Link>
        <Link href="/week" className="flex flex-col items-center gap-1.5 text-[#6B7280]">
          <Calendar size={24} />
          <span className="text-xs font-medium">Week</span>
        </Link>
        <Link href="/garmin" className="flex flex-col items-center gap-1.5 text-[#6B7280]">
          <Watch size={24} />
          <span className="text-xs font-medium">Garmin</span>
        </Link>
        <Link href="/review" className="flex flex-col items-center gap-1.5 text-[#6B7280]">
          <MessageCircle size={24} />
          <span className="text-xs font-medium">Review</span>
        </Link>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// Rest Day View
// ---------------------------------------------------------------------------
function RestDayView({
  day,
  onBack,
}: {
  day: TrainingDay;
  onBack: () => void;
}) {
  const headerTitle = formatDayHeader(day.dow, day.date);
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white">
      <header className="min-h-[60px] flex justify-between items-end px-5 pb-3 pt-[env(safe-area-inset-top,0px)] shrink-0 bg-[#0D0D0D] z-20">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-start text-2xl text-white hover:text-[#9CA3AF] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          {headerTitle}
        </h1>
        <div className="w-10 h-10" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 pb-28 gap-5">
        <div className="w-20 h-20 rounded-full bg-[#1A1A1A] border border-[#3A3A3A] flex items-center justify-center mb-2">
          <Moon size={36} className="text-[#9CA3AF]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          Rest Day
        </h2>
        <p className="text-sm font-light text-[#9CA3AF] text-center max-w-xs leading-relaxed">
          Recovery is part of the training. Today you rest, adapt, and come
          back stronger. No session required.
        </p>
        <div className="mt-4 bg-[#1A1A1A] border border-[#3A3A3A] rounded-2xl p-4 w-full">
          <p className="text-xs font-light text-[#9CA3AF] text-center uppercase tracking-wider mb-1">
            Coach note
          </p>
          <p className="text-sm font-light text-white text-center leading-relaxed">
            Sleep, hydration, and nutrition today set the ceiling for
            tomorrow&apos;s performance.
          </p>
        </div>
        <button
          onClick={onBack}
          className="mt-4 w-full h-12 bg-transparent border border-[#3A3A3A] text-white font-medium text-sm rounded-xl flex items-center justify-center hover:bg-[#1A1A1A] transition-colors"
        >
          Back
        </button>
      </main>

      <TabBar />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function DayDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dayKey = params.dayKey as string;

  const [trainingDays, setTrainingDays] = useState<TrainingDay[]>(PHASE_1);

  // dayKey from URL is "Jun_4"; getDayByKey() matches against getDayKey(d) = "Jun_4"
  const day = getDayByKey(dayKey, trainingDays);

  // ── Client date (resolved in useEffect to avoid UTC mismatch on Vercel) ──
  const [clientDate, setClientDate] = useState<string | null>(null);

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewState, setViewState] = useState<ViewState>("logging");
  const [existingLog, setExistingLog] = useState<SessionLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Form state
  const [rpe, setRpe] = useState(6);
  const [notes, setNotes] = useState("");
  const [pace, setPace] = useState("");
  const [weights, setWeights] = useState("");
  const [showPacesWeights, setShowPacesWeights] = useState(false);

  // Refs that always hold the latest form values — used inside upsertLog so the
  // useCallback closure never captures stale state from an earlier render.
  const rpeRef     = useRef(6);
  const notesRef   = useRef("");
  const paceRef    = useRef("");
  const weightsRef = useRef("");

  // Post-log state
  const [isSaving, setIsSaving] = useState(false);
  const [upsertError, setUpsertError] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);
  const [showSuccessRing, setShowSuccessRing] = useState(false);

  // ── Resolve local date on mount ───────────────────────────────────────────
  useEffect(() => {
    const now = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    setClientDate(`${months[now.getMonth()]} ${now.getDate()}`);
  }, []);

  // ── Fetch training plan + existing log on mount ───────────────────────────
  useEffect(() => {
    if (!dayKey) return;
    (async () => {
      console.log("[DAY MOUNT] dayKey:", dayKey);
      console.log("[DAY MOUNT] fetching existing log from Supabase");

      // 1. Fetch training plan — keep a local ref so we can use it immediately
      //    without waiting for the setTrainingDays re-render.
      let activeDays: TrainingDay[] = PHASE_1;
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
        console.warn("[DAY MOUNT] training-plan fetch failed, using fallback:", err);
      }

      // 2. Fetch the existing session log.
      //    Use maybeSingle() — returns null (no error) when no row exists.
      //    .single() throws PGRST116 on 0 rows which pollutes error handling.
      const supabase = getSupabase();
      const { data: existingLogData, error: logError } = await supabase
        .from("session_logs")
        .select("*")
        .eq("day_key", dayKey)
        .maybeSingle();

      console.log(
        "[DAY MOUNT] existing log result:", existingLogData,
        "error:", logError?.message, logError?.code
      );

      // 3. Populate all form + view state from the saved log
      const log = existingLogData as SessionLog | null;
      if (log) {
        setExistingLog(log);

        const savedRpe  = log.rpe ?? 6;
        const savedNotes = log.notes ?? "";
        rpeRef.current   = savedRpe;
        notesRef.current = savedNotes;
        setRpe(savedRpe);
        setNotes(savedNotes);

        // Pre-fill paces / weights — stored as { avg_pace: "4:12" } / { entry: "bench 155lb" }
        const firstPace   = log.paces   ? Object.values(log.paces   as Record<string, string>)[0] ?? "" : "";
        const firstWeight = log.weights ? Object.values(log.weights as Record<string, string>)[0] ?? "" : "";
        paceRef.current    = firstPace;
        weightsRef.current = firstWeight;
        setPace(firstPace);
        setWeights(firstWeight);
        if (firstPace || firstWeight) setShowPacesWeights(true);

        console.log(
          "[DAY MOUNT] state set — status:", log.status,
          "rpe:", log.rpe, "notes:", log.notes
        );

        if (log.status === "done" || log.status === "modified") {
          setViewState("completed");
          // Use the locally-resolved activeDays so we don't rely on the
          // stale `day` derived value (setTrainingDays hasn't re-rendered yet).
          const foundDay = activeDays.find(
            (d) => d.date.replace(" ", "_") === dayKey
          );
          if (log.notes && foundDay) fetchInsight(log.notes, foundDay.session);
        } else if (log.status === "skipped") {
          setViewState("skipped");
        }
      }
      setIsLoading(false);
    })();
  }, [dayKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── AI Insight ─────────────────────────────────────────────────────────────
  const fetchInsight = useCallback(
    async (notesText: string, sessionName: string) => {
      if (!notesText.trim()) return;
      setIsLoadingInsight(true);
      try {
        const res = await fetch("/api/parse-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: notesText, sessionName, rpe }),
        });
        const { data } = await res.json();
        if (data?.insight) setAiInsight(data.insight);
      } catch (err) {
        console.error("[DayDetail] AI insight failed:", err);
      } finally {
        setIsLoadingInsight(false);
      }
    },
    [rpe]
  );

  // ── Upsert session log — direct Supabase, returns error so callers can gate navigation ──
  // Reads form values from refs (not closed-over state) so the callback never
  // captures stale text even when it was last recreated before the user typed.
  const upsertLog = useCallback(
    async (status: "done" | "skipped") => {
      if (!day) return { data: null, error: { message: "No day loaded" } };

      // Guard: only ever write 'done' or 'skipped' — nothing else passes the
      // session_logs_status_check constraint on the DB.
      const safeStatus: "done" | "skipped" =
        status === "skipped" ? "skipped" : "done";

      // Read latest values from refs — guaranteed fresh regardless of when this
      // callback was last memoised.
      const latestRpe     = rpeRef.current;
      const latestNotes   = notesRef.current;
      const latestPace    = paceRef.current;
      const latestWeights = weightsRef.current;

      console.log(
        "[DAY] saving — status:", safeStatus,
        "notes:", latestNotes,
        "pace:", latestPace,
        "weights:", latestWeights,
        "rpe:", latestRpe
      );

      const payload = {
        day_key: dayKey,
        date: day.date,
        dow: day.dow,
        session: day.session,
        status: safeStatus,
        rpe: safeStatus !== "skipped" ? latestRpe : null,
        notes: safeStatus !== "skipped" ? (latestNotes.trim() || null) : null,
        paces:
          safeStatus !== "skipped" && latestPace.trim()
            ? { avg_pace: latestPace.trim() }
            : null,
        weights:
          safeStatus !== "skipped" && latestWeights.trim()
            ? { entry: latestWeights.trim() }
            : null,
        updated_at: new Date().toISOString(),
      };

      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("session_logs")
        .upsert(payload as any, { onConflict: "day_key" })
        .select()
        .single();
      console.log(
        "[DAY] upsert result — data:", data,
        "error:", error?.message, error?.code, error?.details
      );
      if (data) setExistingLog(data as SessionLog);
      return { data, error };
    },
    [day, dayKey] // rpe/notes/pace/weights removed — read from refs instead
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleComplete() {
    console.log("[DAY] handleComplete called for:", dayKey);
    setIsSaving(true);
    setUpsertError(null);
    setViewState("completed");
    setShowSuccessRing(true);
    if (notes.trim() && day) fetchInsight(notes, day.session);

    const { error } = await upsertLog("done");
    setIsSaving(false);

    if (error) {
      console.error("[DAY] upsert failed:", error);
      setUpsertError("Failed to save — please try again");
      setViewState("logging");
      setShowSuccessRing(false);
      return;
    }
    console.log("[DAY] upsert confirmed, navigating to /today");
    setTimeout(() => { window.location.href = "/today"; }, 800);
  }

  async function handleSkip() {
    console.log("[DAY] handleSkip called for:", dayKey);
    setIsSaving(true);
    setUpsertError(null);
    setViewState("skipped");
    setShowSuccessRing(true);

    const { error } = await upsertLog("skipped");
    setIsSaving(false);

    if (error) {
      console.error("[DAY] upsert failed:", error);
      setUpsertError("Failed to save — please try again");
      setViewState("logging");
      setShowSuccessRing(false);
      return;
    }
    console.log("[DAY] upsert confirmed, navigating to /today");
    setTimeout(() => { window.location.href = "/today"; }, 800);
  }

  function handleEditLog() {
    setViewState("editing");
  }

  async function handleSaveEdit() {
    setIsSaving(true);
    setViewState("completed");
    if (notes.trim() && day) {
      setAiInsight(null); // reset to re-fetch
      fetchInsight(notes, day.session);
    }
    // Preserve the existing status — editing a completed session keeps "done",
    // editing a skipped session keeps "skipped". Never write "modified".
    const editStatus: "done" | "skipped" =
      existingLog?.status === "skipped" ? "skipped" : "done";
    await upsertLog(editStatus);
    setIsSaving(false);
  }

  function handleBack() {
    router.back();
  }

  // ── Guard: day not found ───────────────────────────────────────────────────
  if (!day && !isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white items-center justify-center px-5 gap-4">
        <p className="text-[#9CA3AF] text-sm">Day not found: {dayKey}</p>
        <button
          onClick={handleBack}
          className="text-[#1D9E75] text-sm font-medium"
        >
          ← Back
        </button>
      </div>
    );
  }

  // ── Rest day ───────────────────────────────────────────────────────────────
  if (day?.type === "rest") {
    return <RestDayView day={day} onBack={handleBack} />;
  }

  // ── Derive display values ──────────────────────────────────────────────────
  const isPast =
    clientDate !== null &&
    day !== undefined &&
    getDayIndex(day.date, trainingDays) < getDayIndex(clientDate, trainingDays);

  const headerTitle = day ? formatDayHeader(day.dow, day.date) : "…";
  const accentColor = day ? TYPE_BORDER[day.type] : "#1D9E75";
  const bullets = day ? getSessionBullets(day) : [];
  const coachTip = day ? getCoachTip(day) : null;
  const isCompleted = viewState === "completed";
  const isSkipped = viewState === "skipped";
  const isLoggingOrEditing =
    viewState === "logging" || viewState === "editing";
  const showActionButtons = isLoggingOrEditing && !isSaving;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D0D] text-white">

      {/* ── Header ── */}
      <header className="min-h-[60px] flex justify-between items-end px-5 pb-3 pt-[env(safe-area-inset-top,0px)] shrink-0 bg-[#0D0D0D] z-20">
        <button
          onClick={handleBack}
          className="w-10 h-10 flex items-center justify-start text-white hover:text-[#9CA3AF] transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-white">
          {headerTitle}
        </h1>
        {/* Right placeholder keeps title centered */}
        <div className="w-10 h-10" />
      </header>

      {/* ── Scrollable content ── */}
      <main
        className={`flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${
          isLoggingOrEditing ? "pb-[240px]" : "pb-[120px]"
        }`}
      >

        {/* 1. Session Hero */}
        {day && (
          <section
            className="relative bg-[#1A1A1A] px-5 py-6 overflow-hidden"
            style={{ borderLeft: `3px solid ${accentColor}` }}
          >
            {/* Green gradient overlay in completed state */}
            {isCompleted && (
              <div
                className="absolute inset-0 bg-gradient-to-r to-transparent z-0 pointer-events-none"
                style={{
                  backgroundImage: `linear-gradient(to right, ${accentColor}18, transparent)`,
                }}
              />
            )}
            <div className="relative z-10">
              <span
                className="text-xs font-medium tracking-wider uppercase px-3 py-1 rounded-full inline-block mb-3"
                style={{
                  backgroundColor: TYPE_BADGE_BG[day.type],
                  color: TYPE_BADGE_TEXT[day.type],
                }}
              >
                {day.typeLabel}
              </span>
              <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">
                {day.session}
              </h2>
              <p className="text-sm font-light text-[#9CA3AF]">{day.desc}</p>
            </div>
          </section>
        )}

        {/* 2. Session Detail */}
        {day && (
          <section className="mt-8 px-5">
            <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF] mb-3 ml-1">
              Session Detail
            </h3>
            <div
              className={`bg-[#1A1A1A] rounded-2xl p-4 flex flex-col gap-3 ${
                isCompleted ? "opacity-60" : ""
              }`}
            >
              {bullets.map((b, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{
                      backgroundColor: b.primary ? "#FFFFFF" : "#6B7280",
                    }}
                  />
                  <p
                    className={`text-sm leading-relaxed text-white ${
                      b.primary ? "font-medium" : "font-light"
                    }`}
                  >
                    {b.text}
                  </p>
                </div>
              ))}
              {coachTip && (
                <p
                  className="text-xs font-medium mt-2 pt-3 border-t border-[#2A2A2A]"
                  style={{ color: accentColor }}
                >
                  {coachTip}
                </p>
              )}
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STATE A / B — Log Form                                             */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {day && isLoggingOrEditing && (
          <section className="mt-10 px-5">
            <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF] mb-6 ml-1">
              {viewState === "editing" ? "Update Log" : "Log Session"}
            </h3>

            {/* Save error notice */}
            {upsertError && (
              <div className="mb-6 px-4 py-3 bg-[#3D0F0F] border border-[#D85A30]/40 rounded-xl">
                <p className="text-xs font-medium text-[#D85A30]">{upsertError}</p>
              </div>
            )}

            {/* Amber notice for past unlogged sessions */}
            {isPast && viewState === "logging" && !existingLog && (
              <div className="mb-6 px-4 py-3 bg-[#3D2A00] border border-[#D4A017]/40 rounded-xl">
                <p className="text-xs font-medium text-[#D4A017]">
                  Logging a past session — {day?.date}
                </p>
              </div>
            )}

            {/* Large RPE Slider */}
            <RpeSlider value={rpe} onChange={(v) => { rpeRef.current = v; setRpe(v); }} />

            {/* Notes Textarea */}
            <div className="mb-4">
              <textarea
                value={notes}
                onChange={(e) => { notesRef.current = e.target.value; setNotes(e.target.value); }}
                placeholder="Describe what you actually did…"
                className="bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#1D9E75] rounded-xl px-4 py-3.5 text-sm font-light text-white placeholder-[#6B7280] w-full h-[80px] outline-none transition-colors resize-none"
              />
            </div>

            {/* + Add paces & weights toggle */}
            <div>
              <button
                onClick={() => setShowPacesWeights((p) => !p)}
                className="text-sm font-medium text-[#1D9E75] hover:text-white transition-colors flex items-center gap-1.5"
              >
                {showPacesWeights ? (
                  <Minus size={16} />
                ) : (
                  <Plus size={16} />
                )}
                {showPacesWeights ? "Hide paces & weights" : "Add paces & weights"}
              </button>
            </div>

            {/* Expanded paces & weights inputs */}
            {showPacesWeights && (
              <div className="flex gap-3 mt-4">
                <div className="flex-1">
                  <span className="text-xs font-medium text-[#9CA3AF] mb-2 block ml-1">
                    Avg pace
                  </span>
                  <input
                    type="text"
                    value={pace}
                    onChange={(e) => { paceRef.current = e.target.value; setPace(e.target.value); }}
                    placeholder="e.g. 4:12/km"
                    className="bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#1D9E75] rounded-xl px-4 py-3.5 text-sm font-light text-white placeholder-[#6B7280] w-full outline-none transition-colors"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-medium text-[#9CA3AF] mb-2 block ml-1">
                    Weights
                  </span>
                  <input
                    type="text"
                    value={weights}
                    onChange={(e) => { weightsRef.current = e.target.value; setWeights(e.target.value); }}
                    placeholder="e.g. bench 155lb"
                    className="bg-[#1A1A1A] border border-[#2A2A2A] focus:border-[#1D9E75] rounded-xl px-4 py-3.5 text-sm font-light text-white placeholder-[#6B7280] w-full outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Cancel edit button */}
            {viewState === "editing" && (
              <button
                onClick={() => setViewState("completed")}
                className="mt-4 text-xs text-[#9CA3AF] hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────── */}
        {/* STATE C — Completed / Skipped                                      */}
        {/* ─────────────────────────────────────────────────────────────────── */}
        {(isCompleted || isSkipped) && (
          <>
            {/* Your Log — rich read-only summary, shown for both completed & skipped */}
            {existingLog && (
              <section className="mt-8 px-5">
                <h3 className="text-xs font-light tracking-wider uppercase text-[#9CA3AF] mb-3 ml-1">
                  Your Log
                </h3>
                <div className="bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] overflow-hidden">

                  {/* RPE row */}
                  {existingLog.rpe != null && (
                    <div className="px-4 pt-4 pb-3 border-b border-[#2A2A2A]">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-[#9CA3AF] mb-1.5">
                        RPE
                      </p>
                      <div className="flex items-center gap-2">
                        <span
                          className="px-2.5 py-1 rounded text-sm font-semibold"
                          style={{
                            backgroundColor: isSkipped ? "rgba(216,90,48,0.15)" : "rgba(29,158,117,0.15)",
                            color: isSkipped ? "#D85A30" : "#1D9E75",
                          }}
                        >
                          {existingLog.rpe}
                        </span>
                        <span className="text-xs font-light text-[#9CA3AF]">
                          {rpeLabel(existingLog.rpe)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Notes row */}
                  {existingLog.notes && (
                    <div className="px-4 pt-3 pb-3 border-b border-[#2A2A2A]">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-[#9CA3AF] mb-1.5">
                        Your Notes
                      </p>
                      <p className="text-sm font-light text-white leading-relaxed whitespace-pre-wrap">
                        {existingLog.notes}
                      </p>
                    </div>
                  )}

                  {/* Paces row */}
                  {existingLog.paces && Object.values(existingLog.paces)[0] && (
                    <div className="px-4 pt-3 pb-3 border-b border-[#2A2A2A]">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-[#9CA3AF] mb-1.5">
                        Pace
                      </p>
                      <p className="text-sm font-light text-white">
                        {Object.values(existingLog.paces)[0]}
                      </p>
                    </div>
                  )}

                  {/* Weights row */}
                  {existingLog.weights && Object.values(existingLog.weights)[0] && (
                    <div className="px-4 pt-3 pb-4">
                      <p className="text-[10px] font-medium tracking-wider uppercase text-[#9CA3AF] mb-1.5">
                        Weights
                      </p>
                      <p className="text-sm font-light text-white">
                        {Object.values(existingLog.weights)[0]}
                      </p>
                    </div>
                  )}

                  {/* Fallback when nothing was logged (skipped with no data) */}
                  {!existingLog.rpe && !existingLog.notes && !existingLog.paces && !existingLog.weights && (
                    <div className="px-4 py-4">
                      <p className="text-sm font-light text-[#9CA3AF]">
                        {isSkipped ? "Session skipped — no data recorded." : "No data recorded."}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Completion action area */}
            <section className="mt-8 px-5">
              {/* Big checkmark / X */}
              <div className="flex flex-col items-center justify-center gap-2 mb-8 pt-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mb-1 ${
                    showSuccessRing ? "animate-scale-pop" : ""
                  }`}
                  style={{
                    backgroundColor: isSkipped
                      ? "rgba(216,90,48,0.1)"
                      : "rgba(29,158,117,0.1)",
                  }}
                >
                  {isSkipped ? (
                    <XCircle
                      size={40}
                      className="text-[#D85A30] drop-shadow-[0_0_12px_rgba(216,90,48,0.4)]"
                      fill="#D85A30"
                    />
                  ) : (
                    <CheckCircle2
                      size={40}
                      className="text-[#1D9E75] drop-shadow-[0_0_12px_rgba(29,158,117,0.4)]"
                      fill="#1D9E75"
                    />
                  )}
                </div>
                <span
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: isSkipped ? "#D85A30" : "#1D9E75" }}
                >
                  {isSkipped ? "Session Skipped" : "Session Completed"}
                </span>
              </div>

              {/* AI Insight Card — only shown if there are notes + AI response */}
              {(isLoadingInsight || aiInsight) && !isSkipped && (
                <div className="bg-[#1E1C3D] rounded-r-2xl p-5 mb-6 relative overflow-hidden shadow-lg animate-slide-up border-l-[3px] border-l-[#7F77DD]">
                  {/* Purple orb glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#7F77DD]/20 rounded-full blur-[30px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />

                  <div className="flex items-center gap-1.5 mb-3 relative z-10">
                    <Sparkles size={14} className="text-[#7F77DD]" />
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7F77DD]">
                      Coach Insight
                    </span>
                  </div>

                  {isLoadingInsight ? (
                    <div className="flex gap-1 items-center relative z-10">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7F77DD] animate-bounce [animation-delay:0ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7F77DD] animate-bounce [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-[#7F77DD] animate-bounce [animation-delay:300ms]" />
                    </div>
                  ) : (
                    <p className="text-sm font-light text-white leading-relaxed relative z-10">
                      {aiInsight}
                    </p>
                  )}
                </div>
              )}

              {/* Status toggle — tap the other button to switch */}
              <div className="flex gap-3 mb-3">
                <button
                  onClick={async () => {
                    if (isCompleted) return;
                    setViewState("completed");
                    setShowSuccessRing(true);
                    const { error } = await upsertLog("done");
                    if (!error) setTimeout(() => { window.location.href = "/today"; }, 800);
                  }}
                  disabled={isSaving}
                  className={`flex-1 h-[48px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    isCompleted
                      ? "bg-[#1D9E75] text-white cursor-default"
                      : "bg-transparent border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/10 active:bg-[#1D9E75]/20"
                  }`}
                >
                  Mark Complete
                  <CheckCircle2
                    size={16}
                    fill={isCompleted ? "white" : "none"}
                    className={isCompleted ? "text-white" : "text-[#1D9E75]"}
                  />
                </button>
                <button
                  onClick={async () => {
                    if (isSkipped) return;
                    setViewState("skipped");
                    setShowSuccessRing(true);
                    const { error } = await upsertLog("skipped");
                    if (!error) setTimeout(() => { window.location.href = "/today"; }, 800);
                  }}
                  disabled={isSaving}
                  className={`flex-1 h-[48px] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                    isSkipped
                      ? "bg-[#D85A30] text-white cursor-default"
                      : "bg-transparent border border-[#D85A30] text-[#D85A30] hover:bg-[#D85A30]/10 active:bg-[#D85A30]/20"
                  }`}
                >
                  Skipped
                  <XCircle
                    size={16}
                    fill={isSkipped ? "white" : "none"}
                    className={isSkipped ? "text-white" : "text-[#D85A30]"}
                  />
                </button>
              </div>

              {/* Edit log button */}
              <button
                onClick={handleEditLog}
                className="w-full bg-transparent border border-[#3A3A3A] text-white font-medium text-sm h-[44px] rounded-xl flex items-center justify-center gap-2 transition-colors hover:bg-[#1A1A1A] active:bg-[#2A2A2A]"
              >
                Edit log <Pencil size={14} />
              </button>
            </section>
          </>
        )}
      </main>

      {/* ── Pinned action buttons (only in logging / editing state) ── */}
      {showActionButtons && day && (
        <div className="fixed bottom-[80px] left-0 right-0 px-5 py-4 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/95 to-transparent z-40 flex flex-col gap-3 pointer-events-none">
          <div className="pointer-events-auto flex flex-col gap-3">
            {viewState === "editing" ? (
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="w-full h-[56px] bg-[#1D9E75] text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save Changes"}
                <CheckCircle2 size={20} />
              </button>
            ) : (
              <>
                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="w-full h-[56px] bg-[#1D9E75] text-white text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
                >
                  Mark Complete
                  <CheckCircle2 size={20} fill="white" className="text-white" />
                </button>
                <button
                  onClick={handleSkip}
                  disabled={isSaving}
                  className="w-full h-[44px] bg-transparent border border-[#D85A30] text-[#D85A30] text-sm font-medium rounded-xl flex items-center justify-center transition-colors hover:bg-[#D85A30]/10 active:bg-[#D85A30]/20 disabled:opacity-50"
                >
                  Skipped
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Bottom Tab Bar ── */}
      <TabBar />
    </div>
  );
}
