/**
 * GarminCard
 *
 * Displays a single Garmin biometric entry — sleep score ring, avg HR,
 * and VO2 max pill. Used on /garmin and as a sidebar on /today.
 *
 * UI spec pending.
 *
 * TODO: Implement full UI from design spec.
 */

import type { GarminEntry } from "@/lib/types";

export interface GarminCardProps {
  entry: GarminEntry;
  onDelete?: (id: string) => void;
}

export default function GarminCard({
  entry,   // eslint-disable-line @typescript-eslint/no-unused-vars
  onDelete,// eslint-disable-line @typescript-eslint/no-unused-vars
}: GarminCardProps) {
  return null;
}
