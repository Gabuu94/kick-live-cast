import { isNative, nativePlatform } from "./platform";
import { matches, getMatch, type Match } from "@/lib/football-data";
import {
  DEFAULT_PREFS,
  resolvePrefs,
  loadPrefs,
  savePrefs,
  type AlertPrefs,
  type ScopePrefs,
} from "@/lib/push/prefs";
import {
  loadLedger,
  saveLedger,
  shouldDeliver,
  type PushEvent,
} from "@/lib/push/dedupe";
import { registerDevice, unregisterDevice } from "@/lib/push.functions";

export type { AlertPrefs, ScopePrefs };
export { DEFAULT_PREFS, loadPrefs, savePrefs };

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export async function checkPermission(): Promise<PermissionState> {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.checkPermissions();
    return res.display === "granted" ? "granted" : res.display === "denied" ? "denied" : "prompt";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission === "default"
    ? "prompt"
    : (Notification.permission as PermissionState);
}

export async function requestPermission(): Promise<PermissionState> {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const res = await LocalNotifications.requestPermissions();
    if (res.display !== "granted") return "denied";
    try {
      const { PushNotifications } = await import("@capacitor/push-notifications");
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive === "granted") await PushNotifications.register();
    } catch (err) {
      console.warn("Push registration unavailable", err);
    }
    return "granted";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const res = await Notification.requestPermission();
  return res === "granted" ? "granted" : "denied";
}

/* ------------------------------------------------------------------ */
/* Device identity + backend registration                              */
/* ------------------------------------------------------------------ */

const DEVICE_KEY = "footballlivetv:device-id";
const TOKEN_KEY = "footballlivetv:push-token";

