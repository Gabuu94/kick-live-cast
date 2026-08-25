import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor config for the Android (Play Store) build.
 *
 * Local dev against the Lovable preview:
 *   set `server.url` to your preview URL and run `npx cap sync android`.
 * Production build:
 *   run `npm run build`, point webDir at the built client output, then
 *   `npx cap sync android && npx cap open android`.
 */
const config: CapacitorConfig = {
  appId: "app.footylive.scores",
  appName: "FootyLive",
  webDir: "dist/client",
  android: {
    allowMixedContent: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_footy",
      iconColor: "#4ADE80",
    },
  },
};

export default config;
