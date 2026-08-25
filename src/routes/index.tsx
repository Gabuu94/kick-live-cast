import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { Page } from "@/components/app-chrome";
import { MatchCard } from "@/components/match-card";
import { AdSlot } from "@/components/ad-slot";
import {
  finishedMatches,
  leagues,
  liveMatches,
  upcomingMatches,
  matches,
} from "@/lib/football-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Live Football Scores Today — FootyLive" },
      {
        name: "description",
        content:
          "Follow live football scores minute by minute, see today's kick-off times and which channel is showing each match.",
      },
      { property: "og:title", content: "Live Football Scores Today — FootyLive" },
      {
        property: "og:description",
        content: "Live scores, minute-by-minute updates and TV listings for today's football.",
      },
    ],
  }),
  component: LivePage,
});

const filters = ["All", "Live", "Upcoming", "Finished"] as const;

function LivePage() {
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [leagueId, setLeagueId] = useState<string | null>(null);

  const base =
    filter === "Live"
      ? liveMatches()
      : filter === "Upcoming"
        ? upcomingMatches()
        : filter === "Finished"
          ? finishedMatches()
          : matches;

  const list = leagueId ? base.filter((m) => m.leagueId === leagueId) : base;
  const live = liveMatches();

  return (
    <Page title="Live now" subtitle={`${live.length} matches in play`}>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors",
              filter === f
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "bg-surface-2 text-muted-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={leagueId === null} onClick={() => setLeagueId(null)}>
          All leagues
        </Chip>
        {leagues.map((l) => (
          <Chip
            key={l.id}
            active={leagueId === l.id}
            onClick={() => setLeagueId(leagueId === l.id ? null : l.id)}
          >
            {l.badge} {l.name}
          </Chip>
        ))}
      </div>

      <AdSlot />

      <div className="space-y-3">
        {list.length === 0 ? (
          <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
            No matches for this filter.
          </p>
        ) : (
          list.map((m) => <MatchCard key={m.id} match={m} />)
        )}
      </div>

      <Link
        to="/fixtures"
        className="flex items-center justify-between rounded-2xl bg-surface p-4 text-sm font-semibold ring-1 ring-border"
      >
        See full fixture list
        <ChevronRight className="h-4 w-4 text-primary" />
      </Link>
    </Page>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
