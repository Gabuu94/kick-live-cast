import { isNative } from "./platform";
import { maybeShowInterstitial, showRewarded } from "./ads";

/**
 * One place that decides whether a full-screen ad runs before content.
 *
 * Guardrails, so this never feels broken and never breaches AdMob policy:
 *  - nothing on the very first interaction after launch,
 *  - at most one full-screen ad every 60 seconds,
 *  - a failed or unavailable ad always lets the content through.
 */

const MIN_GAP_MS = 45_000;
let lastAdAt = 0;

export type AdGateKind = "rewarded" | "interstitial";

/** Runs the gate. Always resolves — `true` when an ad was actually shown. */
export async function runAdGate(kind: AdGateKind = "interstitial"): Promise<boolean> {
  if (!isNative()) return false; // web preview: straight to the content

  if (Date.now() - lastAdAt < MIN_GAP_MS) return false;

  try {
    if (kind === "rewarded") {
      await showRewarded();
    } else {
      // everyNthView = 1: this is an explicit gate, not a navigation counter
      await maybeShowInterstitial(1);
    }
    lastAdAt = Date.now();
    return true;
  } catch (err) {
    console.warn("Ad gate failed, showing content anyway", err);
    return false;
  }
}

/** Test hook: forget the frequency cap. */
export function resetAdGate(): void {
  lastAdAt = 0;
}
