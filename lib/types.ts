// ---------------------------------------------------------------------------
// Training Plan
// ---------------------------------------------------------------------------

/** The workout type for a given day */
export type WorkoutType = "run" | "lift" | "combo" | "rest" | "bike" | "hyrox";

/** A single planned day in the training schedule */
export interface TrainingDay {
  /** Phase week number (1–8) */
  week: number;
  /** Day of week abbreviation, e.g. "Mon" */
  dow: string;
  /** ISO date string, e.g. "2025-06-01" */
  date: string;
  /** Workout category */
  type: WorkoutType;
  /** Human-readable label for the workout type */
  typeLabel: string;
  /** Short session name shown in the UI, e.g. "Speed" */
  session: string;
  /** Full description / prescription */
  desc: string;
}

// ---------------------------------------------------------------------------
// Session Logs  (persisted to Supabase `session_logs` table)
// ---------------------------------------------------------------------------

export type SessionStatus = "completed" | "skipped" | "modified" | "planned";

export interface SessionLog {
  /** UUID primary key */
  id: string;
  /** Composite key: "YYYY-MM-DD" matching TrainingDay.date */
  day_key: string;
  /** ISO date string */
  date: string;
  /** Day of week abbreviation */
  dow: string;
  /** Session name copied from the plan */
  session: string;
  /** Athlete's reported status */
  status: SessionStatus;
  /** Rate of Perceived Exertion 1–10 */
  rpe: number | null;
  /** Free-text notes from the athlete */
  notes: string | null;
  /**
   * Key/value map of paces recorded during the session.
   * e.g. { "1000m_avg": "4:12", "easy_mile": "8:30" }
   */
  paces: Record<string, string> | null;
  /**
   * Key/value map of weights used.
   * e.g. { "bench_press": "185lb", "squat": "225lb" }
   */
  weights: Record<string, string> | null;
  /** ISO timestamp of last upsert */
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Garmin / Wearable Data  (persisted to Supabase `garmin_logs` table)
// ---------------------------------------------------------------------------

export interface GarminEntry {
  /** UUID primary key */
  id: string;
  /** ISO date string for the night/day this data covers */
  date: string;
  /** Garmin sleep score 0–100 */
  sleep_score: number | null;
  /** Average resting heart rate (bpm) */
  avg_hr: number | null;
  /** Garmin VO2 max estimate */
  vo2_max: number | null;
  /** ISO timestamp when this record was created */
  created_at: string;
}

// ---------------------------------------------------------------------------
// AI Coach Messages
// ---------------------------------------------------------------------------

export type AIRole = "user" | "assistant";

export interface AIMessage {
  role: AIRole;
  content: string;
  /** ISO timestamp when the message was created */
  timestamp: string;
}

// ---------------------------------------------------------------------------
// API Response shapes
// ---------------------------------------------------------------------------

export interface ApiSuccess<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
