import { useEffect, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { runAdGate, type AdGateKind } from "@/lib/native/ad-gate";

/**
 * Shows a full-screen ad before revealing its children.
 *
 * The content always appears: if the ad is unavailable, fails, or the
 * frequency cap blocks it, the gate opens immediately. On the web there are
 * no ads at all, so it is a no-op.
 */
export function AdGate({
  children,
  kind = "interstitial",
  label = "Loading…",
}: {
  children: ReactNode;
  kind?: AdGateKind;
  label?: string;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void runAdGate(kind).finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [kind]);

  if (!ready) {
    return (
      <div className="grid place-items-center py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="mt-2 text-xs text-muted-foreground">{label}</p>
      </div>
    );
  }

  return <>{children}</>;
}
