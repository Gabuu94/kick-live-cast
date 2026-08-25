import { TrendingDown, TrendingUp } from "lucide-react";
import type { Match } from "@/lib/football-data";
import { getExtras, getOdds, probabilities } from "@/lib/odds";
import { cn } from "@/lib/utils";

/** Compact 1X2 strip used inside match cards. */
export function OddsStrip({ match }: { match: Match }) {
  const o = getOdds(match);
  const cells = [
    { k: "1", v: o.home, d: o.drift.home },
    { k: "X", v: o.draw, d: o.drift.draw },
    { k: "2", v: o.away, d: o.drift.away },
  ];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {cells.map((c) => (
        <div
          key={c.k}
          className="flex items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5"
        >
          <span className="text-[11px] font-semibold text-muted-foreground">{c.k}</span>
          <span className="flex items-center gap-1 text-xs font-bold tabular-nums">
            {c.v.toFixed(2)}
            {c.d >= 0 ? (
              <TrendingUp className="h-3 w-3 text-primary" />
            ) : (
              <TrendingDown className="h-3 w-3 text-live" />
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Full odds + probability block for the match detail screen. */
export function OddsPanel({ match }: { match: Match }) {
  const o = getOdds(match);
  const p = probabilities(o);
  const rows: { label: string; value: number; pct: number }[] = [
    { label: match.home.short, value: o.home, pct: p.home },
    { label: "Draw", value: o.draw, pct: p.draw },
    { label: match.away.short, value: o.away, pct: p.away },
  ];

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
          Odds & win chance
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {o.bookmakerCount} books · {o.updatedMinutesAgo}m ago
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="rounded-xl bg-surface-2 p-3 text-center">
            <p className="truncate text-[11px] font-medium text-muted-foreground">{r.label}</p>
            <p className="font-display text-xl font-bold tabular-nums">{r.value.toFixed(2)}</p>
            <p className="text-[11px] text-primary">{r.pct}%</p>
          </div>
        ))}
      </div>

      <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-2">
        <span className="bg-primary" style={{ width: `${p.home}%` }} />
        <span className="bg-muted-foreground/40" style={{ width: `${p.draw}%` }} />
        <span className="bg-live" style={{ width: `${p.away}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <Mini label={`Over ${o.overUnder.line}`} value={o.overUnder.over} />
        <Mini label={`Under ${o.overUnder.line}`} value={o.overUnder.under} />
        <Mini label="Both teams score" value={o.btts.yes} />
        <Mini label="No BTTS" value={o.btts.no} />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        Odds are indicative and for information only. 18+. Gamble responsibly.
      </p>
    </section>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2">
      <span className="truncate text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value.toFixed(2)}</span>
    </div>
  );
}

/** Referee, weather, form and head-to-head. */
export function MatchInfoPanel({ match }: { match: Match }) {
  const x = getExtras(match);
  const total = x.h2h.homeWins + x.h2h.draws + x.h2h.awayWins || 1;

  return (
    <section className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-primary">
        Match info
      </h2>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Fact label="Referee" value={x.referee} />
        <Fact label="Weather" value={`${x.weather} · ${x.temperatureC}°C`} />
        <Fact label="Formations" value={`${x.lineup.home} v ${x.lineup.away}`} />
        <Fact
          label="Attendance"
          value={x.attendance ? x.attendance.toLocaleString() : "Not started"}
        />
      </dl>

      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{x.h2h.label}</p>
        <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-surface-2">
          <span className="bg-primary" style={{ width: `${(x.h2h.homeWins / total) * 100}%` }} />
          <span
            className="bg-muted-foreground/40"
            style={{ width: `${(x.h2h.draws / total) * 100}%` }}
          />
          <span className="bg-live" style={{ width: `${(x.h2h.awayWins / total) * 100}%` }} />
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
          <span>{x.h2h.homeWins} W</span>
          <span>{x.h2h.draws} D</span>
          <span>{x.h2h.awayWins} W</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <FormRow name={match.home.short} form={x.formHome} />
        <FormRow name={match.away.short} form={x.formAway} />
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium">{value}</dd>
    </div>
  );
}

function FormRow({ name, form }: { name: string; form: ("W" | "D" | "L")[] }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] text-muted-foreground">{name} form</p>
      <div className="flex gap-1">
        {form.map((f, i) => (
          <span
            key={i}
            className={cn(
              "grid h-5 w-5 place-items-center rounded text-[10px] font-bold",
              f === "W"
                ? "bg-primary/20 text-primary"
                : f === "D"
                  ? "bg-surface-2 text-muted-foreground"
                  : "bg-live/20 text-live",
            )}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}
