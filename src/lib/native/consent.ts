import { isNative } from "./platform";

/**
 * Google UMP (User Messaging Platform) consent — required by Google Play and
 * AdMob policy before serving personalised ads to users in the EEA/UK and
 * regulated US states.
 *
 * Flow: requestConsentInfo() -> if a form is required, showConsentForm().
 * AdMob.initialize() is only called after this resolves.
 * Users can change their choice later from Settings -> "Ad privacy options".
 */

type ConsentStatus = "UNKNOWN" | "NOT_REQUIRED" | "REQUIRED" | "OBTAINED";

let lastInfo: { status: ConsentStatus; isConsentFormAvailable: boolean } | null = null;
let inFlight: Promise<void> | null = null;

async function admob() {
  return import("@capacitor-community/admob");
}

/** Resolves once the user has answered the consent form (or none is needed). */
export async function ensureConsent(): Promise<void> {
  if (!isNative()) return;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { AdMob } = await admob();
      const info = await AdMob.requestConsentInfo({
        // Set to true if the app is ever targeted at children.
        tagForUnderAgeOfConsent: false,
      });
      lastInfo = {
        status: info.status as ConsentStatus,
        isConsentFormAvailable: Boolean(info.isConsentFormAvailable),
      };

      if (info.status === "REQUIRED" && info.isConsentFormAvailable) {
        const after = await AdMob.showConsentForm();
        lastInfo = {
          status: after.status as ConsentStatus,
          isConsentFormAvailable: Boolean(after.isConsentFormAvailable),
        };
      }
    } catch (err) {
      // Never block the app on the consent SDK; non-personalised ads still serve.
      console.warn("UMP consent failed", err);
    }
  })();

  return inFlight;
}

/** True when we know a privacy options entry point should be shown. */
export function consentStatus(): ConsentStatus {
  return lastInfo?.status ?? "UNKNOWN";
}

/** Opens Google's privacy options form so the user can change their choice. */
export async function openAdPrivacyOptions(): Promise<boolean> {
  if (!isNative()) return false;
  try {
    const { AdMob } = await admob();
    await AdMob.showPrivacyOptionsForm();
    return true;
  } catch (err) {
    console.warn("Privacy options form failed", err);
    return false;
  }
}

/** Debug/support helper: wipes the stored consent so the form shows again. */
export async function resetAdConsent(): Promise<void> {
  if (!isNative()) return;
  const { AdMob } = await admob();
  await AdMob.resetConsentInfo();
  lastInfo = null;
  inFlight = null;
}
