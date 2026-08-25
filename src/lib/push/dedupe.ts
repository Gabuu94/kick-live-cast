/**
 * Deduplication + throttling for match-event alerts.
 *
 * The same underlying event reaches us more than once: the live feed polls,
 * the sender retries, several devices belong to the same user, and a goal can
 * be re-emitted after a VAR check. Without a ledger the user gets the same
 * "GOAL!" three times.
 *
 * Two independent guards, both applied by `shouldDeliver`:
 *   1. dedupe   — an identical event key is delivered exactly once (per TTL).
 *   2. throttle — at most N alerts per match per rolling window, and a minimum
 *                 gap between any two alerts for the same match.
 *
 * The logic is pure so the identical rules run on the server (before an FCM
 * fan-out) and on the client (before a local notification is raised).
 */

export type PushEventType = "goal" | "fullTime" | "kickoff" | "redCard" | "penalty";

export interface PushEvent {
  matchId: string;
  type: PushEventType;
  /** Monotonic revision of the event from the feed (minute, score, VAR pass). */
  signature: string;
  /** Epoch ms. Defaults to now. */
  at?: number;
}

export interface ThrottleConfig {
  /** How long a delivered key blocks re-delivery. */
  dedupeTtlMs: number;
  /** Minimum gap between two alerts for the same match. */
  minGapMs: number;
  /** Rolling window used for the burst cap. */
  windowMs: number;
  /** Max alerts per match inside `windowMs`. */
  maxPerWindow: number;
}

export const DEFAULT_THROTTLE: ThrottleConfig = {
  dedupeTtlMs: 6 * 60 * 60 * 1000, // a match plus extra time and then some
  minGapMs: 20_000,
  windowMs: 10 * 60 * 1000,
  maxPerWindow: 6,
};

/** Full-time and kick-off must never be dropped by the burst cap. */
const PRIORITY_TYPES: ReadonlySet<PushEventType> = new Set(["fullTime", "kickoff"]);

export function eventKey(event: PushEvent): string {
  return `${event.matchId}|${event.type}|${event.signature}`;
}

export interface LedgerEntry {
  /** Delivered event keys -> expiry epoch ms. */
  keys: Map<string, number>;
  /** Delivery timestamps per match, newest last. */
  history: Map<string, number[]>;
}

export function createLedger(): LedgerEntry {
  return { keys: new Map(), history: new Map() };
}

export type DecisionReason = "ok" | "duplicate" | "too-soon" | "rate-limited";

export interface Decision {
  deliver: boolean;
  reason: DecisionReason;
}

/**
 * Decides whether an event should produce a notification and, when it should,
 * records it in the ledger. Call once per (device, event).
 */
export function shouldDeliver(
  ledger: LedgerEntry,
  event: PushEvent,
  config: ThrottleConfig = DEFAULT_THROTTLE,
): Decision {
  const now = event.at ?? Date.now();
  prune(ledger, now, config);

  const key = eventKey(event);
  if (ledger.keys.has(key)) return { deliver: false, reason: "duplicate" };

  const history = ledger.history.get(event.matchId) ?? [];
  const priority = PRIORITY_TYPES.has(event.type);

  if (!priority) {
    const last = history.at(-1);
    if (last !== undefined && now - last < config.minGapMs) {
      return { deliver: false, reason: "too-soon" };
    }
    const inWindow = history.filter((t) => now - t < config.windowMs).length;
    if (inWindow >= config.maxPerWindow) {
      return { deliver: false, reason: "rate-limited" };
    }
  }

  ledger.keys.set(key, now + config.dedupeTtlMs);
  ledger.history.set(event.matchId, [...history, now]);
  return { deliver: true, reason: "ok" };
}

function prune(ledger: LedgerEntry, now: number, config: ThrottleConfig) {
  for (const [key, expires] of ledger.keys) {
    if (expires <= now) ledger.keys.delete(key);
  }
  for (const [matchId, stamps] of ledger.history) {
    const kept = stamps.filter((t) => now - t < config.windowMs * 2);
    if (kept.length === 0) ledger.history.delete(matchId);
    else ledger.history.set(matchId, kept);
  }
}

/* ------------------------------------------------------------------ */
/* Browser-backed ledger (survives reloads / app restarts)             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "footballlivetv:push-ledger";

export function loadLedger(): LedgerEntry {
  if (typeof window === "undefined") return createLedger();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createLedger();
    const parsed = JSON.parse(raw) as {
      keys: [string, number][];
      history: [string, number[]][];
    };
    return {
      keys: new Map(parsed.keys ?? []),
      history: new Map(parsed.history ?? []),
    };
  } catch {
    return createLedger();
  }
}

export function saveLedger(ledger: LedgerEntry) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        keys: [...ledger.keys.entries()],
        history: [...ledger.history.entries()],
      }),
    );
  } catch {
    /* ignore */
  }
}
