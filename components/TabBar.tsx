"use client";

/**
 * TabBar
 *
 * Bottom navigation bar — four tabs: Today, Week, Garmin, Review.
 * Sticks to the bottom of the viewport with iOS safe-area padding.
 *
 * UI spec pending.
 *
 * TODO: Implement full UI from design spec.
 */

export type TabKey = "today" | "week" | "garmin" | "review";

export interface TabBarProps {
  active: TabKey;
  onNavigate?: (tab: TabKey) => void;
}

export default function TabBar({
  active,     // eslint-disable-line @typescript-eslint/no-unused-vars
  onNavigate, // eslint-disable-line @typescript-eslint/no-unused-vars
}: TabBarProps) {
  return null;
}
