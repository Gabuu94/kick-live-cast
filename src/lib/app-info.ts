/**
 * Single source of truth for app identity shown in the About screen and used
 * by the native build (Capacitor `appId` / Play Store listing).
 *
 * Bump APP_VERSION + APP_BUILD together with the Android `versionName` /
 * `versionCode` in android/app/build.gradle before each Play Store release.
 */
export const APP_NAME = "Football Live TV";
export const APP_VERSION = "1.0.0";
export const APP_BUILD = 1;
export const APP_PACKAGE_ID = "com.footballlivetv.app";
export const DEEP_LINK_SCHEME = "footballlivetv";
export const SUPPORT_EMAIL = "support@footballlivetv.app";
export const LAST_UPDATED = "25 August 2026";

export const versionLabel = () => `Version ${APP_VERSION} (build ${APP_BUILD})`;
