import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMatchById, getStandings, listMatches } from "@/lib/football.functions";
import {
  matches as demoMatches,
  standings as demoStandings,
  type Match,
  type StandingRow,
} from "@/lib/football-data";

/**
 * Live data from SportMonks, with the bundled demo set as an offline fallback
 * so the app never renders an empty screen if the feed is unreachable.
 */

export function useMatches() {
  const fn = useServerFn(listMatches);
  const q = useQuery({
    queryKey: ["matches"],
    queryFn: () => fn(),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const data: Match[] = q.data && q.data.length > 0 ? q.data : q.isError ? demoMatches : [];
  return { ...q, matches: data, isLive: Boolean(q.data && q.data.length > 0) };
}

export function useMatch(id: string) {
  const fn = useServerFn(getMatchById);
  const q = useQuery({
    queryKey: ["match", id],
    queryFn: () => fn({ data: { id } }),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const fallback = demoMatches.find((m) => m.id === id) ?? null;
  return { ...q, match: (q.data ?? (q.isError ? fallback : null)) as Match | null };
}

export function useStandings(leagueId: string) {
  const fn = useServerFn(getStandings);
  const q = useQuery({
    queryKey: ["standings", leagueId],
    queryFn: () => fn({ data: { leagueId } }),
    staleTime: 5 * 60_000,
  });

  const rows: StandingRow[] =
    q.data && q.data.length > 0 ? q.data : q.isError ? (demoStandings[leagueId] ?? []) : [];
  return { ...q, rows };
}
