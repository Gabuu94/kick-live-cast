import { queryOptions, useQuery } from "@tanstack/react-query";
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
 *
 * The query options are shared with route loaders so the first paint is
 * server-rendered with real fixtures instead of a loading message.
 */

export const matchesQueryOptions = () =>
  queryOptions({
    queryKey: ["matches"],
    queryFn: () => listMatches(),
    refetchInterval: 15_000,
    staleTime: 8_000,
  });

export const matchQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["match", id],
    queryFn: () => getMatchById({ data: { id } }),
    refetchInterval: 15_000,
    staleTime: 8_000,
  });

export const standingsQueryOptions = (leagueId: string) =>
  queryOptions({
    queryKey: ["standings", leagueId],
    queryFn: () => getStandings({ data: { leagueId } }),
    staleTime: 5 * 60_000,
  });

export function useMatches() {
  const q = useQuery(matchesQueryOptions());

  const data: Match[] = q.data && q.data.length > 0 ? q.data : q.isError ? demoMatches : [];
  return { ...q, matches: data, isLive: Boolean(q.data && q.data.length > 0) };
}

export function useMatch(id: string) {
  const q = useQuery(matchQueryOptions(id));

  const fallback = demoMatches.find((m) => m.id === id) ?? null;
  return { ...q, match: (q.data ?? (q.isError ? fallback : null)) as Match | null };
}

export function useStandings(leagueId: string) {
  const q = useQuery(standingsQueryOptions(leagueId));

  const rows: StandingRow[] =
    q.data && q.data.length > 0 ? q.data : q.isError ? (demoStandings[leagueId] ?? []) : [];
  return { ...q, rows };
}
