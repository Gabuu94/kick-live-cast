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
  /**
   * Deep links.
   *
   * Push payloads carry `data.link = footylive://match/<id>`; the app listens
   * for `appUrlOpen` and routes to the match screen. After `npx cap add
   * android`, add this to the MainActivity in AndroidManifest.xml:
   *
   *   <intent-filter>
   *     <action android:name="android.intent.action.VIEW" />
   *     <category android:name="android.intent.category.DEFAULT" />
   *     <category android:name="android.intent.category.BROWSABLE" />
   *     <data android:scheme="footylive" android:host="match" />
   *   </intent-filter>
   *
   * and, for tapping an FCM notification:
   *
   *   <intent-filter>
   *     <action android:name="MATCH_ALERT" />
   *     <category android:name="android.intent.category.DEFAULT" />
   *   </intent-filter>
   */
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
