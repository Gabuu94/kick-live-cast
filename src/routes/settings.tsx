import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, ChevronDown, Info, RotateCcw, Star, Trophy } from "lucide-react";
import { Page } from "@/components/app-chrome";
import { Switch } from "@/components/ui/switch";
import { useAlerts } from "@/lib/native/use-alerts";
import { useFavorites } from "@/lib/favorites";
import { leagues, teams, type Team } from "@/lib/football-data";
import {
  LEAD_TIME_OPTIONS,
  getOverride,
  hasOverride,
  leagueScope,
  teamScope,
  type ScopeKey,
  type PartialScopePrefs,
  type ScopePrefs,
} from "@/lib/push/prefs";
import { APP_NAME, versionLabel } from "@/lib/app-info";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Notification Settings — Football Live TV" },
      {
        name: "description",
        content:
          "Fine-tune goal alerts, full-time results and kick-off reminder lead times for every league and club you follow.",
      },
      { property: "og:title", content: "Notification Settings — Football Live TV" },
      {
        property: "og:description",
        content: "Per-league and per-club control over goal, full-time and kick-off alerts.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { prefs, setPref, permission, pushRegistered } = useAlerts();
  const { favorites } = useFavorites();

  const followed = favorites
    .map((id) => (teams as Record<string, Team>)[id])
    .filter(Boolean) as Team[];

  return (
    <Page title="Settings" subtitle="Per-league and per-club alert control">
      <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
        <div className="flex items-center gap-3">
          <Bell className="h-5 w-5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Mute everything</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pauses reminders and push alerts without losing your setup.
            </p>
          </div>
          <Switch
            checked={prefs.muteAll}
            onCheckedChange={(v) => setPref("muteAll", v)}
            aria-label="Mute all alerts"
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Permission: <span className="font-semibold text-foreground">{permission}</span> ·
          Push delivery:{" "}
          <span className="font-semibold text-foreground">
            {pushRegistered ? "registered" : "device token pending"}
          </span>{" "}
          ·{" "}
          <Link to="/alerts" className="font-semibold text-primary">
            Alerts overview
          </Link>
        </p>
      </section>

      <ScopeCard
        title="Defaults"
        subtitle="Applied to every match unless a league or club overrides it"
        value={{
          kickoff: prefs.kickoff,
          kickoffMinutesBefore: prefs.kickoffMinutesBefore,
          goals: prefs.goals,
          fullTime: prefs.fullTime,
        }}
        onChange={(patch) => {
          for (const [k, v] of Object.entries(patch)) {
            setPref(k as keyof ScopePrefs, v as never);
          }
        }}
        defaultOpen
      />

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-primary">
          <Trophy className="h-4 w-4" /> Per league
        </h2>
        <div className="space-y-2">
          {leagues.map((l) => (
            <OverrideCard
              key={l.id}
              scope={leagueScope(l.id)}
              label={`${l.badge} ${l.name}`}
              sublabel={l.country}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-widest text-primary">
          <Star className="h-4 w-4" /> Per club
        </h2>
        {followed.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground ring-1 ring-border">
            Follow clubs on{" "}
            <Link to="/favorites" className="font-semibold text-primary">
              Favourites
            </Link>{" "}
            to give them their own alert rules.
          </p>
        ) : (
          <div className="space-y-2">
            {followed.map((t) => (
              <OverrideCard
                key={t.id}
                scope={teamScope(t.id)}
                label={t.name}
                sublabel={t.short}
              />
            ))}
          </div>
        )}
      </section>

      <Link
        to="/about"
        className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
      >
        <Info className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">About {APP_NAME}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {versionLabel()} · Privacy Policy · Terms
          </p>
        </div>
      </Link>
    </Page>
  );
}

function OverrideCard({
  scope,
  label,
  sublabel,
}: {
  scope: ScopeKey;
  label: string;
  sublabel: string;
}) {
  const { prefs, setOverride } = useAlerts();
  const override = getOverride(prefs, scope);
  const custom = hasOverride(prefs, scope);

  const value: ScopePrefs = {
    kickoff: override.kickoff ?? prefs.kickoff,
    kickoffMinutesBefore: override.kickoffMinutesBefore ?? prefs.kickoffMinutesBefore,
    goals: override.goals ?? prefs.goals,
    fullTime: override.fullTime ?? prefs.fullTime,
  };

  return (
    <ScopeCard
      title={label}
      subtitle={custom ? "Custom rules" : `${sublabel} · using defaults`}
      badge={custom ? "Custom" : undefined}
      value={value}
      onChange={(patch) => setOverride(scope, patch)}
      onReset={custom ? () => setOverride(scope, null) : undefined}
    />
  );
}

function ScopeCard({
  title,
  subtitle,
  badge,
  value,
  onChange,
  onReset,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  badge?: string | undefined;
  value: ScopePrefs;
  onChange: (patch: PartialScopePrefs) => void;
  onReset?: (() => void) | undefined;
  defaultOpen?: boolean | undefined;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {badge && (
          <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {badge}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t border-border">
          <Row
            title="Goal alerts"
            desc="Every goal while the match is live"
            checked={value.goals}
            onChange={(v) => onChange({ goals: v })}
          />
          <Row
            title="Full-time results"
            desc="Final score when the whistle goes"
            checked={value.fullTime}
            onChange={(v) => onChange({ fullTime: v })}
          />
          <Row
            title="Kick-off reminders"
            desc="A nudge before the match starts"
            checked={value.kickoff}
            onChange={(v) => onChange({ kickoff: v })}
          />

          <div className={cn("p-4", !value.kickoff && "opacity-40")}>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Reminder lead time
            </p>
            <div className="mt-2 flex gap-2">
              {LEAD_TIME_OPTIONS.map((min) => (
                <button
                  key={min}
                  disabled={!value.kickoff}
                  onClick={() => onChange({ kickoffMinutesBefore: min })}
                  className={cn(
                    "flex-1 rounded-xl py-2 text-xs font-semibold transition-colors",
                    value.kickoffMinutesBefore === min
                      ? "bg-gradient-primary text-primary-foreground shadow-glow"
                      : "bg-surface-2 text-muted-foreground",
                  )}
                >
                  {min >= 60 ? `${min / 60}h` : `${min}m`}
                </button>
              ))}
            </div>
          </div>

          {onReset && (
            <div className="border-t border-border p-3">
              <button
                onClick={onReset}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Row({
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
    <div className="flex items-center gap-3 border-b border-border p-4 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
