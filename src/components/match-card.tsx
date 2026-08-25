import { Link } from "@tanstack/react-router";
import { Star, Tv } from "lucide-react";
import { getLeague, formatKickoff, formatDay, type Match } from "@/lib/football-data";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export function TeamCrest({ crest, size = "md" }: { crest: string; size?: "sm" | "md" }) {
  return (
    <span
      className={cn(
        "grid place-items-center rounded-full bg-surface-2 ring-1 ring-border",
        size === "md" ? "h-9 w-9 text-lg" : "h-7 w-7 text-sm",
      )}
      aria-hidden
    >
      {crest}
    </span>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const league = getLeague(match.leagueId);
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(match.home.id) || isFavorite(match.away.id);

  return (
    <Link
      to="/match/$matchId"
      params={{ matchId: match.id }}
      className="block rounded-2xl bg-card p-3 shadow-card ring-1 ring-border transition-colors active:bg-surface-2"
    >
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">
          {league?.badge} {league?.name}
        </span>
        <button
          type="button"
          aria-label="Toggle favourite"
          onClick={(e) => {
            e.preventDefault();
            toggle(match.home.id);
          }}
          className="ml-2 shrink-0 p-1"
        >
          <Star
            className={cn("h-4 w-4", fav ? "fill-primary text-primary" : "text-muted-foreground")}
          />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Row team={match.home.name} crest={match.home.crest} score={match.homeScore} />
          <Row team={match.away.name} crest={match.away.crest} score={match.awayScore} />
        </div>

        <div className="w-20 shrink-0 border-l border-border pl-3 text-center">
          {match.status === "live" ? (
            <span className="live-dot font-display text-sm font-semibold text-live">
              {match.minute}'
            </span>
          ) : match.status === "upcoming" ? (
            <div>
              <p className="font-display text-sm font-semibold text-foreground">
                {formatKickoff(match.kickoff)}
              </p>
              <p className="text-[10px] text-muted-foreground">{formatDay(match.kickoff)}</p>
            </div>
          ) : (
            <span className="text-[11px] font-medium text-muted-foreground">FT</span>
          )}
        </div>
      </div>

      {match.channels.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2 text-[11px] text-muted-foreground">
          <Tv className="h-3.5 w-3.5 text-primary" />
          <span className="truncate">{match.channels.join(" · ")}</span>
        </div>
      )}
    </Link>
  );
}

function Row({
  team,
  crest,
  score,
}: {
  team: string;
  crest: string;
  score: number | null;
}) {
  return (
    <div className="flex items-center gap-2">
      <TeamCrest crest={crest} size="sm" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">{team}</span>
      <span className="font-display text-base font-bold tabular-nums">
        {score ?? "-"}
      </span>
    </div>
  );
}
