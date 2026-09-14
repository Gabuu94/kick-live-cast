import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Share2 } from "lucide-react";
import { TeamCrest } from "@/components/match-card";
import { AdSlot } from "@/components/ad-slot";
import { MatchInfoPanel, OddsPanel } from "@/components/odds-panel";
import { MatchStream } from "@/components/stream-player";
import { shareMatch } from "@/lib/native/share";
import { getLeague, formatDay, formatKickoff } from "@/lib/football-data";
import { useMatch } from "@/lib/use-football";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/match/$matchId")({
  head: () => ({
    meta: [
      { title: "Live Match Centre — Football Live TV" },
      {
        name: "description",
        content:
          "Live score, timeline, stats and broadcast channels for this football match, updated minute by minute.",
      },
      { property: "og:title", content: "Live Match Centre — Football Live TV" },
      {
        property: "og:description",
        content: "Follow the score, goals, stats and where to watch this match live.",
      },
    ],
  }),
  component: MatchPage,
});

function MatchPage() {
  const { matchId } = Route.useParams();
  const { match, isPending } = useMatch(matchId);

  if (!match) {
    return (
      <main className="mx-auto grid min-h-screen max-w-2xl place-items-center bg-pitch px-4 pb-24">
        <p className="text-sm text-muted-foreground">
          {isPending ? "Loading match…" : "This match is no longer available."}
        </p>
      </main>
    );
  }

  const league = getLeague(match.leagueId);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-pitch pb-24">
      <div className="bg-surface/60 px-4 pb-6 pt-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="p-1">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="flex-1 truncate">
            {league?.badge} {league?.name}
          </span>
          <button
            type="button"
            onClick={() => shareMatch(match.id, `${match.home.name} vs ${match.away.name}`)}
            aria-label="Share match"
            className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-muted-foreground transition-colors hover:text-primary"
          >
            <Share2 className="h-4 w-4" />
          </button>
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
        {/* Free legal streams for this match + the official broadcasters */}
        <MatchStream leagueId={match.leagueId} channels={match.channels} />


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
