import type { Match } from "@/lib/football-data";

/**
 * Deterministic demo odds / extra match info.
 *
 * Everything here is derived from the match id so the numbers are stable
 * between renders and between server and client (no hydration mismatch).
 * Swap `getOdds` for a real feed call (see docs in README) when you plug in
 * a provider — the shape is intentionally close to what odds APIs return.
 */

export interface Odds {
  home: number;
  draw: number;
  away: number;
  /** decimal odds movement since open, in points */
  drift: { home: number; draw: number; away: number };
  overUnder: { line: number; over: number; under: number };
  btts: { yes: number; no: number };
  bookmakerCount: number;
  updatedMinutesAgo: number;
}

export interface MatchExtras {
  referee: string;
  attendance: number | null;
  weather: string;
  temperatureC: number;
  h2h: { label: string; homeWins: number; draws: number; awayWins: number };
  formHome: ("W" | "D" | "L")[];
  formAway: ("W" | "D" | "L")[];
  lineup: { home: string; away: string };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rng(seed: string) {
  let x = hash(seed) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (Math.abs(x) % 10000) / 10000;
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function impliedProbability(odds: number): number {
  return odds > 0 ? 1 / odds : 0;
}

/** Normalised (vig-removed) 1X2 probabilities as percentages. */
export function probabilities(o: Odds): { home: number; draw: number; away: number } {
  const raw = [impliedProbability(o.home), impliedProbability(o.draw), impliedProbability(o.away)];
  const total = raw.reduce((a, b) => a + b, 0) || 1;
  return {
    home: Math.round((raw[0]! / total) * 100),
    draw: Math.round((raw[1]! / total) * 100),
    away: Math.round((raw[2]! / total) * 100),
  };
}

export function getOdds(match: Match): Odds {
  const r = rng(match.id + "odds");
  // Home advantage baseline, nudged by the live scoreline.
  const lead = (match.homeScore ?? 0) - (match.awayScore ?? 0);
  const minute = match.status === "live" ? (match.minute ?? 0) : 0;
  const timeWeight = minute / 90;

  let home = 1.6 + r() * 2.6;
  let away = 1.7 + r() * 3.0;
  let draw = 3.0 + r() * 1.6;

  if (lead > 0) {
    home = Math.max(1.02, home - lead * 1.1 * (0.5 + timeWeight));
    away += lead * 2.4 * (0.5 + timeWeight);
    draw += lead * 1.6 * timeWeight;
  } else if (lead < 0) {
    away = Math.max(1.02, away + lead * 1.1 * (0.5 + timeWeight));
    home += -lead * 2.4 * (0.5 + timeWeight);
    draw += -lead * 1.6 * timeWeight;
  }

  const line = [1.5, 2.5, 2.5, 3.5][Math.floor(r() * 4)] ?? 2.5;

  return {
    home: round2(home),
    draw: round2(draw),
    away: round2(away),
    drift: {
      home: round2((r() - 0.5) * 0.4),
      draw: round2((r() - 0.5) * 0.3),
      away: round2((r() - 0.5) * 0.4),
    },
    overUnder: { line, over: round2(1.55 + r() * 0.8), under: round2(1.6 + r() * 0.8) },
    btts: { yes: round2(1.5 + r() * 0.6), no: round2(1.7 + r() * 0.7) },
    bookmakerCount: 8 + Math.floor(r() * 14),
    updatedMinutesAgo: Math.floor(r() * 5),
  };
}

const REFS = [
  "M. Oliver",
  "A. Taylor",
  "S. Hooper",
  "C. Kavanagh",
  "J. Munuera",
  "D. Massa",
  "F. Zwayer",
  "C. Turpin",
];
const WEATHER = ["Clear", "Light rain", "Overcast", "Windy", "Cloudy"];
const SHAPES = ["4-3-3", "4-2-3-1", "3-5-2", "4-4-2", "3-4-2-1"];

export function getExtras(match: Match): MatchExtras {
  const r = rng(match.id + "extras");
  const pick = <T,>(arr: T[]): T => arr[Math.floor(r() * arr.length)]!;
  const form = (): ("W" | "D" | "L")[] =>
    Array.from({ length: 5 }, () => (["W", "W", "D", "L"] as const)[Math.floor(r() * 4)]!);

  return {
    referee: pick(REFS),
    attendance: match.status === "upcoming" ? null : 28000 + Math.floor(r() * 45000),
    weather: pick(WEATHER),
    temperatureC: 8 + Math.floor(r() * 16),
    h2h: {
      label: "Last 10 meetings",
      homeWins: 2 + Math.floor(r() * 5),
      draws: 1 + Math.floor(r() * 3),
      awayWins: 1 + Math.floor(r() * 4),
    },
    formHome: form(),
    formAway: form(),
    lineup: { home: pick(SHAPES), away: pick(SHAPES) },
  };
}
