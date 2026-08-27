import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * End-to-end guard for the Google UMP consent flow.
 *
 * Play / AdMob policy: no ad request may reach Google before the consent
 * information has been requested and (where required) the form shown. These
 * tests drive the real `initAds` / `showBanner` / `maybeShowInterstitial` /
 * `showRewarded` paths against a fake AdMob plugin and assert the call
 * ordering, so a future refactor cannot quietly drop `ensureConsent()`.
 */

const calls: string[] = [];

let consentStatus = "REQUIRED";
let formAvailable = true;

vi.mock("@capacitor-community/admob", () => {
  const AdMob = {
    requestConsentInfo: vi.fn(async () => {
      calls.push("requestConsentInfo");
      return { status: consentStatus, isConsentFormAvailable: formAvailable };
    }),
    showConsentForm: vi.fn(async () => {
      calls.push("showConsentForm");
      consentStatus = "OBTAINED";
      return { status: "OBTAINED", isConsentFormAvailable: formAvailable };
    }),
    showPrivacyOptionsForm: vi.fn(async () => {
      calls.push("showPrivacyOptionsForm");
    }),
    resetConsentInfo: vi.fn(async () => {
      calls.push("resetConsentInfo");
    }),
    initialize: vi.fn(async () => {
      calls.push("initialize");
    }),
    showBanner: vi.fn(async () => {
      calls.push("showBanner");
    }),
    hideBanner: vi.fn(async () => {
      calls.push("hideBanner");
    }),
    prepareInterstitial: vi.fn(async () => {
      calls.push("prepareInterstitial");
    }),
    showInterstitial: vi.fn(async () => {
      calls.push("showInterstitial");
    }),
    prepareRewardVideoAd: vi.fn(async () => {
      calls.push("prepareRewardVideoAd");
    }),
    showRewardVideoAd: vi.fn(async () => {
      calls.push("showRewardVideoAd");
      return { type: "reward", amount: 1 };
    }),
  };
  return {
    AdMob,
    BannerAdSize: { ADAPTIVE_BANNER: "ADAPTIVE_BANNER" },
    BannerAdPosition: { BOTTOM_CENTER: "BOTTOM_CENTER" },
  };
});

vi.mock("./platform", () => ({ isNative: () => true }));

/** Ad requests that must never precede consent collection. */
const AD_REQUESTS = [
  "initialize",
  "showBanner",
  "prepareInterstitial",
  "showInterstitial",
  "prepareRewardVideoAd",
  "showRewardVideoAd",
];

function firstAdRequestIndex() {
  return calls.findIndex((c) => AD_REQUESTS.includes(c));
}

async function freshModules() {
  vi.resetModules();
  calls.length = 0;
  return {
    ads: await import("./ads"),
    consent: await import("./consent"),
  };
}

beforeEach(() => {
  consentStatus = "REQUIRED";
  formAvailable = true;
});

describe("UMP consent gate", () => {
  it("requests consent info and shows the form before AdMob.initialize", async () => {
    const { ads } = await freshModules();
    await ads.initAds();

    expect(calls).toEqual(["requestConsentInfo", "showConsentForm", "initialize"]);
    expect(calls.indexOf("requestConsentInfo")).toBeLessThan(firstAdRequestIndex());
  });

  it("collects consent before the banner is requested", async () => {
    const { ads } = await freshModules();
    await ads.showBanner();

    expect(calls[0]).toBe("requestConsentInfo");
    expect(calls).toContain("showConsentForm");
    expect(calls.indexOf("showConsentForm")).toBeLessThan(calls.indexOf("showBanner"));
  });

  it("collects consent before an interstitial is prepared or shown", async () => {
    const { ads } = await freshModules();
    // The interstitial is frequency-capped: fire until it actually shows.
    await ads.maybeShowInterstitial(1);

    expect(calls[0]).toBe("requestConsentInfo");
    expect(calls.indexOf("showConsentForm")).toBeLessThan(calls.indexOf("prepareInterstitial"));
    expect(calls).toContain("showInterstitial");
  });

  it("collects consent before a rewarded ad is requested", async () => {
    const { ads } = await freshModules();
    const earned = await ads.showRewarded();

    expect(earned).toBe(true);
    expect(calls[0]).toBe("requestConsentInfo");
    expect(calls.indexOf("showConsentForm")).toBeLessThan(calls.indexOf("prepareRewardVideoAd"));
  });

  it("asks for consent only once even when several ad surfaces race", async () => {
    const { ads } = await freshModules();
    await Promise.all([ads.initAds(), ads.showBanner(), ads.prepareInterstitial()]);

    expect(calls.filter((c) => c === "requestConsentInfo")).toHaveLength(1);
    expect(calls.filter((c) => c === "showConsentForm")).toHaveLength(1);
    expect(calls.filter((c) => c === "initialize")).toHaveLength(1);
  });

  it("skips the form outside the EEA/UK but still checks consent first", async () => {
    consentStatus = "NOT_REQUIRED";
    formAvailable = false;
    const { ads, consent } = await freshModules();
    await ads.showBanner();

    expect(calls).toEqual(["requestConsentInfo", "initialize", "showBanner"]);
    expect(consent.consentStatus()).toBe("NOT_REQUIRED");
  });

  it("still serves ads (non-personalised) when the consent form throws", async () => {
    const { AdMob } = await import("@capacitor-community/admob");
    (AdMob.requestConsentInfo as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("no network"),
    );
    const { ads } = await freshModules();
    await ads.initAds();

    expect(calls).toContain("initialize");
  });

  it("exposes the privacy options form so users can change consent later", async () => {
    const { consent } = await freshModules();
    const opened = await consent.openAdPrivacyOptions();

    expect(opened).toBe(true);
    expect(calls).toContain("showPrivacyOptionsForm");
  });
});

describe("consent gate on the web build", () => {
  it("never touches AdMob when not running natively", async () => {
    vi.resetModules();
    calls.length = 0;
    vi.doMock("./platform", () => ({ isNative: () => false }));
    const ads = await import("./ads");

    await ads.initAds();
    await ads.showBanner();
    await ads.maybeShowInterstitial(1);

    expect(calls).toEqual([]);
    vi.doUnmock("./platform");
  });
});
