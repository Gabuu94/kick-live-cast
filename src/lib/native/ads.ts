import { isNative } from "./platform";
import { ensureConsent } from "./consent";

/**
 * AdMob unit IDs.
 * These are Google's official TEST ids — replace with your own AdMob unit ids
 * before publishing to the Play Store, and set VITE_ADMOB_TESTING=false.
 */
export const ADMOB_UNITS = {
  banner:
    import.meta.env["VITE_ADMOB_BANNER_ID"] ?? "ca-app-pub-3940256099942544/6300978111",
  interstitial:
    import.meta.env["VITE_ADMOB_INTERSTITIAL_ID"] ?? "ca-app-pub-3940256099942544/1033173712",
  rewardedInterstitial:
    import.meta.env["VITE_ADMOB_REWARDED_INTERSTITIAL_ID"] ??
    "ca-app-pub-3940256099942544/5354046379",
};

const TESTING = import.meta.env["VITE_ADMOB_TESTING"] !== "false";

let initialized = false;
let bannerVisible = false;
let interstitialReady = false;

async function admob() {
  const mod = await import("@capacitor-community/admob");
  return mod;
}

export async function initAds(): Promise<void> {
  if (!isNative() || initialized) return;
  // Google Play / AdMob policy: collect UMP consent before requesting ads.
  await ensureConsent();
  const { AdMob } = await admob();
  console.log("[ads] initialize", { testing: TESTING, banner: ADMOB_UNITS.banner });
  await AdMob.initialize({ initializeForTesting: TESTING });
  initialized = true;
}

/** Shows the anchored bottom banner. Safe to call repeatedly. */
export async function showBanner(): Promise<void> {
  if (!isNative() || bannerVisible) return;
  await initAds();
  const { AdMob, BannerAdSize, BannerAdPosition } = await admob();
  try {
    await AdMob.showBanner({
      adId: ADMOB_UNITS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 56, // sit above the bottom tab bar
      isTesting: TESTING,
    });
    bannerVisible = true;
    console.log("[ads] banner shown");
  } catch (err) {
    bannerVisible = false;
    console.warn("[ads] banner failed", err);
    throw err;
  }
}

export async function hideBanner(): Promise<void> {
  if (!isNative() || !bannerVisible) return;
  const { AdMob } = await admob();
  await AdMob.hideBanner();
  bannerVisible = false;
}

export async function prepareInterstitial(): Promise<void> {
  if (!isNative() || interstitialReady) return;
  await initAds();
  const { AdMob } = await admob();
  await AdMob.prepareInterstitial({ adId: ADMOB_UNITS.interstitial, isTesting: TESTING });
  interstitialReady = true;
}

/**
 * Shows an interstitial, then preloads the next one.
 * Frequency-capped so users are not hit on every navigation.
 */
const INTERSTITIAL_MIN_GAP_MS = 3 * 60 * 1000;
let lastInterstitialAt = 0;
let navCount = 0;

export async function maybeShowInterstitial(everyNthView = 3): Promise<void> {
  if (!isNative()) return;
  navCount += 1;
  if (navCount % everyNthView !== 0) return;
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_MIN_GAP_MS) return;

  try {
    await prepareInterstitial();
    const { AdMob } = await admob();
    await AdMob.showInterstitial();
    lastInterstitialAt = Date.now();
    interstitialReady = false;
    void prepareInterstitial();
  } catch (err) {
    console.warn("Interstitial failed", err);
  }
}

/* ------------------------------------------------------------------ */
/* Rewarded ads — used to unlock the HD stream / remove ads for a while */
/* ------------------------------------------------------------------ */

export const REWARDED_UNIT =
  import.meta.env["VITE_ADMOB_REWARDED_ID"] ?? "ca-app-pub-3940256099942544/5224354917";

let rewardedReady = false;

export async function prepareRewarded(): Promise<void> {
  if (!isNative() || rewardedReady) return;
  await initAds();
  const { AdMob } = await admob();
  await AdMob.prepareRewardVideoAd({ adId: REWARDED_UNIT, isTesting: TESTING });
  rewardedReady = true;
}

/**
 * Shows a rewarded video. Resolves true when the user earned the reward.
 * On the web build it resolves true immediately so the flow stays testable.
 */
export async function showRewarded(): Promise<boolean> {
  if (!isNative()) return true;
  try {
    await prepareRewarded();
    const { AdMob } = await admob();
    const reward = await AdMob.showRewardVideoAd();
    rewardedReady = false;
    void prepareRewarded();
    return Boolean(reward);
  } catch (err) {
    console.warn("Rewarded ad failed", err);
    rewardedReady = false;
    return false;
  }
}
