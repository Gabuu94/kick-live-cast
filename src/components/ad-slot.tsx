import { cn } from "@/lib/utils";

/**
 * Placeholder for an AdMob banner/native unit.
 * When wrapped with Capacitor, mount the AdMob banner in place of this element.
 */
export function AdSlot({
  label = "Ad space — AdMob banner",
  className,
}: {
  label?: string;
  className?: string;
}) {
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
