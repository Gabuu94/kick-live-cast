import { createFileRoute, Link } from "@tanstack/react-router";
import { Radio, ShieldCheck } from "lucide-react";
import { Page } from "@/components/app-chrome";
import { AdSlot } from "@/components/ad-slot";
import { MatchCard } from "@/components/match-card";
import { AdGate } from "@/components/ad-gate";
import { CastPanel, WatchableSourceList, useRegion } from "@/components/stream-player";
import { REGIONS, regionName, setRegion, sourcesForRegion } from "@/lib/streams";
import { matches } from "@/lib/football-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/watch")({
  head: () => {
    const title = "Watch Football Free — Live Streams & TV Guide";
    const description =
      "Free legal live football streams and the official broadcaster for every match, filtered to your country.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: WatchPage,
});

function WatchPage() {
  const region = useRegion();
  const sources = sourcesForRegion(region);
  const free = sources.filter((s) => s.regions.includes(region) && region !== "*");
  const worldwide = sources.filter((s) => !free.includes(s));
  const live = matches.filter((m) => m.status === "live");

  return (
    <Page title="Watch" subtitle={region === "*" ? "Free, legal live football wherever you are" : `Free, legal live football in ${regionName(region)}`}>
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
          Your country
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Rights differ everywhere — pick yours so we only show what you can actually watch.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {REGIONS.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => setRegion(r.code)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                r.code === region
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-surface-2 text-muted-foreground",
              )}
            >
              {r.flag} {r.name}
            </button>
          ))}
        </div>
      </section>

      {live.length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-live">
            <Radio className="h-4 w-4" /> Live now
          </h2>
          <div className="mt-3 space-y-3">
            {live.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      <CastPanel region={region} />

      <AdSlot />

      {free.length > 0 && (
        <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
            Free in {regionName(region)}
          </h2>
          <WatchableSourceList sources={free} className="mt-3" />
        </section>
      )}

      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
          Free worldwide
        </h2>
        <WatchableSourceList sources={worldwide} className="mt-3" />
      </section>

      <section className="rounded-2xl bg-surface-2/60 p-4 text-xs leading-relaxed text-muted-foreground ring-1 ring-border">
        <p className="flex items-center gap-1.5 font-semibold text-foreground">
          <ShieldCheck className="h-4 w-4 text-primary" /> How streaming works here
        </p>
        <p className="mt-2">
          Every source above is a rights holder's own free service. Football Live TV never hosts,
          proxies or rebroadcasts a match — you're handed straight to the broadcaster, so the
          picture, the ads and the terms are theirs.
        </p>
        <p className="mt-2">
          Not every game is free everywhere. When a match is behind a paid broadcaster we show you
          who has it instead of pretending otherwise. See our{" "}
          <Link to="/terms" className="text-primary underline">
            Terms
          </Link>{" "}
          for the full position.
        </p>
      </section>
    </Page>
  );
}
