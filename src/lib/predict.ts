import type { Match } from "@/lib/football-data";
import { getExtras, getOdds, probabilities } from "@/lib/odds";

/**
 * Match predictions.
 *
 * Statistical estimates only — recent form, head-to-head, home advantage and
 * the market's implied probabilities. Never presented as betting advice.
 */

export interface Prediction {
  matchId: string;
  home: number;
  draw: number;
  away: number;
  /** "2 - 1" */
  scoreline: string;
  pick: "home" | "draw" | "away";
  confidence: "High" | "Medium" | "Low";
  reasons: string[];
  formHome: ("W" | "D" | "L")[];
  formAway: ("W" | "D" | "L")[];
  h2h: { homeWins: number; draws: number; awayWins: number };
}

const FORM_POINTS = { W: 3, D: 1, L: 0 } as const;

function formScore(form: ("W" | "D" | "L")[]): number {
  if (form.length === 0) return 0;
  const total = form.reduce((sum, r) => sum + FORM_POINTS[r], 0);
  return total / (form.length * 3); // 0…1
}

function round100(a: number, b: number, c: number): [number, number, number] {
  const total = a + b + c || 1;
  const ha = Math.round((a / total) * 100);
  const da = Math.round((b / total) * 100);
  return [ha, da, 100 - ha - da];
}

export function predict(match: Match): Prediction {
  const extras = getExtras(match);
  const market = probabilities(getOdds(match));

  const fh = formScore(extras.formHome);
  const fa = formScore(extras.formAway);

  const h2hTotal =
    extras.h2h.homeWins + extras.h2h.draws + extras.h2h.awayWins || 1;
  const h2hHome = extras.h2h.homeWins / h2hTotal;
  const h2hAway = extras.h2h.awayWins / h2hTotal;

  // Market is the strongest single signal; form and H2H nudge it, plus a
  // small home-ground bump.
  const rawHome = market.home * 0.6 + fh * 0.2 + h2hHome * 0.12 + 0.08;
  const rawAway = market.away * 0.6 + fa * 0.2 + h2hAway * 0.12;
  const rawDraw = market.draw * 0.7 + (1 - Math.abs(fh - fa)) * 0.15;

  const [home, draw, away] = round100(rawHome, rawDraw, rawAway);

  const pick: Prediction["pick"] =
    home >= draw && home >= away ? "home" : away >= draw ? "away" : "draw";
  const top = Math.max(home, draw, away);
  const confidence: Prediction["confidence"] =
    top >= 55 ? "High" : top >= 42 ? "Medium" : "Low";

  // Expected goals from the same signals, kept deliberately modest.
  const goalsHome = Math.max(0, Math.round(0.9 + fh * 2 + (home - away) / 90));
  const goalsAway = Math.max(0, Math.round(0.7 + fa * 2 + (away - home) / 90));
  const scoreline =
    pick === "draw"
      ? `${Math.max(goalsHome, goalsAway)} - ${Math.max(goalsHome, goalsAway)}`
      : pick === "home"
        ? `${Math.max(goalsHome, goalsAway + 1)} - ${Math.min(goalsHome, goalsAway)}`
        : `${Math.min(goalsHome, goalsAway)} - ${Math.max(goalsAway, goalsHome + 1)}`;

  const reasons: string[] = [];
  if (fh - fa > 0.12) reasons.push(`${match.home.name} are in the better run of form`);
  else if (fa - fh > 0.12) reasons.push(`${match.away.name} are in the better run of form`);
  else reasons.push("Both sides arrive in similar form");

  if (extras.h2h.homeWins > extras.h2h.awayWins)
    reasons.push(`${match.home.name} lead the head-to-head ${extras.h2h.homeWins}-${extras.h2h.awayWins}`);
  else if (extras.h2h.awayWins > extras.h2h.homeWins)
    reasons.push(`${match.away.name} lead the head-to-head ${extras.h2h.awayWins}-${extras.h2h.homeWins}`);
  else reasons.push("Head-to-head record is level");

  reasons.push(
    pick === "home"
      ? `Home advantage at ${match.venue} tips it`
      : pick === "away"
        ? "The numbers back the visitors despite the away trip"
        : "Too close to separate — a share of the points looks likeliest",
  );

  return {
    matchId: match.id,
    home,
    draw,
    away,
    scoreline,
    pick,
    confidence,
    reasons,
    formHome: extras.formHome,
    formAway: extras.formAway,
    h2h: {
      homeWins: extras.h2h.homeWins,
      draws: extras.h2h.draws,
      awayWins: extras.h2h.awayWins,
    },
  };
}
