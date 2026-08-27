import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Tv } from "lucide-react";
import { APP_NAME } from "@/lib/app-info";

const KEY = "footballlivetv:disclaimer-accepted:v1";

/**
 * One-time notice shown on first launch.
 *
 * Covers the Google Play disclosures reviewers look for in a sports
 * scores/streaming-guide app:
 *  - the app is an unofficial, independent guide (no club/league affiliation)
 *  - it does not host or stream any copyrighted broadcast
 *  - odds are informational only, 18+, no real-money gambling
 *  - ads are served by Google AdMob
 *  - links to the Privacy Policy and Terms before any data is sent
 */
export function FirstRunNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* storage blocked — skip the notice */
    }
  }, []);

  if (!open) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 ring-1 ring-border">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary text-primary-foreground">
            <Tv className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold">Welcome to {APP_NAME}</p>
            <p className="text-xs text-muted-foreground">Please read before you continue</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">Unofficial guide.</span> {APP_NAME} is
            an independent app and is not affiliated with, endorsed by or licensed by any club,
            league, federation or broadcaster. All names and logos belong to their owners.
          </li>
          <li>
            <span className="font-semibold text-foreground">No streams are hosted here.</span> The
            app lists which official channel or rights holder is showing a match and links out to
            them. We do not host, upload or rebroadcast any match footage.
          </li>
          <li>
            <span className="font-semibold text-foreground">Odds are informational.</span> Odds and
            win probabilities are shown for context only. No betting takes place in this app, no
            real-money gambling is offered and no bookmaker accounts can be opened. 18+.
          </li>
          <li>
            <span className="font-semibold text-foreground">Ads.</span> The app is free and
            supported by ads from Google AdMob. Where required you&apos;ll be asked to choose your
            ad preferences, which you can change any time in Settings.
          </li>
        </ul>

        <p className="mt-4 text-[11px] text-muted-foreground">
          By continuing you agree to our{" "}
          <Link to="/terms" className="font-semibold text-primary underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>

        <button
          onClick={accept}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-primary py-3 text-sm font-bold text-primary-foreground shadow-glow"
        >
          <ShieldCheck className="h-4 w-4" /> I understand — continue
        </button>
      </div>
    </div>
  );
}
