import { isNative } from "./platform";

/**
 * Opens a rights holder's site or app.
 *
 * On Android we hand the URL to the OS so an installed broadcaster app
 * (YouTube, DAZN, SABC Sport…) takes it via its own deep link; otherwise it
 * lands in the system browser. On the web it is a normal new tab.
 */
export async function openExternal(url: string): Promise<void> {
  if (!url || url === "#") return;
  if (isNative()) {
    try {
      const { App } = await import("@capacitor/app");
      // openUrl hands off to the OS chooser, which prefers a matching app.
      await App.openUrl?.({ url });
      return;
    } catch {
      // fall through to the browser
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
