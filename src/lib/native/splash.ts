import { isNative } from "./platform";

/**
 * Hides the native splash screen once the web layer has painted.
 * No-op on web/SSR — the plugin is only loaded inside a Capacitor shell.
 */
export async function hideSplash() {
  if (!isNative()) return;
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide({ fadeOutDuration: 250 });
  } catch (err) {
    console.warn("Splash screen plugin unavailable", err);
  }
}
