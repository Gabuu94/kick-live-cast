/**
 * Legal free live football sources.
 *
 * Football Live TV does not host, proxy or rebroadcast anything. This module
 * is a directory of sources that are free to watch *and* legal to point at:
 *
 *  - `youtube`  — an official rights-holder channel that live-streams matches
 *                 and leaves embedding enabled. Played in-app via the YouTube
 *                 IFrame player, which is YouTube's own sanctioned embed.
 *  - `hls`      — a direct stream URL you are licensed to play (a free-to-air
 *                 broadcaster's public HLS feed, or a provider you pay for).
 *                 None are bundled; you supply them (see below).
 *  - `web`      — opens the rights holder's own site/app. Playback happens
 *                 there, which is always safe.
 *
 * Adding your own sources without touching code
 * ---------------------------------------------
 * Set `VITE_STREAM_SOURCES` to a JSON array of `StreamSource` objects at build
 * time. They are merged in ahead of the built-in directory, so you can drop in
 * a YouTube channel ID or an HLS URL the moment you have one:
 *
 *   VITE_STREAM_SOURCES='[{"id":"my-feed","name":"My Feed","kind":"hls",
 *     "url":"https://…/master.m3u8","leagues":["epl"],"regions":["KE"],
 *     "coverage":"Full match"}]'
 *
 * Never point this at a stream you do not have the right to play. That is the
 * single fastest way to lose the Play listing and the AdMob account.
 */

export type StreamKind = "youtube" | "hls" | "web";

export interface StreamSource {
  id: string;
  name: string;
  kind: StreamKind;
  /** What you actually get: full live matches, selected games, highlights… */
  coverage: string;
  /** Short line shown under the name. */
  note?: string;
  /** `web` + `hls`: the URL. */
  url?: string;
  /** `youtube`: a channel ID (UC…) streams whatever is live on that channel. */
  channelId?: string;
  /** `youtube`: a specific video ID, wins over `channelId`. */
  videoId?: string;
  /** League ids this covers; omit for "general football". */
  leagues?: string[];
  /** ISO-3166 country codes where it is legally watchable; `["*"]` = worldwide. */
  regions: string[];
  /** True when it is a rights holder's own service (badge in the UI). */
  official?: boolean;
}

export interface Region {
  code: string;
  name: string;
  flag: string;
}

export const REGIONS: Region[] = [
  { code: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "*", name: "Anywhere else", flag: "🌍" },
];

/**
 * Built-in directory. Every entry is a rights holder's own free service.
 * `web` entries are always safe; `youtube` entries only carry live football in
 * some regions, which is stated in `coverage` rather than promised.
 */
