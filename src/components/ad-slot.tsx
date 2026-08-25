import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isNative } from "@/lib/native/platform";

/**
 * Inline ad placement.
 *
 * On the native (Capacitor) build the AdMob banner is an anchored overlay
 * managed by `useAdMob()` in the root, so this component renders nothing there
 * and simply reserves no extra space. On the web build it renders a labelled
 * placeholder so the layout can be reviewed in the browser.
 */
export function AdSlot({
  label = "Ad space — AdMob banner",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNative()), []);

  if (native) return null;

  return (
    <div
      className={cn(
        "grid h-16 place-items-center rounded-xl border border-dashed border-border bg-surface/60 text-[11px] uppercase tracking-widest text-muted-foreground",
        className,
      )}
    >
      {label}
    </div>
  );
}
