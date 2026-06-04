/**
 * DayCard
 *
 * Compact card for a single training day in the weekly calendar grid.
 * Shows dow, workout type badge, session name, and completion indicator.
 *
 * UI spec pending.
 *
 * TODO: Implement full UI from design spec.
 */

import type { TrainingDay, SessionLog } from "@/lib/types";

export interface DayCardProps {
  day: TrainingDay;
  log: SessionLog | null;
  isToday?: boolean;
  onPress?: (day: TrainingDay) => void;
}

export default function DayCard({
  day,    // eslint-disable-line @typescript-eslint/no-unused-vars
  log,    // eslint-disable-line @typescript-eslint/no-unused-vars
  isToday,// eslint-disable-line @typescript-eslint/no-unused-vars
  onPress,// eslint-disable-line @typescript-eslint/no-unused-vars
}: DayCardProps) {
  return null;
}
