export type MatchStatus = "live" | "upcoming" | "finished";

export interface Team {
  id: string;
  name: string;
  short: string;
  crest: string; // emoji/initial styling handled in UI
}

export interface League {
  id: string;
  name: string;
  country: string;
  badge: string;
}

export interface MatchEvent {
  minute: number;
  type: "goal" | "yellow" | "red" | "sub";
  team: "home" | "away";
  player: string;
  detail?: string;
}

export interface Match {
  id: string;
  leagueId: string;
  home: Team;
  away: Team;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  minute?: number;
  kickoff: string; // ISO
  venue: string;
  channels: string[];
  events: MatchEvent[];
  stats: { label: string; home: number; away: number }[];
}

export interface StandingRow {
  pos: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gd: number;
  points: number;
  form: ("W" | "D" | "L")[];
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  minutesAgo: number;
  tag: string;
}

const t = (id: string, name: string, short: string, crest: string): Team => ({
  id,
  name,
  short,
  crest,
});

export const teams = {
  ars: t("ars", "Arsenal", "ARS", "🔴"),
  che: t("che", "Chelsea", "CHE", "🔵"),
  liv: t("liv", "Liverpool", "LIV", "🔴"),
  mci: t("mci", "Manchester City", "MCI", "🩵"),
  mun: t("mun", "Manchester United", "MUN", "🔴"),
  tot: t("tot", "Tottenham", "TOT", "⚪"),
  rma: t("rma", "Real Madrid", "RMA", "⚪"),
  bar: t("bar", "Barcelona", "BAR", "🔵"),
  atm: t("atm", "Atlético Madrid", "ATM", "🔴"),
  bay: t("bay", "Bayern München", "BAY", "🔴"),
  bvb: t("bvb", "Borussia Dortmund", "BVB", "🟡"),
  int: t("int", "Inter", "INT", "🔵"),
  mil: t("mil", "AC Milan", "MIL", "🔴"),
  juv: t("juv", "Juventus", "JUV", "⚫"),
  psg: t("psg", "Paris SG", "PSG", "🔵"),
  mar: t("mar", "Marseille", "MAR", "🔷"),
};

export const leagues: League[] = [
  { id: "epl", name: "Premier League", country: "England", badge: "🏴" },
  { id: "lal", name: "LaLiga", country: "Spain", badge: "🇪🇸" },
  { id: "ucl", name: "Champions League", country: "Europe", badge: "🏆" },
  { id: "bun", name: "Bundesliga", country: "Germany", badge: "🇩🇪" },
  { id: "sea", name: "Serie A", country: "Italy", badge: "🇮🇹" },
  { id: "lig", name: "Ligue 1", country: "France", badge: "🇫🇷" },
];

const iso = (hoursFromNow: number) =>
  new Date(Date.now() + hoursFromNow * 3600_000).toISOString();

const stats = (
  h: [number, number, number, number, number],
  a: [number, number, number, number, number],
) => [
  { label: "Possession %", home: h[0], away: a[0] },
  { label: "Shots", home: h[1], away: a[1] },
  { label: "On target", home: h[2], away: a[2] },
  { label: "Corners", home: h[3], away: a[3] },
  { label: "Fouls", home: h[4], away: a[4] },
];

