import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/app-chrome";
import { MatchCard } from "@/components/match-card";
import { AdSlot } from "@/components/ad-slot";
import { formatDay, matches } from "@/lib/football-data";

export const Route = createFileRoute("/fixtures")({
  head: () => ({
    meta: [
      { title: "Football Fixtures & Kick-off Times — Football Live TV" },
      {
        name: "description",
        content:
          "Every upcoming football fixture by day, with kick-off times, venues and broadcast channels.",
      },
      { property: "og:title", content: "Football Fixtures & Kick-off Times — Football Live TV" },
      {
        property: "og:description",
        content: "Browse upcoming football fixtures grouped by day with TV channel listings.",
      },
    ],
  }),
  component: FixturesPage,
});

function FixturesPage() {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime(),
  );

  const groups = sorted.reduce<Record<string, typeof matches>>((acc, m) => {
    const key = formatDay(m.kickoff);
    (acc[key] ||= []).push(m);
    return acc;
  }, {});

  return (
    <Page title="Fixtures" subtitle="All matches by day">
      <AdSlot />
      {Object.entries(groups).map(([day, list]) => (
        <section key={day} className="space-y-3">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
            {day}
          </h2>
          {list.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </section>
      ))}
    </Page>
  );
}