const BUILT_IN: StreamSource[] = [
  {
    id: "fifaplus",
    name: "FIFA+",
    kind: "web",
    url: "https://www.plus.fifa.com/en/live",
    coverage: "Free live matches, worldwide",
    note: "FIFA's own free service — live women's, youth and domestic league games, plus full match replays.",
    regions: ["*"],
    official: true,
  },
  {
    id: "uefatv",
    name: "UEFA.tv",
    kind: "web",
    url: "https://www.uefa.tv/",
    coverage: "Free live UEFA matches",
    note: "Free with a UEFA account: youth, women's and futsal competitions live, plus full Champions League replays.",
    leagues: ["ucl"],
    regions: ["*"],
    official: true,
  },
  {
    id: "caf",
    name: "CAF TV",
    kind: "youtube",
    channelId: "UCkyBhi4CDpKMWQlU1_dCzOA",
    coverage: "Selected African competitions live",
    note: "The Confederation of African Football's official channel — free live matches and full replays.",
    regions: ["KE", "NG", "ZA", "GH", "*"],
    official: true,
  },
  {
    id: "sabc-sport",
    name: "SABC Sport",
    kind: "web",
    url: "https://www.sabcsport.com/live",
    coverage: "Free-to-air live football",
    note: "South Africa's public broadcaster streams PSL, Bafana Bafana and AFCON matches free.",
    regions: ["ZA"],
    official: true,
  },
  {
    id: "rtve",
    name: "RTVE Play",
    kind: "web",
    url: "https://www.rtve.es/play/videos/directo/la-1/",
    coverage: "Free-to-air Copa del Rey and Spain internationals",
    regions: ["ES"],
    official: true,
  },
  {
    id: "raiplay",
    name: "Rai Play",
    kind: "web",
    url: "https://www.raiplay.it/dirette/rai2",
    coverage: "Free-to-air Italian cup and internationals",
    leagues: ["sea"],
    regions: ["IT"],
    official: true,
  },
  {
    id: "ardzdf",
    name: "ARD / ZDF Sportschau",
    kind: "web",
    url: "https://www.sportschau.de/live-und-video",
    coverage: "Free-to-air DFB-Pokal and internationals",
    leagues: ["bun"],
    regions: ["DE"],
    official: true,
  },
  {
    id: "itvx",
    name: "ITVX",
    kind: "web",
    url: "https://www.itv.com/watch/categories/sport",
    coverage: "Free-to-air FA Cup, England and Europa nights",
    leagues: ["epl", "ucl"],
    regions: ["GB"],
    official: true,
  },
  {
    id: "tf1",
    name: "TF1 / M6",
    kind: "web",
    url: "https://www.tf1.fr/tf1/direct",
    coverage: "Free-to-air Coupe de France and France internationals",
    leagues: ["lig"],
    regions: ["FR"],
    official: true,
  },
  {
    id: "laliga-yt",
    name: "LaLiga",
    kind: "youtube",
    channelId: "UCTv-XvfzLX3i4IGWAm4sbmA",
    coverage: "Live in selected regions, highlights everywhere",
    note: "LaLiga's official channel streams full matches live in some countries and posts highlights minutes after full time.",
    leagues: ["lal"],
    regions: ["*"],
    official: true,
  },
  {
    id: "bundesliga-yt",
    name: "Bundesliga",
    kind: "youtube",
    channelId: "UC7g4Zm2S-6ZC85oJ5EFbHOQ",
    coverage: "Free highlights and live shows",
    leagues: ["bun"],
    regions: ["*"],
    official: true,
  },
  {
    id: "seriea-yt",
    name: "Serie A",
    kind: "youtube",
    channelId: "UCBJeMCIeLQos7wacox4hmLQ",
    coverage: "Free highlights and live shows",
    leagues: ["sea"],
    regions: ["*"],
    official: true,
  },
  {
    id: "startimes",
    name: "StarTimes ON",
    kind: "web",
    url: "https://www.startimestv.com/",
    coverage: "Free and low-cost live football across Africa",
    regions: ["KE", "NG", "GH"],
    official: true,
  },
];

function fromEnv(): StreamSource[] {
  const raw = import.meta.env["VITE_STREAM_SOURCES"];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? (parsed as StreamSource[]) : [];
  } catch {
    console.warn("VITE_STREAM_SOURCES is not valid JSON — ignoring it.");
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Your own sources (device-local, added from Settings)                */
/* ------------------------------------------------------------------ */

const CUSTOM_KEY = "fltv.sources";

/** Sources the user pasted in Settings. Stored on the device only. */
export function customSources(): StreamSource[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as StreamSource[]) : [];
  } catch {
    return [];
  }
}

function saveCustom(list: StreamSource[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("fltv:sources"));
}

export function addCustomSource(input: {
  name: string;
  url: string;
  leagues?: string[];
  note?: string;
}): StreamSource {
  const url = input.url.trim();
  const youtube = /youtube\.com|youtu\.be/i.test(url);
  const videoId = youtube ? url.match(/(?:v=|youtu\.be\/|live\/)([\w-]{6,})/)?.[1] : undefined;
  const channelId = youtube ? url.match(/channel\/(UC[\w-]+)/)?.[1] : undefined;

  const source: StreamSource = {
    id: `custom-${Date.now()}`,
    name: input.name.trim() || "My source",
    kind: youtube ? "youtube" : "hls",
    coverage: "Added by you",
    regions: ["*"],
    ...(input.note ? { note: input.note } : {}),
    ...(input.leagues && input.leagues.length > 0 ? { leagues: input.leagues } : {}),
    ...(youtube ? (videoId ? { videoId } : channelId ? { channelId } : { videoId: url }) : { url }),
  };

  saveCustom([source, ...customSources()]);
  return source;
}

