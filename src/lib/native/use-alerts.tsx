import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFavorites } from "@/lib/favorites";
import { liveMatches } from "@/lib/football-data";
import {
  DEFAULT_PREFS,
  checkPermission,
  loadPrefs,
  notifyNow,
  registerPushListeners,
  requestPermission,
  savePrefs,
  syncKickoffAlerts,
  type AlertPrefs,
  type PermissionState,
} from "./notifications";

interface AlertsValue {
  prefs: AlertPrefs;
  setPref: <K extends keyof AlertPrefs>(key: K, value: AlertPrefs[K]) => void;
  permission: PermissionState;
  enable: () => Promise<void>;
  scheduled: number;
  sendTestAlert: () => Promise<void>;
}

const AlertsContext = createContext<AlertsValue>({
  prefs: DEFAULT_PREFS,
  setPref: () => {},
  permission: "prompt",
  enable: async () => {},
  scheduled: 0,
  sendTestAlert: async () => {},
});

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { favorites } = useFavorites();
  const [prefs, setPrefs] = useState<AlertPrefs>(DEFAULT_PREFS);
  const [permission, setPermission] = useState<PermissionState>("prompt");
  const [scheduled, setScheduled] = useState(0);
  const notifiedGoals = useRef<Set<string>>(new Set());

  useEffect(() => {
    setPrefs(loadPrefs());
    checkPermission().then(setPermission).catch(() => setPermission("unsupported"));
    registerPushListeners().catch(() => {});
  }, []);

  // Re-schedule kick-off reminders whenever followed teams or prefs change.
  useEffect(() => {
    if (permission !== "granted") return;
    syncKickoffAlerts(favorites, prefs)
      .then(setScheduled)
      .catch((err) => console.warn("Could not schedule alerts", err));
  }, [favorites, prefs, permission]);

  // Live-match alerts for followed teams (goal / full-time).
  useEffect(() => {
    if (permission !== "granted" || !prefs.goals) return;
    const tick = () => {
      for (const m of liveMatches()) {
        if (!favorites.includes(m.home.id) && !favorites.includes(m.away.id)) continue;
        const last = m.events.filter((e) => e.type === "goal").at(-1);
        if (!last) continue;
        const key = `${m.id}:${last.minute}:${last.player}`;
        if (notifiedGoals.current.has(key)) continue;
        notifiedGoals.current.add(key);
        void notifyNow(
          `GOAL! ${m.home.short} ${m.homeScore}-${m.awayScore} ${m.away.short}`,
          `${last.player} ${last.minute}'`,
          m.id,
        );
      }
    };
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [favorites, permission, prefs.goals]);

  const setPref = useCallback<AlertsValue["setPref"]>((key, value) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      savePrefs(next);
      return next;
    });
  }, []);

  const enable = useCallback(async () => {
    const state = await requestPermission();
    setPermission(state);
  }, []);

  const sendTestAlert = useCallback(async () => {
    await notifyNow("FootyLive alerts are on", "You'll be pinged before your teams kick off.");
  }, []);

  return (
    <AlertsContext.Provider
      value={{ prefs, setPref, permission, enable, scheduled, sendTestAlert }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export const useAlerts = () => useContext(AlertsContext);
