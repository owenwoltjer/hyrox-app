"use client";

/**
 * RPESlider
 *
 * A mobile-friendly 1–10 Rate of Perceived Exertion slider with colour
 * gradient feedback (green → yellow → red) and haptic-ready callbacks.
 *
 * UI spec pending.
 *
 * TODO: Implement full UI from design spec.
 */

export interface RPESliderProps {
  value: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
}

export default function RPESlider({
  value,   // eslint-disable-line @typescript-eslint/no-unused-vars
  onChange,// eslint-disable-line @typescript-eslint/no-unused-vars
  disabled,// eslint-disable-line @typescript-eslint/no-unused-vars
}: RPESliderProps) {
  return null;
}
