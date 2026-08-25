import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isNative } from "./platform";
import { hideBanner, initAds, maybeShowInterstitial, prepareInterstitial, showBanner } from "./ads";

/**
 * Mounts the anchored AdMob banner on the native build and shows an
 * interstitial every few screen changes. No-op in the browser.
 */
export function useAdMob() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    (async () => {
      await initAds();
      if (cancelled) return;
      await showBanner();
      void prepareInterstitial();
    })().catch((err) => console.warn("AdMob init failed", err));

    return () => {
      cancelled = true;
      void hideBanner();
    };
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    // Interstitials only between content screens, never on first paint.
    if (pathname === "/") return;
    void maybeShowInterstitial(3);
  }, [pathname]);
}
