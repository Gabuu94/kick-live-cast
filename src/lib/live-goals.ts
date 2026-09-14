import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useMatches } from "@/lib/use-football";
import { useFavorites } from "@/lib/favorites";
import { notifyNow } from "@/lib/native/notifications";

/**
 * Watches the live poll and reacts the instant a score changes: a toast in the
 * app, and a push-style notification (which deep-links to the match) when the
 * goal involves a club you follow.
 */
export function useGoalWatcher() {
  const { matches } = useMatches();
  const { favorites } = useFavorites();
  const seen = useRef<Map<string, string>>(new Map());
  const primed = useRef(false);

  useEffect(() => {
    if (matches.length === 0) return;

    const next = new Map<string, string>();
    for (const m of matches) {
      if (m.status !== "live") continue;
      next.set(m.id, `${m.homeScore}-${m.awayScore}`);
    }

    // First pass just records the current state: no alerts for goals that
    // happened before the app opened.
    if (!primed.current) {
      seen.current = next;
      primed.current = true;
      return;
    }

    for (const [id, score] of next) {
      const before = seen.current.get(id);
      if (!before || before === score) continue;

      const m = matches.find((x) => x.id === id);
      if (!m) continue;

      const followed = favorites.includes(m.home.id) || favorites.includes(m.away.id);
      const line = `${m.home.name} ${m.homeScore} - ${m.awayScore} ${m.away.name}`;

      toast.success("Goal!", { description: line });
      if (followed) void notifyNow("⚽ Goal!", line, m.id);

      window.dispatchEvent(new CustomEvent("fltv:goal", { detail: { matchId: id } }));
    }

    seen.current = next;
  }, [matches, favorites]);
}
