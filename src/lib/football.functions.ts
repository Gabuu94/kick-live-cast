import { createServerFn } from "@tanstack/react-start";

/**
 * Public (unauthenticated) reads of live football data.
 * The SportMonks token stays on the server; the browser only sees mapped data.
 */

export const listMatches = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchMatches } = await import("@/lib/sportmonks.server");
  return fetchMatches();
});

export const getMatchById = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const id = typeof data === "string" ? data : (data as { id?: string })?.id;
    if (!id) throw new Error("match id is required");
    return { id };
  })
  .handler(async ({ data }) => {
    const { fetchMatch } = await import("@/lib/sportmonks.server");
    return fetchMatch(data.id);
  });

export const getStandings = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const leagueId = typeof data === "string" ? data : (data as { leagueId?: string })?.leagueId;
    if (!leagueId) throw new Error("league id is required");
    return { leagueId };
  })
  .handler(async ({ data }) => {
    const { fetchStandings } = await import("@/lib/sportmonks.server");
    return fetchStandings(data.leagueId);
  });
