/**
 * StatCard
 *
 * Generic metric display card — label, value, optional unit, optional
 * trend arrow. Used across /today, /week, and /garmin screens.
 *
 * UI spec pending.
 *
 * TODO: Implement full UI from design spec.
 */

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  /** Optional secondary value shown below the primary */
  sub?: string;
}

export default function StatCard({
  label,// eslint-disable-line @typescript-eslint/no-unused-vars
  value,// eslint-disable-line @typescript-eslint/no-unused-vars
  unit, // eslint-disable-line @typescript-eslint/no-unused-vars
  trend,// eslint-disable-line @typescript-eslint/no-unused-vars
  sub,  // eslint-disable-line @typescript-eslint/no-unused-vars
}: StatCardProps) {
  return null;
}
