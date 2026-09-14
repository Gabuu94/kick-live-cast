import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, Sparkles } from "lucide-react";
import { Page } from "@/components/app-chrome";
import { AdSlot } from "@/components/ad-slot";
import { AdGate } from "@/components/ad-gate";
import { TeamCrest } from "@/components/match-card";
import { useMatches } from "@/lib/use-football";
import { predict, type Prediction } from "@/lib/predict";
import { getLeague, formatDay, formatKickoff, type Match } from "@/lib/football-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/predict")({
  head: () => {
    const title = "Match Predictions — Football Live TV";
    const description =
      "Win probabilities, predicted scorelines, form and head-to-head insight for every upcoming football match.";
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
  component: PredictPage,
});

function FormPips({ form }: { form: ("W" | "D" | "L")[] }) {
  return (
    <span className="flex gap-1">
      {form.map((r, i) => (
        <span
          key={i}
          className={cn(
            "grid h-4 w-4 place-items-center rounded text-[9px] font-bold",
            r === "W"
              ? "bg-primary/20 text-primary"
              : r === "D"
                ? "bg-surface-2 text-muted-foreground"
                : "bg-live/20 text-live",
          )}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

function PredictionCard({ match, p }: { match: Match; p: Prediction }) {
  const league = getLeague(match.leagueId);

  return (
    <article className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="truncate">
          {league?.badge} {league?.name}
        </span>
        <span className="ml-auto shrink-0">
          {formatDay(match.kickoff)} · {formatKickoff(match.kickoff)}
        </span>
      </div>

      <Link
        to="/match/$matchId"
        params={{ matchId: match.id }}
        className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"
      >
        <span className="flex flex-col items-center gap-1.5 text-center">
          <TeamCrest team={match.home} size="sm" />
          <span className="text-xs font-semibold leading-tight">{match.home.name}</span>
        </span>
        <span className="font-display text-2xl font-bold tabular-nums text-primary">
          {p.scoreline}
        </span>
        <span className="flex flex-col items-center gap-1.5 text-center">
          <TeamCrest team={match.away} size="sm" />
          <span className="text-xs font-semibold leading-tight">{match.away.name}</span>
        </span>
      </Link>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-2">
        <span className="bg-primary" style={{ width: `${p.home}%` }} />
        <span className="bg-muted-foreground/50" style={{ width: `${p.draw}%` }} />
        <span className="bg-live/70" style={{ width: `${p.away}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] font-semibold tabular-nums">
        <span className="text-primary">{p.home}% home</span>
        <span className="text-muted-foreground">{p.draw}% draw</span>
        <span className="text-live">{p.away}% away</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            p.confidence === "High"
              ? "bg-primary/15 text-primary"
              : p.confidence === "Medium"
                ? "bg-surface-2 text-foreground"
                : "bg-surface-2 text-muted-foreground",
          )}
        >
          {p.confidence} confidence
        </span>
        <span className="text-[11px] text-muted-foreground">
          H2H {p.h2h.homeWins}-{p.h2h.draws}-{p.h2h.awayWins}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <FormPips form={p.formHome} />
        <span>Last 5</span>
        <FormPips form={p.formAway} />
      </div>

      <ul className="mt-3 space-y-1">
        {p.reasons.map((r) => (
          <li key={r} className="flex gap-2 text-xs text-muted-foreground">
            <span className="text-primary">•</span>
            {r}
          </li>
        ))}
      </ul>
    </article>
  );
}

function PredictPage() {
  const { matches, isPending } = useMatches();
  const upcoming = matches.filter((m) => m.status === "upcoming").slice(0, 20);

  return (
    <Page title="Predict" subtitle="Win chances and predicted scores for what's coming up">
      <AdGate kind="interstitial" label="Loading predictions…">
        <section className="flex items-start gap-2 rounded-2xl bg-surface-2/60 p-3 text-[11px] leading-relaxed text-muted-foreground ring-1 ring-border">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            These are statistical estimates from recent form, head-to-head records and home
            advantage. They are not betting advice and no outcome is guaranteed.
          </p>
        </section>

        {upcoming.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            {isPending ? "Working out the numbers…" : "No upcoming matches to predict right now."}
          </p>
        ) : (
          upcoming.map((m, i) => (
            <div key={m.id} className="space-y-4">
              <PredictionCard match={m} p={predict(m)} />
              {i > 0 && (i + 1) % 5 === 0 && <AdSlot />}
            </div>
          ))
        )}

        <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Updated as form and line-ups change
        </p>
      </AdGate>
    </Page>
  );
}
