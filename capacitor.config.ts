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
  appId: "com.footballlivetvscores.app",
  appName: "Football Live TV",
  webDir: "dist/client",
  /**
   * This app is server-rendered, so the native shell loads the published site.
   * Native plugins (AdMob, push, share, splash) still run natively.
   */
  server: {
    url: "https://livefootball.dev",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  /**
   * Deep links.
   *
   * Push payloads carry `data.link = footballlivetv://match/<id>`; the app listens
   * for `appUrlOpen` and routes to the match screen. After `npx cap add
   * android`, add this to the MainActivity in AndroidManifest.xml:
   *
   *   <intent-filter>
   *     <action android:name="android.intent.action.VIEW" />
   *     <category android:name="android.intent.category.DEFAULT" />
   *     <category android:name="android.intent.category.BROWSABLE" />
   *     <data android:scheme="footballlivetv" android:host="match" />
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
      smallIcon: "ic_stat_football",
      iconColor: "#4ADE80",
    },
    /**
     * Branded splash.
     *
     * Sources live in `public/`:
     *   - public/splash-dark.png   -> resources/splash-dark.png
     *   - public/splash-light.png  -> resources/splash.png
     *   - public/app-icon.png      -> resources/icon.png (launcher + adaptive)
     *
     * Generate every density (incl. Android 12+ splash and adaptive icons):
     *   npx @capacitor/assets generate --android \
     *     --iconBackgroundColor '#0b1a14' --iconBackgroundColorDark '#0b1a14' \
     *     --splashBackgroundColor '#0b1a14' --splashBackgroundColorDark '#0b1a14'
     * then `npx cap sync android`.
     */
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 0,
      backgroundColor: "#0b1a14",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
  },
};

export default config;
