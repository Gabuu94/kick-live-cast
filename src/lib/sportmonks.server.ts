/**
 * SportMonks Football v3 client + mappers.
 *
 * Server-only: the API token never reaches the browser. Everything here maps
 * SportMonks payloads onto the app's own `Match` / `StandingRow` shapes so the
 * UI does not need to know where the data came from.
 */
import type { Match, MatchEvent, MatchStatus, StandingRow, Team } from "@/lib/football-data";

const BASE = "https://api.sportmonks.com/v3/football";

/** app league id -> SportMonks league id */
export const LEAGUE_MAP: Record<string, number> = {
  epl: 8,
  lal: 564,
  ucl: 2,
  uel: 5,
  uecl: 2286,
  bun: 82,
  sea: 384,
  lig: 301,
  ere: 72,
  efl: 27,
  fac: 24,
  cha: 9,
  cdr: 570,
  cit: 390,
  dfb: 109,
  spl: 501,
  bel: 208,
  tur: 600,
  mls: 779,
  bra: 648,
  arg: 636,
  afc: 1117,
  wcq: 711,
  unl: 1538,
};

const REVERSE_LEAGUE: Record<number, string> = Object.fromEntries(
  Object.entries(LEAGUE_MAP).map(([k, v]) => [v, k]),
);

const cache = new Map<string, { at: number; value: unknown }>();

async function api<T>(path: string, params: Record<string, string>, ttlMs: number): Promise<T> {
  const token = process.env["SPORTMONKS_API_TOKEN"];
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not configured");

  const qs = new URLSearchParams({ ...params, api_token: token });
  const url = `${BASE}${path}?${qs.toString()}`;
  const key = `${path}?${new URLSearchParams(params).toString()}`;

  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;

  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`SportMonks ${res.status}: ${await res.text().catch(() => "")}`);
  const json = (await res.json()) as { data: T };
  cache.set(key, { at: Date.now(), value: json.data });
  return json.data;
}