export function deviceId(): string {
  if (typeof window === "undefined") return "ssr-placeholder-device";
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = `dev_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function storedPushToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function storePushToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

/**
 * Publishes this device's token, followed clubs and preferences to the FCM
 * sender so it knows who to notify. Safe to call often — it is a no-op until a
 * push token exists (i.e. on native builds after permission is granted).
 */
export async function syncDeviceRegistration(favorites: string[], prefs: AlertPrefs) {
  const token = storedPushToken();
  if (!token) return { ok: false as const, reason: "no-token" as const };
  try {
    await registerDevice({
      data: {
        deviceId: deviceId(),
        token,
        platform: nativePlatform(),
        favorites,
        prefs,
      },
    });
    return { ok: true as const };
  } catch (err) {
    console.warn("Device registration failed", err);
    return { ok: false as const, reason: "error" as const };
  }
}

export async function dropDeviceRegistration() {
  try {
    await unregisterDevice({ data: { deviceId: deviceId() } });
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Push listeners + deep links                                         */
/* ------------------------------------------------------------------ */

/** Extracts a match id from a deep link, push payload or notification extras. */
export function matchIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const direct = data["matchId"];
  if (typeof direct === "string" && direct) return direct;
  const link = data["link"];
  if (typeof link === "string") return matchIdFromUrl(link);
  return null;
}

/** footballlivetv://match/m-101 or https://footballlivetv.app/match/m-101 */
export function matchIdFromUrl(url: string): string | null {
  const m = /(?:^|\/)match\/([A-Za-z0-9_-]+)/.exec(url);
  return m?.[1] ?? null;
}

export interface PushListenerOptions {
  onToken?: (token: string) => void;
  /** Called when the user taps an alert or opens a footballlivetv:// deep link. */
  onOpenMatch?: (matchId: string) => void;
}

export async function registerPushListeners(options: PushListenerOptions = {}) {
  if (!isNative()) return;

  const { LocalNotifications } = await import("@capacitor/local-notifications");
  await LocalNotifications.removeAllListeners();
  await LocalNotifications.addListener("localNotificationActionPerformed", (action) => {
    const id = matchIdFromPayload(action.notification.extra);
    if (id) options.onOpenMatch?.(id);
  });

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    await PushNotifications.removeAllListeners();
    await PushNotifications.addListener("registration", (t) => {
      storePushToken(t.value);
      options.onToken?.(t.value);
    });
    await PushNotifications.addListener("registrationError", (e) =>
      console.warn("Push registration error", e),
    );
    await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const id = matchIdFromPayload(action.notification.data);
      if (id) options.onOpenMatch?.(id);
    });
  } catch (err) {
    console.warn("Push plugin unavailable", err);
  }

  try {
    const { App } = await import("@capacitor/app");
    await App.removeAllListeners();
    await App.addListener("appUrlOpen", ({ url }) => {
      const id = matchIdFromUrl(url);
      if (id) options.onOpenMatch?.(id);
    });
  } catch (err) {
    console.warn("App plugin unavailable", err);
  }
}

/* ------------------------------------------------------------------ */
/* Kick-off reminders (scheduled on-device)                            */
/* ------------------------------------------------------------------ */

// keep ids inside the 32-bit range Android requires
function notificationId(matchId: string) {
  let h = 7;
  for (const c of matchId) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000;
}

export function matchesForTeams(teamIds: string[]): Match[] {
  return matches.filter((m) => teamIds.includes(m.home.id) || teamIds.includes(m.away.id));
}

function scopeTarget(m: Match) {
  return { leagueId: m.leagueId, homeTeamId: m.home.id, awayTeamId: m.away.id };
}

/** Effective preferences for one match, after league/club overrides. */
export function prefsForMatch(prefs: AlertPrefs, m: Match): ScopePrefs {
  return resolvePrefs(prefs, scopeTarget(m));
}

/**
 * Cancels previous reminders and re-schedules kick-off alerts for every
 * upcoming match involving a followed team, honouring per-league / per-club
 * lead times.
 */
export async function syncKickoffAlerts(favorites: string[], prefs: AlertPrefs) {
  if (!isNative()) return 0;
  const { LocalNotifications } = await import("@capacitor/local-notifications");

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
  if (prefs.muteAll || favorites.length === 0) return 0;

  const upcoming = matchesForTeams(favorites).filter(
    (m) => m.status === "upcoming" && new Date(m.kickoff).getTime() > Date.now(),
  );

  const toSchedule = upcoming
    .map((m) => {
      const effective = prefsForMatch(prefs, m);
      if (!effective.kickoff) return null;
      const at = new Date(
        new Date(m.kickoff).getTime() - effective.kickoffMinutesBefore * 60_000,
      );
      if (at.getTime() <= Date.now()) return null;
      return {
        id: notificationId(m.id),
        title: `${m.home.short} vs ${m.away.short} kicks off soon`,
        body: `Starts in ${effective.kickoffMinutesBefore} min · ${m.channels[0] ?? m.venue}`,
        schedule: { at },
        extra: { matchId: m.id, link: `footballlivetv://match/${m.id}` },
      };
    })
    .filter(Boolean) as Parameters<typeof LocalNotifications.schedule>[0]["notifications"];

  if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule });
  return toSchedule.length;
}

/* ------------------------------------------------------------------ */
/* Immediate alerts, guarded by the shared dedupe/throttle ledger       */
/* ------------------------------------------------------------------ */

/** Fires an immediate alert (used for live goal / full-time events). */
export async function notifyNow(title: string, body: string, matchId?: string) {
  const link = matchId ? `footballlivetv://match/${matchId}` : undefined;
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 2_000_000),
          title,
          body,
          extra: matchId ? { matchId, link } : undefined,
        },
      ],
    });
    return;
  }
  if (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    const n = new Notification(title, {
      body,
      icon: "/favicon.ico",
      ...(matchId ? { tag: matchId } : {}),
    });
    if (matchId) {
      n.onclick = () => {
        window.focus();
        window.location.assign(`/match/${matchId}`);
      };
    }
  }
}

/**
 * Client-side gate applied before raising a local alert. Uses exactly the same
 * rules as the server so a match event never fires twice even when both the
 * in-app ticker and an FCM push observe it.
 */
export function allowAlert(event: PushEvent): boolean {
  const ledger = loadLedger();
  const decision = shouldDeliver(ledger, event);
  if (decision.deliver) saveLedger(ledger);
  return decision.deliver;
}

/** Only alert for a match if the resolved per-league/club prefs allow it. */
export function alertEnabledFor(
  prefs: AlertPrefs,
  matchId: string,
  kind: "goals" | "fullTime" | "kickoff",
): boolean {
  if (prefs.muteAll) return false;
  const m = getMatch(matchId);
  if (!m) return false;
  return prefsForMatch(prefs, m)[kind] === true;
}
