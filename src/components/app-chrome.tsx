import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, CalendarDays, Home, Newspaper, Settings, Star, Trophy, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Live", icon: Home },
  { to: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "/standings", label: "Tables", icon: Trophy },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/favorites", label: "Favourites", icon: Star },
] as const;

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
            <Tv className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-xl font-bold uppercase tracking-wide">
            Football{" "}
            <span className="text-primary">Live TV</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/alerts"
            aria-label="Match alerts"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground"
            activeProps={{
              className: "grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary",
            }}
          >
            <Bell className="h-4.5 w-4.5" />
          </Link>
          <Link
            to="/settings"
            aria-label="Notification settings"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted-foreground"
            activeProps={{
              className: "grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary",
            }}
          >
            <Settings className="h-4.5 w-4.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_6px_currentColor]")} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function Page({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-pitch px-4 pb-24 pt-4">
      <h1 className="font-display text-2xl font-bold uppercase tracking-wide">{title}</h1>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </main>
  );
}
