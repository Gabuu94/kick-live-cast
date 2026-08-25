import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Score-feed webhook -> FCM fan-out.
 *
 * POST /api/public/push/events
 * Header: x-push-secret: <PUSH_FEED_SECRET>
 *
 * Body: a match event from your live-score provider (or your own poller).
 * The handler resolves which registered devices follow the match, applies the
 * shared dedupe/throttle rules per device, and sends one collapsible FCM
 * message carrying the deep link to the match screen.
 */

const eventSchema = z.object({
  matchId: z.string().min(1).max(64),
  leagueId: z.string().min(1).max(64),
  homeTeamId: z.string().min(1).max(64),
  awayTeamId: z.string().min(1).max(64),
  homeShort: z.string().min(1).max(8),
  awayShort: z.string().min(1).max(8),
  type: z.enum(["goal", "fullTime", "kickoff", "redCard", "penalty"]),
  /** Feed revision for this exact event: minute+scorer, final score, etc. */
  signature: z.string().min(1).max(128),
  homeScore: z.number().int().min(0).max(99).optional(),
  awayScore: z.number().int().min(0).max(99).optional(),
  minute: z.number().int().min(0).max(130).optional(),
  player: z.string().min(1).max(80).optional(),
  minutesToKickoff: z.number().int().min(0).max(240).optional(),
});

type MatchEventPayload = z.infer<typeof eventSchema>;

function compose(e: MatchEventPayload): { title: string; body: string } {
  const score = `${e.homeShort} ${e.homeScore ?? 0}-${e.awayScore ?? 0} ${e.awayShort}`;
  switch (e.type) {
    case "goal":
      return {
        title: `GOAL! ${score}`,
        body: e.player ? `${e.player} ${e.minute ?? ""}'`.trim() : `${e.minute ?? ""}'`.trim(),
      };
    case "penalty":
      return { title: `Penalty — ${score}`, body: `${e.minute ?? ""}'`.trim() };
    case "redCard":
      return { title: `Red card — ${score}`, body: e.player ?? `${e.minute ?? ""}'`.trim() };
    case "fullTime":
      return { title: `Full time: ${score}`, body: "Tap for stats and highlights" };
    case "kickoff":
    default:
      return {
        title: `${e.homeShort} vs ${e.awayShort} kicks off soon`,
        body: `Starts in ${e.minutesToKickoff ?? 15} min`,
      };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/push/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_FEED_SECRET"];
        if (!secret) {
          return Response.json({ error: "sender not configured" }, { status: 503 });
        }
        const provided = request.headers.get("x-push-secret") ?? "";
        if (!timingSafeEqual(provided, secret)) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }

        let parsed: MatchEventPayload;
        try {
          parsed = eventSchema.parse(await request.json());
        } catch {
          return Response.json({ error: "invalid payload" }, { status: 400 });
        }

        const { selectRecipients, removeByToken } = await import(
          "@/lib/push/registry.server"
        );
        const { sendPushBatch, fcmConfigured } = await import("@/lib/push/fcm.server");

        const target = {
          leagueId: parsed.leagueId,
          homeTeamId: parsed.homeTeamId,
          awayTeamId: parsed.awayTeamId,
        };
        const recipients = selectRecipients(target, {
          matchId: parsed.matchId,
          type: parsed.type,
          signature: parsed.signature,
        });

        if (recipients.length === 0) {
          return Response.json({ ok: true, matched: 0, sent: 0, suppressed: true });
        }
        if (!fcmConfigured()) {
          return Response.json(
            { error: "FCM_SERVICE_ACCOUNT_JSON missing", matched: recipients.length },
            { status: 503 },
          );
        }

        const { title, body } = compose(parsed);
        // One collapse key per match+type: an undelivered goal alert is replaced
        // by the newer one instead of stacking on the lock screen.
        const collapseKey = `${parsed.matchId}-${parsed.type}`;
        const link = `footylive://match/${parsed.matchId}`;

        const results = await sendPushBatch(
          recipients.map(({ device }) => ({
            token: device.token,
            title,
            body,
            link,
            collapseKey,
            data: {
              matchId: parsed.matchId,
              eventType: parsed.type,
              signature: parsed.signature,
            },
          })),
        );

        for (const r of results) if (r.unregistered) removeByToken(r.token);

        return Response.json({
          ok: true,
          matched: recipients.length,
          sent: results.filter((r) => r.ok).length,
          failed: results.filter((r) => !r.ok).length,
        });
      },
    },
  },
});
