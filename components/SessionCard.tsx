/**
 * SessionCard
 *
 * Displays a single session log entry — status, RPE badge, notes preview,
 * and quick-action buttons. Used on /today and /week.
 *
 * UI spec pending — component is typed and exported but renders nothing yet.
 *
 * TODO: Implement full UI from design spec.
 */

import type { SessionLog, TrainingDay } from "@/lib/types";

export interface SessionCardProps {
  day: TrainingDay;
  log: SessionLog | null;
  /** Called when the athlete taps to log / edit this session */
  onEdit?: (dayKey: string) => void;
}

export default function SessionCard({
  day,    // eslint-disable-line @typescript-eslint/no-unused-vars
  log,    // eslint-disable-line @typescript-eslint/no-unused-vars
  onEdit, // eslint-disable-line @typescript-eslint/no-unused-vars
}: SessionCardProps) {
  // ── Placeholder ────────────────────────────────────────────────────────
  return null;
}
