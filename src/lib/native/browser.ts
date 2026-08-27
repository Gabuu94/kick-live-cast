/**
 * Opens a rights holder's site or app.
 *
 * Capacitor's WebView hands `window.open(url, "_blank")` to the OS, so an
 * installed broadcaster app (YouTube, DAZN, SABC Sport…) claims the URL via
 * its own intent filter; otherwise it lands in the system browser. On the web
 * it is a normal new tab.
 */
export function openExternal(url: string): void {
  if (!url || url === "#") return;
  window.open(url, "_blank", "noopener,noreferrer");
}
