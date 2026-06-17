// ---------------------------------------------------------------------------
// Strava — pure utility functions (client-safe, no Node/server deps)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Google Encoded Polyline Algorithm decoder
// ---------------------------------------------------------------------------
export function decodePolyline(encoded: string): [number, number][] {
  const coords: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------
export function formatPacePerMile(speedMps: number): string {
  if (!speedMps || speedMps <= 0) return "—";
  const secPerMile = 1609.344 / speedMps;
  const mins = Math.floor(secPerMile / 60);
  const secs = Math.round(secPerMile % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatDistanceMiles(meters: number): string {
  if (!meters) return "—";
  return (meters / 1609.344).toFixed(2);
}

export function formatDistanceKm(meters: number): string {
  if (!meters) return "—";
  return (meters / 1000).toFixed(2);
}

export function formatElevationFt(meters: number): string {
  if (meters == null) return "—";
  return Math.round(meters * 3.28084).toString();
}

export function formatRelativeTime(isoString: string): string {
  const d = new Date(isoString);
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// SVG route art: normalise decoded polyline points to SVG viewport
// ---------------------------------------------------------------------------
export function polylineToSvgPath(
  points: [number, number][],
  width: number,
  height: number,
  padding = 28
): { d: string; start: { x: number; y: number }; end: { x: number; y: number } } | null {
  if (points.length < 2) return null;

  // Thin to max 600 points for performance
  const step = Math.max(1, Math.floor(points.length / 600));
  const pts = points.filter((_, i) => i % step === 0);
  if (pts.length < 2) return null;

  const lats = pts.map((p) => p[0]);
  const lngs = pts.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.001;
  const lngRange = maxLng - minLng || 0.001;

  const innerW = width - 2 * padding;
  const innerH = height - 2 * padding;
  const scale = Math.min(innerW / lngRange, innerH / latRange);
  const offsetX = padding + (innerW - lngRange * scale) / 2;
  const offsetY = padding + (innerH - latRange * scale) / 2;

  const toXY = ([lat, lng]: [number, number]) => ({
    x: offsetX + (lng - minLng) * scale,
    y: offsetY + (maxLat - lat) * scale,
  });

  const svgPts = pts.map(toXY);
  const d = svgPts
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");

  return { d, start: svgPts[0], end: svgPts[svgPts.length - 1] };
}

// ---------------------------------------------------------------------------
// Pace zone classification (per km split, seconds per metre)
// ---------------------------------------------------------------------------
export type PaceZone = { label: string; color: string; seconds: number };

export function classifySplitToPaceZone(
  speedMps: number
): 0 | 1 | 2 | 3 | 4 {
  // Convert m/s to sec/mile
  const secPerMile = 1609.344 / (speedMps || 0.001);
  if (secPerMile > 570) return 0; // >9:30/mi Easy
  if (secPerMile > 510) return 1; // 8:30–9:30 Moderate
  if (secPerMile > 450) return 2; // 7:30–8:30 Threshold
  if (secPerMile > 390) return 3; // 6:30–7:30 Hard
  return 4;                       // <6:30 Max
}

export const PACE_ZONE_META = [
  { label: "Easy",      color: "#3B82F6" },
  { label: "Moderate",  color: "#10B981" },
  { label: "Threshold", color: "#F59E0B" },
  { label: "Hard",      color: "#F97316" },
  { label: "Max",       color: "#EF4444" },
];

// HR zones — max HR 190 (27-year-old)
export const HR_ZONE_META = [
  { label: "Zone 1 Recovery",  color: "#93C5FD", min: 0,   max: 114 },
  { label: "Zone 2 Aerobic",   color: "#34D399", min: 114, max: 133 },
  { label: "Zone 3 Tempo",     color: "#FBBF24", min: 133, max: 152 },
  { label: "Zone 4 Threshold", color: "#F97316", min: 152, max: 171 },
  { label: "Zone 5 Max",       color: "#EF4444", min: 171, max: 220 },
];
