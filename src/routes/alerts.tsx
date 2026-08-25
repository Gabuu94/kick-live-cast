import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, Clock } from "lucide-react";
import { Page } from "@/components/app-chrome";
import { Switch } from "@/components/ui/switch";
import { useAlerts } from "@/lib/native/use-alerts";
import { useFavorites } from "@/lib/favorites";
import { matchesForTeams } from "@/lib/native/notifications";
import { formatDay, formatKickoff } from "@/lib/football-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Match Alerts & Notifications — Football Live TV" },
      {
        name: "description",
        content:
          "Turn on kick-off reminders, goal alerts and full-time notifications for the clubs you follow.",
      },
      { property: "og:title", content: "Match Alerts & Notifications — Football Live TV" },
      {
        property: "og:description",
        content: "Choose which football notifications you get and how early you're reminded.",
      },
    ],
  }),
  component: AlertsPage,
});

const LEAD_OPTIONS = [5, 15, 30, 60];

function AlertsPage() {
  const { prefs, setPref, permission, enable, sendTestAlert } = useAlerts();
  const { favorites } = useFavorites();
  const granted = permission === "granted";

  const upcoming = matchesForTeams(favorites)
    .filter((m) => m.status === "upcoming")
    .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());

  return (
    <Page title="Alerts" subtitle="Notifications for the clubs you follow">
      <section
        className={cn(
          "rounded-2xl p-4 ring-1",
          granted ? "bg-primary/10 ring-primary" : "bg-card ring-border",
        )}
      >
        <div className="flex items-start gap-3">
          {granted ? (
            <Bell className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          ) : (
            <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">
              {granted
                ? "Notifications are on"
                : permission === "denied"
                  ? "Notifications are blocked"
                  : permission === "unsupported"
                    ? "Not supported in this browser"
                    : "Turn on notifications"}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {granted
                ? "You'll be alerted before kick-off and when your teams score."
                : permission === "denied"
                  ? "Allow notifications for Football Live TV in your device settings, then come back."
                  : "Allow notifications so we can ping you about kick-offs and goals."}
            </p>
            {!granted && permission !== "unsupported" && (
              <button
                onClick={() => void enable()}
                className="mt-3 rounded-full bg-gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
              >
                Allow notifications
              </button>
            )}
            {granted && (
              <button
                onClick={() => void sendTestAlert()}
                className="mt-3 rounded-full bg-surface-2 px-4 py-2 text-xs font-semibold"
              >
                Send test alert
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        <ToggleRow
          title="Kick-off reminders"
          desc="Before your teams' matches start"
          checked={prefs.kickoff}
          onChange={(v) => setPref("kickoff", v)}
        />
        <ToggleRow
          title="Goal alerts"
          desc="Every goal in your teams' live matches"
          checked={prefs.goals}
          onChange={(v) => setPref("goals", v)}
        />
        <ToggleRow
          title="Full-time results"
          desc="Final score when the match ends"
          checked={prefs.fullTime}
          onChange={(v) => setPref("fullTime", v)}
        />
      </section>

      <Link
        to="/settings"
        className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Per-league & per-club rules</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Different lead times and alert types for each competition or club.
          </p>
        </div>
        <span className="shrink-0 text-xs font-bold text-primary">Open</span>
      </Link>



      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
          Remind me
        </h2>
        <div className="mt-3 flex gap-2">
          {LEAD_OPTIONS.map((min) => (
            <button
              key={min}
              onClick={() => setPref("kickoffMinutesBefore", min)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-semibold transition-colors",
                prefs.kickoffMinutesBefore === min
                  ? "bg-gradient-primary text-primary-foreground shadow-glow"
                  : "bg-surface-2 text-muted-foreground",
              )}
            >
              {min} min
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
          Scheduled reminders
        </h2>
        {favorites.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Follow a club on{" "}
            <Link to="/favorites" className="font-semibold text-primary">
              Favourites
            </Link>{" "}
            to start getting alerts.
          </p>
        ) : upcoming.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No upcoming matches for your clubs right now.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {upcoming.map((m) => (
              <li key={m.id} className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {m.home.short} vs {m.away.short}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDay(m.kickoff)} {formatKickoff(m.kickoff)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Page>
  );
}

function ToggleRow({
  title,
  desc,
  checked,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
