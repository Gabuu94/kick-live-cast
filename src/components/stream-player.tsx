import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Cast,
  ExternalLink,
  Loader2,
  Play,
  RotateCw,
  Settings2,
  ShieldCheck,
  Tv,
} from "lucide-react";
import {
  getRegion,
  isEmbeddable,
  playableSource,
  regionName,
  sourceLink,
  sourcesForMatch,
  sourcesForRegion,
  youtubeEmbedUrl,
  type StreamSource,
} from "@/lib/streams";
import {
  getQualityPref,
  qualityLabel,
  resolveLevel,
  setQualityPref,
  type QualityLevel,
  type QualityPref,
} from "@/lib/stream-quality";
import { useCast } from "@/lib/native/use-cast";
import { showRewarded } from "@/lib/native/ads";
import { runAdGate } from "@/lib/native/ad-gate";
import { openExternal } from "@/lib/native/browser";
import { cn } from "@/lib/utils";

/** Region, re-read whenever the user changes it in Watch. */
export function useRegion(): string {
  const [region, setRegionState] = useState("*");
  useEffect(() => {
    setRegionState(getRegion());
    const onChange = (e: Event) => setRegionState((e as CustomEvent<string>).detail);
    window.addEventListener("fltv:region", onChange);
    return () => window.removeEventListener("fltv:region", onChange);
  }, []);
  return region;
}

const MAX_RETRIES = 4;

/** Human wording for the failure modes hls.js reports. */
function errorMessage(kind: "network" | "media" | "unsupported" | "gone"): string {
  switch (kind) {
    case "network":
      return "We lost the connection to the broadcaster. Check your internet and we'll keep trying.";
    case "media":
      return "The video feed glitched. Reconnecting to the live edge…";
    case "unsupported":
      return "This device can't play this stream format.";
    default:
      return "The broadcaster stopped this stream. It may be between matches.";
  }
}

/**
 * Plays a direct HLS/MP4 stream: remembered quality, plain-language errors and
 * automatic reconnection with backoff. hls.js loads lazily, browser only.
 */
