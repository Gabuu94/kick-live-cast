import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Page } from "@/components/app-chrome";
import { AdSlot } from "@/components/ad-slot";
import { TeamCrest } from "@/components/match-card";
import { leagues } from "@/lib/football-data";
import { useStandings } from "@/lib/use-football";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/standings")({
  head: () => ({
    meta: [
      { title: "League Tables & Standings — Football Live TV" },
      {
        name: "description",
        content:
          "Up-to-date league tables for the Premier League, LaLiga, Serie A, Bundesliga, Ligue 1 and Champions League.",
      },
      { property: "og:title", content: "League Tables & Standings — Football Live TV" },
      {
        property: "og:description",
        content: "Points, goal difference and recent form for Europe's top leagues.",
      },
    ],
  }),
  component: StandingsPage,
});

function StandingsPage() {
  const [leagueId, setLeagueId] = useState("epl");
  const { rows, isPending } = useStandings(leagueId);

  return (
    <Page title="Tables" subtitle="Standings and recent form">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {leagues.map((l) => (
          <button
            key={l.id}
            onClick={() => setLeagueId(l.id)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              leagueId === l.id
                ? "bg-gradient-primary text-primary-foreground shadow-glow"
                : "bg-surface-2 text-muted-foreground",
            )}
          >
            {l.badge} {l.name}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        <div className="grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_2rem] gap-2 border-b border-border px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>#</span>
          <span>Team</span>
          <span className="text-center">P</span>
          <span className="text-center">GD</span>
          <span className="text-center">Pts</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.team.id}
            className="grid grid-cols-[1.6rem_1fr_1.6rem_1.6rem_2rem] items-center gap-2 border-b border-border/60 px-3 py-2.5 last:border-0"
          >
            <span
              className={cn(
                "font-display text-sm font-bold",
                r.pos <= 4 ? "text-primary" : "text-muted-foreground",
              )}
            >
              {r.pos}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              <TeamCrest team={r.team} size="sm" />
              <span className="truncate text-sm font-medium">{r.team.name}</span>
            </span>
            <span className="text-center text-xs tabular-nums text-muted-foreground">
              {r.played}
            </span>
            <span className="text-center text-xs tabular-nums text-muted-foreground">
              {r.gd > 0 ? `+${r.gd}` : r.gd}
            </span>
            <span className="text-center font-display text-sm font-bold tabular-nums">
              {r.points}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-card p-3 ring-1 ring-border">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
          Form guide
        </h2>
        <div className="mt-3 space-y-2">
          {rows.map((r) => (
            <div key={r.team.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-sm">{r.team.name}</span>
              <span className="flex gap-1">
                {r.form.map((f, i) => (
                  <span
                    key={i}
                    className={cn(
                      "grid h-5 w-5 place-items-center rounded text-[10px] font-bold",
                      f === "W"
                        ? "bg-primary/20 text-primary"
                        : f === "D"
                          ? "bg-surface-2 text-muted-foreground"
                          : "bg-live/20 text-live",
                    )}
                  >
                    {f}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>

      <AdSlot />
    </Page>
  );
}
