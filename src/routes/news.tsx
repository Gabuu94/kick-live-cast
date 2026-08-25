import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { Page } from "@/components/app-chrome";
import { AdSlot } from "@/components/ad-slot";
import { news } from "@/lib/football-data";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title: "Football News & Match Reports — Football Live TV" },
      {
        name: "description",
        content:
          "Breaking football news, match reports and previews from the Premier League, LaLiga, Serie A and Champions League.",
      },
      { property: "og:title", content: "Football News & Match Reports — Football Live TV" },
      {
        property: "og:description",
        content: "The latest football headlines, reports and previews updated through the day.",
      },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  return (
    <Page title="News" subtitle="Headlines from today's football">
      {news.map((n, i) => (
        <div key={n.id}>
          <article className="rounded-2xl bg-card p-4 shadow-card ring-1 ring-border">
            <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {n.tag}
            </span>
            <h2 className="mt-2.5 text-base font-semibold leading-snug">{n.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{n.summary}</p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {n.minutesAgo < 60
                ? `${n.minutesAgo} min ago`
                : `${Math.round(n.minutesAgo / 60)} h ago`}
              <span>·</span>
              {n.source}
            </div>
          </article>
          {i === 1 && <AdSlot className="mt-4" />}
        </div>
      ))}
    </Page>
  );
}
