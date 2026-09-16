import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { isNative } from "./platform";
import {
  hideBanner,
  initAds,
  prepareInterstitial,
  showBanner,
  showLaunchInterstitial,
} from "./ads";
import { runAdGate } from "./ad-gate";

/**
 * Native ad orchestration:
 *  - anchored banner on every screen,
 *  - one full-screen ad shortly after the app opens,
 *  - a full-screen ad when the user moves to another section (rate-limited).
 * No-op in the browser.
 */
export function useAdMob() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (!isNative()) return;
    let cancelled = false;

    (async () => {
      await initAds();
      if (cancelled) return;
      // A first banner request can fail while the SDK is still warming up.
      for (let attempt = 0; attempt < 3 && !cancelled; attempt += 1) {
        try {
          await showBanner();
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
      }
      void prepareInterstitial();
      // Launch ad: give the first screen a moment to paint, then show it.
      setTimeout(() => {
        if (!cancelled) void showLaunchInterstitial();
      }, 1200);
    })().catch((err) => console.warn("AdMob init failed", err));

    return () => {
      cancelled = true;
      void hideBanner();
    };
  }, []);

  useEffect(() => {
    if (!isNative()) return;
    // Section switches get a full-screen ad, capped to one every 45 seconds
    // so the launch ad and the Watch/Predict gates never stack up.
    void runAdGate("interstitial");
  }, [pathname]);
}
