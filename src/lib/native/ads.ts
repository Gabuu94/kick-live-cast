import { isNative } from "./platform";

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
  const { AdMob } = await admob();
  await AdMob.initialize({ initializeForTesting: TESTING });
  initialized = true;
}

/** Shows the anchored bottom banner. Safe to call repeatedly. */
export async function showBanner(): Promise<void> {
  if (!isNative() || bannerVisible) return;
  await initAds();
  const { AdMob, BannerAdSize, BannerAdPosition } = await admob();
  await AdMob.showBanner({
    adId: ADMOB_UNITS.banner,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 56, // sit above the bottom tab bar
    isTesting: TESTING,
  });
  bannerVisible = true;
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
