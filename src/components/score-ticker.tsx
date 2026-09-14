import { Link } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { useMatches } from "@/lib/use-football";

/**
 * Slim live-score strip under the header. Hidden when nothing is in play.
 * Scores come from the same 15-second poll the rest of the app uses.
 */
export function ScoreTicker() {
  const { matches } = useMatches();
  const live = matches.filter((m) => m.status === "live");

  if (live.length === 0) return null;

  const row = [...live, ...live]; // duplicated so the marquee loops seamlessly

  return (
    <div className="sticky top-14 z-20 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-2 py-1.5">
        <span className="live-dot flex shrink-0 items-center gap-1 rounded-full bg-live/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-live">
          <Radio className="h-3 w-3" /> Live
        </span>
        <div className="ticker-mask min-w-0 flex-1 overflow-hidden">
          <div className="ticker-track flex w-max items-center gap-4">
            {row.map((m, i) => (
              <Link
                key={`${m.id}-${i}`}
                to="/match/$matchId"
                params={{ matchId: m.id }}
                className="flex shrink-0 items-center gap-1.5 text-xs"
              >
                <span className="font-semibold">{m.home.short}</span>
                <span className="font-display font-bold tabular-nums text-primary">
                  {m.homeScore}-{m.awayScore}
                </span>
                <span className="font-semibold">{m.away.short}</span>
                <span className="text-[10px] text-muted-foreground">{m.minute}'</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
