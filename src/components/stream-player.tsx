import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, Play, ShieldCheck, Tv } from "lucide-react";
import {
  getRegion,
  playableSource,
  regionName,
  sourceLink,
  sourcesForMatch,
  youtubeEmbedUrl,
  type StreamSource,
} from "@/lib/streams";
import { showRewarded } from "@/lib/native/ads";
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

/** Plays a direct HLS/MP4 stream. hls.js loads lazily, browser only. */
function HlsVideo({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let destroy: (() => void) | undefined;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      void video.play().catch(() => undefined);
    } else {
      void (async () => {
        const { default: Hls } = await import("hls.js");
        if (!Hls.isSupported()) return setError(true);
        const hls = new Hls({ lowLatencyMode: true });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) setError(true);
        });
        destroy = () => hls.destroy();
      })();
    }
    return () => destroy?.();
  }, [url]);

  if (error) {
    return (
      <div className="grid aspect-video place-items-center bg-surface-2 px-6 text-center text-xs text-muted-foreground">
        This stream isn't available right now. Try one of the official sources below.
      </div>
    );
  }
  return <video ref={ref} controls playsInline className="aspect-video w-full bg-black" />;
}

function SourceRow({ source }: { source: StreamSource }) {
  return (
    <button
      type="button"
      onClick={() => openExternal(sourceLink(source))}
      className="flex w-full items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-2/70"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
        <Tv className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{source.name}</span>
          {source.official && (
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Official source" />
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{source.coverage}</span>
      </span>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

export function StreamSourceList({
  sources,
  className,
}: {
  sources: StreamSource[];
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <div className={cn("space-y-2", className)}>
      {sources.map((s) => (
        <SourceRow key={s.id} source={s} />
      ))}
    </div>
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
  const playable = playableSource(sources);
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
          <HlsVideo url={playable.url!} />
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