/** Same as `api`, but follows pagination up to `maxPages`. */
async function apiPaged<T>(
  path: string,
  params: Record<string, string>,
  ttlMs: number,
  maxPages = 5,
): Promise<T[]> {
  const token = process.env["SPORTMONKS_API_TOKEN"];
  if (!token) throw new Error("SPORTMONKS_API_TOKEN is not configured");

  const key = `paged:${path}?${new URLSearchParams(params).toString()}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T[];

  const out: T[] = [];
  let page = 1;
  while (page <= maxPages) {
    const qs = new URLSearchParams({ ...params, page: String(page), api_token: token });
    const res = await fetch(`${BASE}${path}?${qs.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      if (out.length > 0) break;
      throw new Error(`SportMonks ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const json = (await res.json()) as {
      data: T[];
      pagination?: { has_more?: boolean };
    };
    out.push(...(json.data ?? []));
    if (!json.pagination?.has_more) break;
    page += 1;
  }

  cache.set(key, { at: Date.now(), value: out });
  return out;
}

/* ------------------------------- mapping -------------------------------- */

interface SmParticipant {
  id: number;
  name: string;
  short_code: string | null;
  image_path?: string;
  meta?: { location?: "home" | "away"; position?: number };
}

interface SmFixture {
  id: number;
  league_id: number;
  name: string;
  starting_at: string;
  state?: { developer_name?: string };
  league?: { id: number; name: string };
  venue?: { name?: string } | null;
  participants?: SmParticipant[];
  scores?: { description: string; score: { goals: number; participant: "home" | "away" } }[];
  periods?: { ticking?: boolean; minutes?: number; counts_from?: number }[];
  events?: {
    type_id: number;
    participant_id: number;
    player_name?: string | null;
    related_player_name?: string | null;
    info?: string | null;
    minute: number;
  }[];
  statistics?: {
    participant_id: number;
    data?: { value?: number };
    type?: { code?: string; name?: string };
  }[];
  tvstations?: { tvstation?: { name?: string } }[];
}

const LIVE_STATES = new Set([
  "INPLAY_1ST_HALF",
  "INPLAY_2ND_HALF",
  "HT",
  "BREAK",
  "INPLAY_ET",
  "INPLAY_ET_2ND_HALF",
  "INPLAY_PENALTIES",
  "PEN_BREAK",
  "EXTRA_TIME_BREAK",
]);
const DONE_STATES = new Set(["FT", "AET", "FT_PEN", "AFTER_EXTRA_TIME", "AFTER_PENALTIES"]);

function statusOf(fx: SmFixture): MatchStatus {
  const s = fx.state?.developer_name ?? "";
  if (LIVE_STATES.has(s)) return "live";
  if (DONE_STATES.has(s)) return "finished";
  return "upcoming";
}

function toTeam(p: SmParticipant): Team {
  const team: Team = {
    id: String(p.id),
    name: p.name,
    short: p.short_code ?? p.name.slice(0, 3).toUpperCase(),
    crest: "⚽",
    domain: "",
  };
  if (p.image_path) team.logo = p.image_path;
  return team;
}

function currentScore(fx: SmFixture, side: "home" | "away"): number | null {
  const row = fx.scores?.find((s) => s.description === "CURRENT" && s.score.participant === side);
  return row ? row.score.goals : null;
}

function minuteOf(fx: SmFixture): number | undefined {
  const ticking = fx.periods?.find((p) => p.ticking);
  if (ticking?.minutes != null) return ticking.minutes;
  const minutes = (fx.periods ?? [])
    .map((p) => p.minutes)
    .filter((m): m is number => typeof m === "number");
  return minutes.length > 0 ? Math.max(...minutes) : undefined;
}

const EVENT_TYPES: Record<number, MatchEvent["type"]> = {
  14: "goal", // goal
  15: "goal", // owngoal
  16: "goal", // penalty
  19: "yellow",
  20: "red",
  21: "red", // yellowred
  18: "sub",
  83: "sub",
};

const STAT_LABELS: { code: string; label: string }[] = [
  { code: "ball-possession", label: "Possession %" },
  { code: "shots-total", label: "Shots" },
  { code: "shots-on-target", label: "On target" },
  { code: "corners", label: "Corners" },
  { code: "fouls", label: "Fouls" },
];

function toMatch(fx: SmFixture): Match | null {
  const home = fx.participants?.find((p) => p.meta?.location === "home");
  const away = fx.participants?.find((p) => p.meta?.location === "away");
  if (!home || !away) return null;

  const leagueId = REVERSE_LEAGUE[fx.league_id] ?? `sm-${fx.league_id}`;
  const status = statusOf(fx);

  const events: MatchEvent[] = [];
  for (const e of fx.events ?? []) {
    const type = EVENT_TYPES[e.type_id];
    if (!type) continue;
    const ev: MatchEvent = {
      minute: e.minute,
      type,
      team: e.participant_id === home.id ? "home" : "away",
      player: e.player_name ?? "—",
    };
    if (e.info) ev.detail = e.info;
    events.push(ev);
  }
  events.sort((a, b) => a.minute - b.minute);

  const stats = STAT_LABELS.map(({ code, label }) => {
    const h = fx.statistics?.find((s) => s.type?.code === code && s.participant_id === home.id);
    const a = fx.statistics?.find((s) => s.type?.code === code && s.participant_id === away.id);
    if (!h && !a) return null;
    return { label, home: h?.data?.value ?? 0, away: a?.data?.value ?? 0 };
  }).filter((s): s is { label: string; home: number; away: number } => s !== null);

  const channels = Array.from(
    new Set((fx.tvstations ?? []).map((t) => t.tvstation?.name).filter(Boolean) as string[]),
  ).slice(0, 3);

  const match: Match = {
    id: String(fx.id),
    leagueId,
    ...(fx.league?.name ? { leagueName: fx.league.name } : {}),
    home: toTeam(home),
    away: toTeam(away),
    homeScore: status === "upcoming" ? null : (currentScore(fx, "home") ?? 0),
    awayScore: status === "upcoming" ? null : (currentScore(fx, "away") ?? 0),
    status,
    kickoff: new Date(fx.starting_at.replace(" ", "T") + "Z").toISOString(),
    venue: fx.venue?.name ?? "TBD",
    channels,
    events,
    stats,
  };
  const minute = minuteOf(fx);
  if (minute != null) match.minute = minute;
  return match;
}

/* ------------------------------- queries -------------------------------- */

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const LIST_INCLUDE = "participants;scores;state;league;venue;periods";
const DETAIL_INCLUDE = `${LIST_INCLUDE};events;statistics.type;tvstations.tvstation`;
const LEAGUE_FILTER = Object.values(LEAGUE_MAP).join(",");

/** Anything kicking off in this window is listed. */
export async function fetchMatches(): Promise<Match[]> {
  const now = Date.now();
  const from = ymd(new Date(now - 36 * 3600_000));
  const to = ymd(new Date(now + 72 * 3600_000));

  // Scheduled/finished fixtures for the tracked competitions, plus every match
  // currently in play across the whole feed so a live game is never missing.
  const [scheduled, inplay] = await Promise.all([
    apiPaged<SmFixture>(
      `/fixtures/between/${from}/${to}`,
      {
        include: LIST_INCLUDE,
        filters: `fixtureLeagues:${LEAGUE_FILTER}`,
        per_page: "100",
        order: "starting_at",
      },
      20_000,
      5,
    ),
    api<SmFixture[]>(`/livescores/inplay`, { include: LIST_INCLUDE }, 10_000).catch(
      () => [] as SmFixture[],
    ),
  ]);

  const byId = new Map<string, Match>();
  for (const fx of [...scheduled, ...inplay]) {
    const m = toMatch(fx);
    if (!m) continue;
    byId.set(m.id, m); // in-play data wins on conflict
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );
}

export async function fetchMatch(id: string): Promise<Match | null> {
  const data = await api<SmFixture>(`/fixtures/${id}`, { include: DETAIL_INCLUDE }, 15_000);
  return data ? toMatch(data) : null;
}

interface SmStanding {
  position: number;
  points: number;
  participant?: SmParticipant;
  details?: { value?: number; type?: { code?: string } }[];
  form?: { form?: string; sort_order?: number }[];
}

const detail = (row: SmStanding, code: string) =>
  row.details?.find((d) => d.type?.code === code)?.value ?? 0;

export async function fetchStandings(leagueKey: string): Promise<StandingRow[]> {
  const leagueId = LEAGUE_MAP[leagueKey];
  if (!leagueId) return [];

  const data = await api<SmStanding[]>(
    `/standings/live/leagues/${leagueId}`,
    { include: "participant;details.type;form" },
    60_000,
  );

  return data
    .filter((r) => r.participant)
    .map((r) => {
      const won = detail(r, "overall-won");
      const drawn = detail(r, "overall-draw");
      const lost = detail(r, "overall-lost");
      const form = (r.form ?? [])
        .slice()
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .slice(-5)
        .map((f) => (f.form === "W" ? "W" : f.form === "D" ? "D" : "L") as "W" | "D" | "L");

      return {
        pos: r.position,
        team: toTeam(r.participant!),
        played: won + drawn + lost,
        won,
        drawn,
        lost,
        gd: detail(r, "goal-difference"),
        points: r.points,
        form,
      };
    })
    .sort((a, b) => a.pos - b.pos);
}