function HlsVideo({
  url,
  title,
  subtitle,
}: {
  url: string;
  title: string;
  subtitle?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<{ destroy: () => void; currentLevel: number } | null>(null);
  const retries = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [levels, setLevels] = useState<QualityLevel[]>([]);
  const [pref, setPref] = useState<QualityPref>("auto");
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fatal, setFatal] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const cast = useCast();

  useEffect(() => setPref(getQualityPref()), []);

  const start = useCallback(
    async (savedPref: QualityPref) => {
      const video = ref.current;
      if (!video) return;
      setError(null);
      setFatal(false);

      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        void video.play().catch(() => undefined);
        return;
      }

      const { default: Hls } = await import("hls.js");
      if (!Hls.isSupported()) {
        setError(errorMessage("unsupported"));
        setFatal(true);
        return;
      }

      const hls = new Hls({ lowLatencyMode: true });
      hlsRef.current = hls as unknown as { destroy: () => void; currentLevel: number };
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const parsed: QualityLevel[] = hls.levels.map((l, index) => ({
          index,
          height: l.height ?? 0,
          bitrate: l.bitrate ?? 0,
        }));
        const usable = parsed.filter((l) => l.height > 0);
        setLevels(usable);
        hls.currentLevel = resolveLevel(usable, savedPref);
        retries.current = 0;
        setAttempt(0);
        setReconnecting(false);
        setError(null);
        void video.play().catch(() => undefined);
      });

      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        const isNetwork = data.type === Hls.ErrorTypes.NETWORK_ERROR;
        setError(errorMessage(isNetwork ? "network" : "media"));

        if (retries.current >= MAX_RETRIES) {
          setFatal(true);
          setReconnecting(false);
          setError(errorMessage("gone"));
          hls.destroy();
          return;
        }

        retries.current += 1;
        setAttempt(retries.current);
        setReconnecting(true);

        if (isNetwork) {
          timer.current = setTimeout(
            () => hls.startLoad(),
            Math.min(1000 * 2 ** (retries.current - 1), 8000),
          );
        } else {
          hls.recoverMediaError();
        }
      });
    },
    [url],
  );

  useEffect(() => {
    retries.current = 0;
    void start(getQualityPref());
    return () => {
      if (timer.current) clearTimeout(timer.current);
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [start]);

  function choose(next: QualityPref) {
    setPref(next);
    setQualityPref(next);
    setMenuOpen(false);
    if (hlsRef.current) hlsRef.current.currentLevel = resolveLevel(levels, next);
  }

  function retryNow() {
    if (timer.current) clearTimeout(timer.current);
    hlsRef.current?.destroy();
    hlsRef.current = null;
    retries.current = 0;
    setAttempt(0);
    setReconnecting(true);
    void start(pref);
  }

  return (
    <div className="relative">
      <video ref={ref} controls playsInline className="aspect-video w-full bg-black" />

      {/* Cast + quality controls */}
      <div className="absolute right-2 top-2 flex items-center gap-2">
        {cast.available && (
          <button
            type="button"
            onClick={() => (cast.connected ? cast.stop() : void cast.cast(url, title, subtitle))}
            aria-label={cast.connected ? "Stop casting" : "Cast to TV"}
            className={cn(
              "grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur",
              cast.connected && "bg-primary text-primary-foreground",
            )}
          >
            <Cast className="h-4 w-4" />
          </button>
        )}
        {levels.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Video quality"
              className="flex h-8 items-center gap-1 rounded-full bg-black/60 px-2.5 text-[11px] font-bold text-white backdrop-blur"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {pref === "auto" ? "Auto" : `${pref}p`}
            </button>
            {menuOpen && (
              <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-xl bg-card ring-1 ring-border">
                <button
                  type="button"
                  onClick={() => choose("auto")}
                  className={cn(
                    "block w-full px-3 py-2 text-left text-xs",
                    pref === "auto" ? "bg-primary/15 font-bold text-primary" : "text-foreground",
                  )}
                >
                  Auto (recommended)
                </button>
                {[...levels]
                  .sort((a, b) => b.height - a.height)
                  .map((level) => (
                    <button
                      key={level.index}
                      type="button"
                      onClick={() => choose(level.height)}
                      className={cn(
                        "block w-full px-3 py-2 text-left text-xs",
                        pref === level.height
                          ? "bg-primary/15 font-bold text-primary"
                          : "text-foreground",
                      )}
                    >
                      {qualityLabel(level)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {cast.connected && (
        <p className="flex items-center gap-1.5 bg-primary/10 px-3 py-2 text-[11px] font-semibold text-primary">
          <Cast className="h-3.5 w-3.5" /> Playing on {cast.device ?? "your TV"}
        </p>
      )}
      {cast.error && (
        <p className="bg-destructive/10 px-3 py-2 text-[11px] text-destructive">{cast.error}</p>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center bg-background/85 px-6 text-center">
          <div>
            <AlertTriangle className="mx-auto h-6 w-6 text-live" />
            <p className="mt-2 text-sm font-semibold">{error}</p>
            {reconnecting && !fatal && (
              <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Reconnecting… attempt {attempt} of {MAX_RETRIES}
              </p>
            )}
            <button
              type="button"
              onClick={retryNow}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
            >
              <RotateCw className="h-3.5 w-3.5" /> Try again
            </button>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Still stuck? The official sources below always work.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SourceRow({
  source,
  onPlay,
}: {
  source: StreamSource;
  onPlay?: (source: StreamSource) => void;
}) {
  const playable = Boolean(onPlay) && isEmbeddable(source);

  return (
    <button
      type="button"
      onClick={() => (playable ? onPlay?.(source) : openExternal(sourceLink(source)))}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-2/70"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        {playable ? <Play className="h-4 w-4 fill-current" /> : <Tv className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{source.name}</span>
          {source.official && (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Official source" />
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {playable ? `${source.coverage} · plays here` : `${source.coverage} · opens on the broadcaster`}
        </span>
      </span>
      {playable ? (
        <Play className="h-4 w-4 shrink-0 text-primary" />
      ) : (
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      )}
    </button>
  );
}

export function StreamSourceList({
  sources,
  className,
  onPlay,
}: {
  sources: StreamSource[];
  className?: string;
  onPlay?: (source: StreamSource) => void;
}) {
  if (sources.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {sources.map((s) => (
        <SourceRow key={s.id} source={s} {...(onPlay ? { onPlay } : {})} />
      ))}
    </div>
  );
}

/** Renders the right player for a source: YouTube embed or direct HLS. */
export function SourcePlayer({ source }: { source: StreamSource }) {
  if (source.kind === "youtube") {
    return (
      <iframe
        title={`${source.name} live stream`}
        src={youtubeEmbedUrl(source)}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="aspect-video w-full border-0 bg-black"
      />
    );
  }
  return <HlsVideo url={source.url!} title={source.name} subtitle={source.coverage} />;
}

/**
 * Watch tab: a list of sources where the embeddable ones play right here,
 * after a rewarded ad. Non-embeddable ones still open the broadcaster.
 */
export function WatchableSourceList({
  sources,
  className,
}: {
  sources: StreamSource[];
  className?: string;
}) {
  const [active, setActive] = useState<StreamSource | null>(null);
  const [loading, setLoading] = useState(false);

  async function play(source: StreamSource) {
    setLoading(true);
    await runAdGate("rewarded");
    setLoading(false);
    setActive(source);
  }

  return (
    <div className={cn("space-y-3", className)}>
      {active && (
        <div className="overflow-hidden rounded-xl ring-1 ring-border">
          <SourcePlayer source={active} />
          <div className="flex items-center gap-2 bg-surface-2 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-xs font-semibold">{active.name}</span>
            <button
              type="button"
              onClick={() => setActive(null)}
              className="rounded-full bg-background px-3 py-1 text-[11px] font-bold text-muted-foreground"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting the stream…
        </p>
      )}

      <StreamSourceList sources={sources} onPlay={play} />
    </div>
  );
}

/**
 * Watch-tab casting panel: sends any castable (direct) live feed in the
 * viewer's region straight to a Chromecast.
 */
export function CastPanel({ region }: { region: string }) {
  const cast = useCast();
  const castable = sourcesForRegion(region).filter((s) => s.kind === "hls" && s.url);

  if (!cast.available) return null;

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-primary">
        <Cast className="h-4 w-4" /> Cast to your TV
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {cast.connected
          ? `Connected to ${cast.device ?? "your TV"}.`
          : "Send a live feed to any Chromecast on your Wi-Fi."}
      </p>
      {cast.error && <p className="mt-2 text-xs text-destructive">{cast.error}</p>}

      {castable.length > 0 ? (
        <div className="mt-3 space-y-2">
          {castable.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => void cast.cast(s.url!, s.name, s.coverage)}
              className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-2/70"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
                <Cast className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{s.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.coverage}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-surface-2 px-3 py-2.5 text-xs text-muted-foreground">
          No direct feed to cast in {regionName(region)} right now. YouTube and broadcaster apps
          cast from their own app — open a source below and use its cast button.
        </p>
      )}

      {cast.connected && (
        <button
          type="button"
          onClick={cast.stop}
          className="mt-3 rounded-full bg-surface-2 px-4 py-2 text-xs font-bold text-foreground"
        >
          Stop casting
        </button>
      )}
    </section>
  );
}

/**
 * The match screen's watch surface: plays an embeddable official stream in-app
 * (after a rewarded ad), and always lists the legal free sources for the
 * viewer's region.
 */
export function MatchStream({
  leagueId,
  channels,
}: {
  leagueId: string;
  channels: string[];
}) {
  const region = useRegion();
  const sources = sourcesForMatch(leagueId, region);
  const playable = playableSource(sources, leagueId);
  const others = sources.filter((s) => s.id !== playable?.id);

  const [playing, setPlaying] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => setPlaying(false), [leagueId, region]);

  async function start() {
    if (!playable) return;
    setUnlocking(true);
    const earned = await showRewarded();
    setUnlocking(false);
    if (earned) setPlaying(true);
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      {playing && playable ? (
        playable.kind === "youtube" ? (
          <iframe
            title={`${playable.name} live stream`}
            src={youtubeEmbedUrl(playable)}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full border-0 bg-black"
          />
        ) : (
          <HlsVideo url={playable.url!} title={playable.name} subtitle={playable.coverage} />
        )
      ) : (
        <div className="grid aspect-video place-items-center bg-surface-2">
          <div className="px-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-primary shadow-glow">
              <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
            </span>
            {playable ? (
              <>
                <p className="mt-3 text-sm font-semibold">Watch free on {playable.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{playable.coverage}</p>
                <button
                  type="button"
                  onClick={start}
                  disabled={unlocking}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {unlocking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Watch ad, then play
                </button>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm font-semibold">No free stream in {regionName(region)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  This match is with a paid rights holder here. The official options are listed
                  below.
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-border p-3">
        {channels.length > 0 && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Tv className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate">On TV: {channels.join(" · ")}</span>
          </p>
        )}
        <StreamSourceList sources={others} />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Football Live TV doesn't host or rebroadcast any match. Streams play from the rights
          holder's own service, and availability depends on your country.
        </p>
      </div>
    </section>
  );
}
