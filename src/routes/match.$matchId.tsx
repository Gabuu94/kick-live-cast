import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Loader2, MapPin, Play, Share2, Tv } from "lucide-react";
import { TeamCrest } from "@/components/match-card";
import { AdSlot } from "@/components/ad-slot";
import { MatchInfoPanel, OddsPanel } from "@/components/odds-panel";
import { showRewarded } from "@/lib/native/ads";
import { shareMatch } from "@/lib/native/share";
import { getLeague, getMatch, formatDay, formatKickoff } from "@/lib/football-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/match/$matchId")({
  loader: ({ params }) => {
    const match = getMatch(params.matchId);
    if (!match) throw notFound();
    return { match };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Match unavailable — Football Live TV" }, { name: "robots", content: "noindex" }],
      };
    }
    const { match } = loaderData;
    const title = `${match.home.name} vs ${match.away.name} — Live Score & TV`;
    const description = `Live score, timeline, stats and broadcast channels for ${match.home.name} vs ${match.away.name} at ${match.venue}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: MatchPage,
});

function MatchPage() {
  const { match } = Route.useLoaderData();
  const league = getLeague(match.leagueId);
  const [unlocked, setUnlocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  async function unlockStream() {
    setUnlocking(true);
    const earned = await showRewarded();
    setUnlocking(false);
    if (earned) setUnlocked(true);
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-pitch pb-24">
      <div className="bg-surface/60 px-4 pb-6 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span>
            {league?.badge} {league?.name}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamCrest team={match.home} />
            <span className="text-sm font-semibold leading-tight">{match.home.name}</span>
          </div>
          <div className="text-center">
            {match.status === "upcoming" ? (
              <>
                <p className="font-display text-3xl font-bold">{formatKickoff(match.kickoff)}</p>
                <p className="text-xs text-muted-foreground">{formatDay(match.kickoff)}</p>
              </>
            ) : (
              <>
                <p className="font-display text-4xl font-bold tabular-nums">
                  {match.homeScore} <span className="text-muted-foreground">:</span>{" "}
                  {match.awayScore}
                </p>
                <p
                  className={cn(
                    "mt-1 text-xs font-semibold",
                    match.status === "live" ? "live-dot text-live" : "text-muted-foreground",
                  )}
                >
                  {match.status === "live" ? `${match.minute}'` : "Full time"}
                </p>
              </>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <TeamCrest team={match.away} />
            <span className="text-sm font-semibold leading-tight">{match.away.name}</span>
          </div>
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          {match.venue}
        </p>
      </div>

      <div className="space-y-4 px-4 pt-4">
        {/* Stream slot — connect your own licensed stream URL here */}
        <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
          <div className="grid aspect-video place-items-center bg-surface-2">
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-gradient-primary shadow-glow">
                <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" />
              </span>
              <p className="mt-3 text-sm font-semibold">
                {unlocked ? "Stream ready" : "Stream player"}
              </p>
              <p className="mt-1 px-6 text-xs text-muted-foreground">
                {unlocked
                  ? "Connect your licensed stream source to start playback."
                  : "Watch a short ad to unlock the HD stream for this match."}
              </p>
              {!unlocked && (
                <button
                  type="button"
                  onClick={unlockStream}
                  disabled={unlocking}
                  className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow disabled:opacity-60"
                >
                  {unlocking && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Watch ad to unlock
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
            <Tv className="h-4 w-4 text-primary" />
            <span className="truncate">{match.channels.join(" · ")}</span>
          </div>
        </section>

        <AdSlot />

        <OddsPanel match={match} />

        <MatchInfoPanel match={match} />

        <AdSlot label="Ad space — AdMob medium rectangle" className="h-52" />


        {match.events.length > 0 && (
          <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
              Timeline
            </h2>
            <ul className="mt-3 space-y-3">
              {match.events.map((e, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-8 shrink-0 font-display font-bold tabular-nums text-muted-foreground">
                    {e.minute}'
                  </span>
                  <span className="text-base" aria-hidden>
                    {e.type === "goal" ? "⚽" : e.type === "yellow" ? "🟨" : e.type === "red" ? "🟥" : "🔁"}
                  </span>
                  <span className={cn("min-w-0 flex-1 truncate", e.team === "away" && "text-right")}>
                    <span className="font-medium">{e.player}</span>
                    {e.detail && (
                      <span className="ml-1.5 text-xs text-muted-foreground">{e.detail}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {match.stats.length > 0 && (
          <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
              Match stats
            </h2>
            <div className="mt-3 space-y-3">
              {match.stats.map((s) => {
                const total = s.home + s.away || 1;
                return (
                  <div key={s.label}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold tabular-nums">{s.home}</span>
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="font-semibold tabular-nums">{s.away}</span>
                    </div>
                    <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <span
                        className="bg-primary"
                        style={{ width: `${(s.home / total) * 100}%` }}
                      />
                      <span
                        className="bg-muted-foreground/50"
                        style={{ width: `${(s.away / total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