export const matches: Match[] = [
  {
    id: "m1",
    leagueId: "epl",
    home: teams.ars,
    away: teams.mci,
    homeScore: 2,
    awayScore: 1,
    status: "live",
    minute: 67,
    kickoff: iso(-1.2),
    venue: "Emirates Stadium",
    channels: ["Sky Sports Main Event", "Peacock", "SuperSport PL"],
    events: [
      { minute: 12, type: "goal", team: "home", player: "B. Saka", detail: "Right foot" },
      { minute: 34, type: "yellow", team: "away", player: "Rodri" },
      { minute: 41, type: "goal", team: "away", player: "E. Haaland", detail: "Header" },
      { minute: 58, type: "goal", team: "home", player: "K. Havertz", detail: "Assist Ødegaard" },
    ],
    stats: stats([52, 14, 6, 5, 9], [48, 11, 4, 7, 12]),
  },
  {
    id: "m2",
    leagueId: "lal",
    home: teams.rma,
    away: teams.atm,
    homeScore: 0,
    awayScore: 0,
    status: "live",
    minute: 23,
    kickoff: iso(-0.5),
    venue: "Santiago Bernabéu",
    channels: ["ESPN Deportes", "DAZN LaLiga"],
    events: [{ minute: 18, type: "yellow", team: "away", player: "K. Llorente" }],
    stats: stats([58, 5, 1, 2, 4], [42, 3, 0, 1, 6]),
  },
  {
    id: "m3",
    leagueId: "sea",
    home: teams.int,
    away: teams.juv,
    homeScore: 1,
    awayScore: 3,
    status: "live",
    minute: 81,
    kickoff: iso(-1.6),
    venue: "San Siro",
    channels: ["Sky Sport Serie A", "Paramount+"],
    events: [
      { minute: 9, type: "goal", team: "away", player: "D. Vlahović" },
      { minute: 27, type: "goal", team: "home", player: "L. Martínez" },
      { minute: 63, type: "goal", team: "away", player: "F. Chiesa" },
      { minute: 74, type: "red", team: "home", player: "H. Çalhanoğlu" },
      { minute: 79, type: "goal", team: "away", player: "K. Yildiz" },
    ],
    stats: stats([61, 16, 5, 8, 14], [39, 10, 7, 3, 11]),
  },
  {
    id: "m4",
    leagueId: "ucl",
    home: teams.bay,
    away: teams.psg,
    homeScore: null,
    awayScore: null,
    status: "upcoming",
    kickoff: iso(2.5),
    venue: "Allianz Arena",
    channels: ["CBS Sports Golden", "TNT Sports 1"],
    events: [],
    stats: [],
  },
  {
    id: "m5",
    leagueId: "epl",
    home: teams.liv,
    away: teams.tot,
    homeScore: null,
    awayScore: null,
    status: "upcoming",
    kickoff: iso(5),
    venue: "Anfield",
    channels: ["NBC Sports", "Sky Sports Football"],
    events: [],
    stats: [],
  },
  {
    id: "m6",
    leagueId: "bun",
    home: teams.bvb,
    away: teams.bay,
    homeScore: null,
    awayScore: null,
    status: "upcoming",
    kickoff: iso(26),
    venue: "Signal Iduna Park",
    channels: ["ESPN+", "Sky Sport Bundesliga"],
    events: [],
    stats: [],
  },
  {
    id: "m7",
    leagueId: "lal",
    home: teams.bar,
    away: teams.rma,
    homeScore: null,
    awayScore: null,
    status: "upcoming",
    kickoff: iso(30),
    venue: "Estadi Olímpic",
    channels: ["ESPN Deportes", "LaLiga TV"],
    events: [],
    stats: [],
  },
  {
    id: "m8",
    leagueId: "epl",
    home: teams.che,
    away: teams.mun,
    homeScore: 3,
    awayScore: 2,
    status: "finished",
    kickoff: iso(-22),
    venue: "Stamford Bridge",
    channels: ["Sky Sports"],
    events: [
      { minute: 5, type: "goal", team: "home", player: "C. Palmer" },
      { minute: 44, type: "goal", team: "away", player: "M. Rashford" },
      { minute: 52, type: "goal", team: "home", player: "N. Jackson" },
      { minute: 70, type: "goal", team: "away", player: "B. Fernandes" },
      { minute: 88, type: "goal", team: "home", player: "C. Palmer", detail: "Penalty" },
    ],
    stats: stats([49, 18, 9, 6, 10], [51, 12, 5, 4, 13]),
  },
  {
    id: "m9",
    leagueId: "lig",
    home: teams.psg,
    away: teams.mar,
    homeScore: 2,
    awayScore: 0,
    status: "finished",
    kickoff: iso(-27),
    venue: "Parc des Princes",
    channels: ["beIN Sports"],
    events: [
      { minute: 22, type: "goal", team: "home", player: "O. Dembélé" },
      { minute: 66, type: "goal", team: "home", player: "B. Barcola" },
    ],
    stats: stats([64, 20, 8, 9, 7], [36, 6, 2, 2, 15]),
  },
];

