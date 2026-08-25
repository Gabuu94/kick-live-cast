/**
 * Alert preferences — shared by the client UI and the FCM sender backend.
 *
 * Model: one set of global defaults plus per-scope overrides. A scope is
 * either a league (`league:pl`) or a club (`team:ars`). When deciding whether
 * to deliver an alert for a match we resolve, most-specific-first:
 *
 *   team override -> league override -> global default
 */

export type ScopeKey = `league:${string}` | `team:${string}`;

export interface ScopePrefs {
  /** Reminder before kick-off. */
  kickoff: boolean;
  /** Lead time in minutes for the kick-off reminder. */
  kickoffMinutesBefore: number;
  /** Goal alerts while the match is live. */
  goals: boolean;
  /** Final score when the match ends. */
  fullTime: boolean;
}

/** Partial overlay where every key may be explicitly absent. */
export type PartialScopePrefs = { [K in keyof ScopePrefs]?: ScopePrefs[K] | undefined };

export interface AlertPrefs extends ScopePrefs {
  /** Kill switch — nothing is delivered while true. */
  muteAll: boolean;
  /** Per-league / per-club overrides, partial on top of the defaults. */
  overrides: Record<string, PartialScopePrefs>;
}

export const LEAD_TIME_OPTIONS = [5, 15, 30, 60, 120] as const;

export const DEFAULT_PREFS: AlertPrefs = {
  kickoff: true,
  kickoffMinutesBefore: 15,
  goals: true,
  fullTime: true,
  muteAll: false,
  overrides: {},
};

export const leagueScope = (leagueId: string): ScopeKey => `league:${leagueId}`;
export const teamScope = (teamId: string): ScopeKey => `team:${teamId}`;

export interface ScopeTarget {
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
}

/**
 * Resolve the effective preferences for a given match context.
 * Team overrides win over league overrides, which win over the global defaults.
 * When both clubs in a match have overrides the *most permissive* wins, so a
 * user following both sides of a derby still gets the alert.
 */
/** Overlay a partial layer, ignoring keys that are absent/undefined. */
function merge(base: ScopePrefs, layer: PartialScopePrefs | undefined): ScopePrefs {
  if (!layer) return { ...base };
  return {
    kickoff: layer.kickoff ?? base.kickoff,
    kickoffMinutesBefore: layer.kickoffMinutesBefore ?? base.kickoffMinutesBefore,
    goals: layer.goals ?? base.goals,
    fullTime: layer.fullTime ?? base.fullTime,
  };
}

export function resolvePrefs(prefs: AlertPrefs, target: ScopeTarget): ScopePrefs {
  const base: ScopePrefs = {
    kickoff: prefs.kickoff,
    kickoffMinutesBefore: prefs.kickoffMinutesBefore,
    goals: prefs.goals,
    fullTime: prefs.fullTime,
  };

  const league = prefs.overrides[leagueScope(target.leagueId)];
  const home = prefs.overrides[teamScope(target.homeTeamId)];
  const away = prefs.overrides[teamScope(target.awayTeamId)];

  const layered = [league, home, away].filter(Boolean) as PartialScopePrefs[];
  if (layered.length === 0) return base;

  let out: ScopePrefs = merge(base, league);
  const teamLayers = [home, away].filter(Boolean) as PartialScopePrefs[];

  for (const layer of teamLayers) {
    out = {
      kickoff: layer.kickoff ?? out.kickoff,
      kickoffMinutesBefore: layer.kickoffMinutesBefore ?? out.kickoffMinutesBefore,
      goals: layer.goals ?? out.goals,
      fullTime: layer.fullTime ?? out.fullTime,
    };
  }

  // Two team layers: OR the booleans, take the earliest reminder.
  if (teamLayers.length === 2) {
    const [a, b] = teamLayers as [PartialScopePrefs, PartialScopePrefs];
    const fallback: ScopePrefs = merge(base, league);
    out = {
      kickoff: (a.kickoff ?? fallback.kickoff) || (b.kickoff ?? fallback.kickoff),
      goals: (a.goals ?? fallback.goals) || (b.goals ?? fallback.goals),
      fullTime: (a.fullTime ?? fallback.fullTime) || (b.fullTime ?? fallback.fullTime),
      kickoffMinutesBefore: Math.max(
        a.kickoffMinutesBefore ?? fallback.kickoffMinutesBefore,
        b.kickoffMinutesBefore ?? fallback.kickoffMinutesBefore,
      ),
    };
  }

  return out;
}

export function getOverride(prefs: AlertPrefs, scope: ScopeKey): PartialScopePrefs {
  return prefs.overrides[scope] ?? {};
}

export function setOverride(
  prefs: AlertPrefs,
  scope: ScopeKey,
  patch: PartialScopePrefs | null,
): AlertPrefs {
  const overrides = { ...prefs.overrides };
  if (patch === null || Object.keys(patch).length === 0) {
    delete overrides[scope];
  } else {
    overrides[scope] = { ...(overrides[scope] ?? {}), ...patch };
  }
  return { ...prefs, overrides };
}

export function hasOverride(prefs: AlertPrefs, scope: ScopeKey): boolean {
  const o = prefs.overrides[scope];
  return Boolean(o && Object.keys(o).length > 0);
}

/* ------------------------------------------------------------------ */
/* Persistence (browser)                                               */
/* ------------------------------------------------------------------ */

export const PREFS_KEY = "footylive:alerts";

export function loadPrefs(): AlertPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AlertPrefs>;
    return {
      ...DEFAULT_PREFS,
      ...parsed,
      overrides: { ...(parsed.overrides ?? {}) },
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: AlertPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage full / private mode — preferences stay in memory */
  }
}
