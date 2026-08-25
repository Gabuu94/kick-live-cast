import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { Page } from "@/components/app-chrome";
import { MatchCard, TeamCrest } from "@/components/match-card";
import { matches, teams } from "@/lib/football-data";
import { useFavorites } from "@/lib/favorites";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "My Teams & Followed Matches — Football Live TV" },
      {
        name: "description",
        content:
          "Follow your favourite clubs and keep their live scores, fixtures and results in one place.",
      },
      { property: "og:title", content: "My Teams & Followed Matches — Football Live TV" },
      {
        property: "og:description",
        content: "Pick the clubs you follow and see only their matches.",
      },
    ],
  }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, toggle, isFavorite } = useFavorites();
  const all = Object.values(teams);
  const followed = matches.filter(
    (m) => favorites.includes(m.home.id) || favorites.includes(m.away.id),
  );

  return (
    <Page title="Favourites" subtitle="Tap a club to follow it">
      <div className="grid grid-cols-2 gap-2">
        {all.map((team) => {
          const active = isFavorite(team.id);
          return (
            <button
              key={team.id}
              onClick={() => toggle(team.id)}
              className={cn(
                "flex items-center gap-2 rounded-xl p-2.5 text-left ring-1 transition-colors",
                active ? "bg-primary/10 ring-primary" : "bg-card ring-border",
              )}
            >
              <TeamCrest team={team} size="sm" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{team.name}</span>
              <Star
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "fill-primary text-primary" : "text-muted-foreground",
                )}
              />
            </button>
          );
        })}
      </div>

      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
        Your matches
      </h2>
      {followed.length === 0 ? (
        <p className="rounded-2xl bg-card p-6 text-center text-sm text-muted-foreground ring-1 ring-border">
          Follow a club above to see its matches here.
        </p>
      ) : (
        <div className="space-y-3">
          {followed.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </Page>
  );
}