export const standings: Record<string, StandingRow[]> = {
  epl: [
    { pos: 1, team: teams.liv, played: 24, won: 17, drawn: 5, lost: 2, gd: 34, points: 56, form: ["W", "W", "D", "W", "W"] },
    { pos: 2, team: teams.ars, played: 24, won: 16, drawn: 4, lost: 4, gd: 29, points: 52, form: ["W", "L", "W", "W", "D"] },
    { pos: 3, team: teams.mci, played: 24, won: 15, drawn: 5, lost: 4, gd: 26, points: 50, form: ["D", "W", "W", "L", "W"] },
    { pos: 4, team: teams.che, played: 24, won: 13, drawn: 6, lost: 5, gd: 18, points: 45, form: ["W", "W", "L", "D", "W"] },
    { pos: 5, team: teams.tot, played: 24, won: 12, drawn: 4, lost: 8, gd: 12, points: 40, form: ["L", "W", "W", "L", "W"] },
    { pos: 6, team: teams.mun, played: 24, won: 10, drawn: 6, lost: 8, gd: 4, points: 36, form: ["L", "D", "W", "L", "L"] },
  ],
  lal: [
    { pos: 1, team: teams.rma, played: 24, won: 18, drawn: 3, lost: 3, gd: 33, points: 57, form: ["W", "W", "W", "D", "W"] },
    { pos: 2, team: teams.bar, played: 24, won: 17, drawn: 4, lost: 3, gd: 38, points: 55, form: ["W", "W", "D", "W", "L"] },
    { pos: 3, team: teams.atm, played: 24, won: 15, drawn: 6, lost: 3, gd: 21, points: 51, form: ["D", "W", "W", "W", "D"] },
  ],
  sea: [
    { pos: 1, team: teams.int, played: 24, won: 17, drawn: 4, lost: 3, gd: 30, points: 55, form: ["W", "W", "L", "W", "W"] },
    { pos: 2, team: teams.juv, played: 24, won: 14, drawn: 8, lost: 2, gd: 22, points: 50, form: ["W", "D", "W", "W", "D"] },
    { pos: 3, team: teams.mil, played: 24, won: 13, drawn: 6, lost: 5, gd: 15, points: 45, form: ["L", "W", "D", "W", "W"] },
  ],
  bun: [
    { pos: 1, team: teams.bay, played: 22, won: 17, drawn: 3, lost: 2, gd: 42, points: 54, form: ["W", "W", "W", "W", "D"] },
    { pos: 2, team: teams.bvb, played: 22, won: 13, drawn: 5, lost: 4, gd: 19, points: 44, form: ["W", "L", "W", "D", "W"] },
  ],
  lig: [
    { pos: 1, team: teams.psg, played: 22, won: 18, drawn: 3, lost: 1, gd: 45, points: 57, form: ["W", "W", "W", "D", "W"] },
    { pos: 2, team: teams.mar, played: 22, won: 13, drawn: 4, lost: 5, gd: 16, points: 43, form: ["W", "L", "W", "W", "L"] },
  ],
  ucl: [
    { pos: 1, team: teams.bay, played: 6, won: 5, drawn: 1, lost: 0, gd: 11, points: 16, form: ["W", "W", "D", "W", "W"] },
    { pos: 2, team: teams.psg, played: 6, won: 4, drawn: 1, lost: 1, gd: 7, points: 13, form: ["W", "D", "W", "L", "W"] },
  ],
};

export const news: NewsItem[] = [
  {
    id: "n1",
    title: "Saka strike puts Arsenal ahead in title six-pointer",
    summary:
      "The winger's early opener set the tone at the Emirates as Arsenal edge a frantic first half against City.",
    source: "Match Centre",
    minutesAgo: 12,
    tag: "Premier League",
  },
  {
    id: "n2",
    title: "Juventus stun Inter with three-goal away burst",
    summary:
      "A red card for the hosts turned the Derby d'Italia as Juve took control late at San Siro.",
    source: "Serie A Wire",
    minutesAgo: 34,
    tag: "Serie A",
  },
  {
    id: "n3",
    title: "Bayern vs PSG: what to expect from tonight's tie",
    summary:
      "Both sides arrive unbeaten in the group. Team news, probable line-ups and where to watch.",
    source: "Preview Desk",
    minutesAgo: 58,
    tag: "Champions League",
  },
  {
    id: "n4",
    title: "Palmer's late penalty seals London derby thriller",
    summary: "Chelsea come from behind twice to beat United 3-2 at Stamford Bridge.",
    source: "Match Centre",
    minutesAgo: 180,
    tag: "Premier League",
  },
  {
    id: "n5",
    title: "El Clásico set for a weekend of records",
    summary: "Barcelona host Real Madrid with the title race tighter than it has been in years.",
    source: "LaLiga Desk",
    minutesAgo: 240,
    tag: "LaLiga",
  },
];

export const getLeague = (id: string) => leagues.find((l) => l.id === id);
export const getMatch = (id: string) => matches.find((m) => m.id === id);
export const liveMatches = () => matches.filter((m) => m.status === "live");
export const upcomingMatches = () => matches.filter((m) => m.status === "upcoming");
export const finishedMatches = () => matches.filter((m) => m.status === "finished");

export const formatKickoff = (isoStr: string) => {
  const d = new Date(isoStr);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatDay = (isoStr: string) => {
  const d = new Date(isoStr);
  const today = new Date();
  const diffDays = Math.round(
    (new Date(d.toDateString()).getTime() - new Date(today.toDateString()).getTime()) /
      86400000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
};
