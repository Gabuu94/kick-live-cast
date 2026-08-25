import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "@tanstack/react-router";
import { useFavorites } from "@/lib/favorites";
import { liveMatches, finishedMatches } from "@/lib/football-data";
import {
  DEFAULT_PREFS,
  setOverride as applyOverride,
  type AlertPrefs,
  type ScopeKey,
  type PartialScopePrefs,
} from "@/lib/push/prefs";
import {
  allowAlert,
  alertEnabledFor,
  checkPermission,
  dropDeviceRegistration,
  loadPrefs,
  matchIdFromUrl,
  notifyNow,
  registerPushListeners,
  requestPermission,
  savePrefs,
  storedPushToken,
  syncDeviceRegistration,
  syncKickoffAlerts,
  type PermissionState,
} from "./notifications";

interface AlertsValue {
  prefs: AlertPrefs;
  setPref: <K extends keyof AlertPrefs>(key: K, value: AlertPrefs[K]) => void;
  setOverride: (scope: ScopeKey, patch: PartialScopePrefs | null) => void;
  permission: PermissionState;
  enable: () => Promise<void>;
  scheduled: number;
  pushRegistered: boolean;
  sendTestAlert: () => Promise<void>;
}

const AlertsContext = createContext<AlertsValue>({
  prefs: DEFAULT_PREFS,
  setPref: () => {},
  setOverride: () => {},
  permission: "prompt",
  enable: async () => {},
  scheduled: 0,
  pushRegistered: false,
  sendTestAlert: async () => {},
});

export function AlertsProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { favorites } = useFavorites();
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_PREFS);
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [scheduled, setScheduled] = useState(0);
  const [pushRegistered, setPushRegistered] = useState(false);

  const openMatch = useCallback(
    (matchId: string) => {
      void router.navigate({ to: "/match/$matchId", params: { matchId } });
    },
    [router],
  );

  useEffect(() => {
    setPrefs(loadPrefs());
    checkPermission().then(setPermission).catch(() => setPermission("unsupported"));
    setPushRegistered(Boolean(storedPushToken()));

    registerPushListeners({
      onToken: () => setPushRegistered(true),
      onOpenMatch: openMatch,
    }).catch(() => {});

    // Web deep link: /match/<id> reached through a ?match= query on any page.
    if (typeof window !== "undefined") {
      const fromQuery = new URLSearchParams(window.location.search).get("match");
      const id = fromQuery ?? matchIdFromUrl(window.location.href);
      if (fromQuery && id) openMatch(id);
    }
  }, [openMatch]);

  // Re-schedule kick-off reminders whenever followed teams or prefs change.
  useEffect(() => {
    if (permission !== "granted") return;
    syncKickoffAlerts(favorites, prefs)
      .then(setScheduled)
      .catch((err) => console.warn("Could not schedule alerts", err));
  }, [favorites, prefs, permission]);

  // Keep the FCM sender's view of this device in sync (token, clubs, prefs).
  useEffect(() => {
    if (permission !== "granted" || !pushRegistered) return;
    const id = window.setTimeout(() => {
      void syncDeviceRegistration(favorites, prefs);
    }, 400);
    return () => window.clearTimeout(id);
  }, [favorites, prefs, permission, pushRegistered]);

  useEffect(() => {
    if (prefs.muteAll && pushRegistered) void dropDeviceRegistration();
  }, [prefs.muteAll, pushRegistered]);

  // In-app fallback alerts for followed teams (goal / full-time).
  // Every alert passes the same dedupe + throttle ledger the server uses, so a
  // push and the in-app ticker can never double-notify for one event.
  useEffect(() => {
    if (permission !== "granted" || prefs.muteAll) return;

    const tick = () => {
      for (const m of liveMatches()) {
        if (!favorites.includes(m.home.id) && !favorites.includes(m.away.id)) continue;
        if (!alertEnabledFor(prefs, m.id, "goals")) continue;
        const last = m.events.filter((e) => e.type === "goal").at(-1);
        if (!last) continue;
        const signature = `${last.minute}-${last.player}-${m.homeScore}:${m.awayScore}`;
        if (!allowAlert({ matchId: m.id, type: "goal", signature })) continue;
        void notifyNow(
          `GOAL! ${m.home.short} ${m.homeScore}-${m.awayScore} ${m.away.short}`,
          `${last.player} ${last.minute}'`,
          m.id,
        );
      }

      for (const m of finishedMatches()) {
        if (!favorites.includes(m.home.id) && !favorites.includes(m.away.id)) continue;
        if (!alertEnabledFor(prefs, m.id, "fullTime")) continue;
        const signature = `ft-${m.homeScore}:${m.awayScore}`;
        if (!allowAlert({ matchId: m.id, type: "fullTime", signature })) continue;
        void notifyNow(
          `Full time: ${m.home.short} ${m.homeScore}-${m.awayScore} ${m.away.short}`,
          "Tap for stats and highlights",
          m.id,
        );
      }
    };

    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [favorites, permission, prefs]);

  const setPref = useCallback<AlertsValue["setPref"]>((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      return next;
    });
  }, []);

  const setOverride = useCallback<AlertsValue["setOverride"]>((scope, patch) => {
    setPrefs((prev) => {
      const next = applyOverride(prev, scope, patch);
      savePrefs(next);
      return next;
    });
  }, []);

  const enable = useCallback(async () => {
    const state = await requestPermission();
    setPermission(state);
    if (state === "granted") {
      window.setTimeout(() => setPushRegistered(Boolean(storedPushToken())), 1500);
    }
  }, []);

  const sendTestAlert = useCallback(async () => {
    await notifyNow("Football Live TV alerts are on", "You'll be pinged before your teams kick off.");
  }, []);

  return (
    <AlertsContext.Provider
      value={{
        prefs,
        setPref,
        setOverride,
        permission,
        enable,
        scheduled,
        pushRegistered,
        sendTestAlert,
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertsContext);
