import { isNative } from "./platform";
import { matches, type Match } from "@/lib/football-data";

export type PermissionState = "granted" | "denied" | "prompt" | "unsupported";

export interface AlertPrefs {
  kickoff: boolean;
  kickoffMinutesBefore: number;
  goals: boolean;
  fullTime: boolean;
}

export const DEFAULT_PREFS: AlertPrefs = {
  kickoff: true,
  kickoffMinutesBefore: 15,
  goals: true,
  fullTime: true,
};

export const PREFS_KEY = "footylive:alerts";

export function loadPrefs(): AlertPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS;
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: AlertPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

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
    // Remote pushes (score alerts sent from a server) need the push plugin too.
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
/* Device token (for server-sent live score pushes)                    */
/* ------------------------------------------------------------------ */

export async function registerPushListeners(onToken?: (token: string) => void) {
  if (!isNative()) return;
  const { PushNotifications } = await import("@capacitor/push-notifications");
  await PushNotifications.removeAllListeners();
  await PushNotifications.addListener("registration", (t) => {
    console.info("Push token", t.value);
    onToken?.(t.value);
  });
  await PushNotifications.addListener("registrationError", (e) =>
    console.warn("Push registration error", e),
  );
}

/* ------------------------------------------------------------------ */
/* Kick-off reminders (scheduled on-device, no server required)        */
/* ------------------------------------------------------------------ */

const idFor = (matchId: string) =>
  Math.abs([...matchId].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % 2147483ofFix;

// keep ids inside the 32-bit range Android requires
function notificationId(matchId: string) {
  let h = 7;
  for (const c of matchId) h = (h * 31 + c.charCodeAt(0)) | 0;
  return Math.abs(h) % 2_000_000;
}

export function matchesForTeams(teamIds: string[]): Match[] {
  return matches.filter(
    (m) => teamIds.includes(m.home.id) || teamIds.includes(m.away.id),
  );
}

/**
 * Cancels previous reminders and re-schedules kick-off alerts for every
 * upcoming match involving a followed team.
 */
export async function syncKickoffAlerts(favorites: string[], prefs: AlertPrefs) {
  if (!isNative()) return 0;
  const { LocalNotifications } = await import("@capacitor/local-notifications");

  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length) {
    await LocalNotifications.cancel({ notifications: pending.notifications });
  }
  if (!prefs.kickoff || favorites.length === 0) return 0;

  const upcoming = matchesForTeams(favorites).filter(
    (m) => m.status === "upcoming" && new Date(m.kickoff).getTime() > Date.now(),
  );

  const toSchedule = upcoming
    .map((m) => {
      const at = new Date(new Date(m.kickoff).getTime() - prefs.kickoffMinutesBefore * 60_000);
      if (at.getTime() <= Date.now()) return null;
      return {
        id: notificationId(m.id),
        title: `${m.home.short} vs ${m.away.short} kicks off soon`,
        body: `Starts in ${prefs.kickoffMinutesBefore} min · ${m.channels[0] ?? m.venue}`,
        schedule: { at },
        extra: { matchId: m.id },
      };
    })
    .filter(Boolean) as Parameters<typeof LocalNotifications.schedule>[0]["notifications"];

  if (toSchedule.length) await LocalNotifications.schedule({ notifications: toSchedule });
  return toSchedule.length;
}

/** Fires an immediate alert (used for live goal / full-time events). */
export async function notifyNow(title: string, body: string, matchId?: string) {
  if (isNative()) {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 2_000_000),
          title,
          body,
          extra: matchId ? { matchId } : undefined,
        },
      ],
    });
    return;
  }
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/favicon.ico" });
  }
}
