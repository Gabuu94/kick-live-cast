/**
 * Remembered video quality for live streams.
 *
 * Stored as the level height in pixels (e.g. 720) or "auto" for adaptive
 * bitrate. When a stream doesn't carry the exact remembered height we pick the
 * closest one at or below it, so a 1080p preference still works on a 720p feed.
 */

const QUALITY_KEY = "fltv.quality";

export type QualityPref = "auto" | number;

export function getQualityPref(): QualityPref {
  if (typeof localStorage === "undefined") return "auto";
  const raw = localStorage.getItem(QUALITY_KEY);
  if (!raw || raw === "auto") return "auto";
  const height = Number.parseInt(raw, 10);
  return Number.isFinite(height) ? height : "auto";
}

export function setQualityPref(pref: QualityPref): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(QUALITY_KEY, pref === "auto" ? "auto" : String(pref));
}

export interface QualityLevel {
  /** hls.js level index. */
  index: number;
  height: number;
  bitrate: number;
}

export function qualityLabel(level: QualityLevel): string {
  const mbps = level.bitrate / 1_000_000;
  const rate = mbps >= 1 ? `${mbps.toFixed(1)} Mbps` : `${Math.round(level.bitrate / 1000)} kbps`;
  return `${level.height}p · ${rate}`;
}

/** Index of the level matching a preference, or -1 for adaptive. */
export function resolveLevel(levels: QualityLevel[], pref: QualityPref): number {
  if (pref === "auto" || levels.length === 0) return -1;
  const exact = levels.find((l) => l.height === pref);
  if (exact) return exact.index;
  const below = levels.filter((l) => l.height <= pref).sort((a, b) => b.height - a.height)[0];
  if (below) return below.index;
  const lowest = [...levels].sort((a, b) => a.height - b.height)[0];
  return lowest ? lowest.index : -1;
}