export function removeCustomSource(id: string): void {
  saveCustom(customSources().filter((s) => s.id !== id));
}

/** Everything the app may offer right now: your sources first. */
export function allSources(): StreamSource[] {
  return [...customSources(), ...fromEnv(), ...BUILT_IN];
}

/** True when the source can be played inside the app rather than linked out. */
export function isEmbeddable(source: StreamSource): boolean {
  if (source.kind === "hls") return Boolean(source.url);
  if (source.kind === "youtube") return Boolean(source.videoId ?? source.channelId);
  return false;
}

export const STREAM_SOURCES: StreamSource[] = [...fromEnv(), ...BUILT_IN];

/* ------------------------------------------------------------------ */
/* Region                                                              */
/* ------------------------------------------------------------------ */

const REGION_KEY = "fltv.region";

/** Best guess from the browser locale; the user can override it in Watch. */
export function detectRegion(): string {
  if (typeof navigator === "undefined") return "*";
  const tags = [navigator.language, ...(navigator.languages ?? [])];
  for (const tag of tags) {
    const region = tag?.split("-")[1]?.toUpperCase();
    if (region && REGIONS.some((r) => r.code === region)) return region;
  }
  return "*";
}

export function getRegion(): string {
  if (typeof localStorage === "undefined") return "*";
  return localStorage.getItem(REGION_KEY) ?? detectRegion();
}

export function setRegion(code: string): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(REGION_KEY, code);
  window.dispatchEvent(new CustomEvent("fltv:region", { detail: code }));
}

export function regionName(code: string): string {
  if (code === "*") return "your region";
  return REGIONS.find((r) => r.code === code)?.name ?? "your region";
}

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

function availableIn(source: StreamSource, region: string): boolean {
  return source.regions.includes("*") || source.regions.includes(region);
}

/** Sources for a region, worldwide ones last. */
export function sourcesForRegion(region: string): StreamSource[] {
  return STREAM_SOURCES.filter((s) => availableIn(s, region)).sort((a, b) => {
    const aLocal = a.regions.includes(region) ? 0 : 1;
    const bLocal = b.regions.includes(region) ? 0 : 1;
    return aLocal - bLocal;
  });
}

/** Sources relevant to one match: league-specific first, then general. */
export function sourcesForMatch(leagueId: string, region: string): StreamSource[] {
  const pool = sourcesForRegion(region);
  const specific = pool.filter((s) => s.leagues?.includes(leagueId));
  const general = pool.filter((s) => !s.leagues);
  return [...specific, ...general];
}

/**
 * The one source we offer to play inside the app, if any.
 *
 * Deliberately strict: only an embeddable source that actually covers this
 * league counts. A generic football channel must never be presented as "watch
 * this match free" — that is the kind of overpromise that gets a listing
 * pulled for deceptive behaviour.
 */
export function playableSource(
  sources: StreamSource[],
  leagueId: string,
): StreamSource | undefined {
  return sources.find(
    (s) => (s.kind === "hls" || s.kind === "youtube") && s.leagues?.includes(leagueId),
  );
}

export function youtubeEmbedUrl(source: StreamSource): string {
  const base = "https://www.youtube-nocookie.com/embed";
  const params = "autoplay=1&playsinline=1&rel=0&modestbranding=1";
  return source.videoId
    ? `${base}/${source.videoId}?${params}`
    : `${base}/live_stream?channel=${source.channelId}&${params}`;
}

export function youtubeWatchUrl(source: StreamSource): string {
  return source.videoId
    ? `https://www.youtube.com/watch?v=${source.videoId}`
    : `https://www.youtube.com/channel/${source.channelId}/live`;
}

export function sourceLink(source: StreamSource): string {
  if (source.kind === "youtube") return youtubeWatchUrl(source);
  return source.url ?? "#";
}
