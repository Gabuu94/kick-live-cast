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
  bun: 82,
  sea: 384,
  lig: 301,
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
  return {
    id: String(p.id),
    name: p.name,
    short: p.short_code ?? p.name.slice(0, 3).toUpperCase(),
    crest: "⚽",
    domain: "",
    logo: p.image_path,
  };
}

function currentScore(fx: SmFixture, side: "home" | "away"): number | null {
  const row = fx.scores?.find((s) => s.description === "CURRENT" && s.score.participant === side);
  return row ? row.score.goals : null;
}

function minuteOf(fx: SmFixture): number | undefined {
  const ticking = fx.periods?.find((p) => p.ticking);
  if (ticking?.minutes != null) return ticking.minutes;
  return undefined;
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

  const events: MatchEvent[] = (fx.events ?? [])
    .map((e) => {
      const type = EVENT_TYPES[e.type_id];
      if (!type) return null;
      return {
        minute: e.minute,
        type,
        team: e.participant_id === home.id ? ("home" as const) : ("away" as const),
        player: e.player_name ?? "—",
        detail: e.info ?? undefined,
      };
    })
    .filter((e): e is MatchEvent => e !== null)
    .sort((a, b) => a.minute - b.minute);

  const stats = STAT_LABELS.map(({ code, label }) => {
    const h = fx.statistics?.find((s) => s.type?.code === code && s.participant_id === home.id);
    const a = fx.statistics?.find((s) => s.type?.code === code && s.participant_id === away.id);
    if (!h && !a) return null;
    return { label, home: h?.data?.value ?? 0, away: a?.data?.value ?? 0 };
  }).filter((s): s is { label: string; home: number; away: number } => s !== null);

  const channels = Array.from(
    new Set((fx.tvstations ?? []).map((t) => t.tvstation?.name).filter(Boolean) as string[]),
  ).slice(0, 3);

  return {
    id: String(fx.id),
    leagueId,
    home: toTeam(home),
    away: toTeam(away),
    homeScore: status === "upcoming" ? null : (currentScore(fx, "home") ?? 0),
    awayScore: status === "upcoming" ? null : (currentScore(fx, "away") ?? 0),
    status,
    minute: minuteOf(fx),
    kickoff: new Date(fx.starting_at.replace(" ", "T") + "Z").toISOString(),
    venue: fx.venue?.name ?? "TBD",
    channels,
    events,
    stats,
  };
}

/* ------------------------------- queries -------------------------------- */

const ymd = (d: Date) => d.toISOString().slice(0, 10);

const LIST_INCLUDE = "participants;scores;state;league;venue;periods";
const DETAIL_INCLUDE = `${LIST_INCLUDE};events;statistics.type;tvstations.tvstation`;
const LEAGUE_FILTER = Object.values(LEAGUE_MAP).join(",");

export async function fetchMatches(): Promise<Match[]> {
  const now = Date.now();
  const from = ymd(new Date(now - 36 * 3600_000));
  const to = ymd(new Date(now + 72 * 3600_000));

  const data = await api<SmFixture[]>(
    `/fixtures/between/${from}/${to}`,
    {
      include: LIST_INCLUDE,
      filters: `fixtureLeagues:${LEAGUE_FILTER}`,
      per_page: "100",
      order: "starting_at",
    },
    20_000,
  );

  return data
    .map(toMatch)
    .filter((m): m is Match => m !== null)
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
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
