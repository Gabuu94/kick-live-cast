# Google Play release checklist — Football Live TV

Everything below is either already handled in the codebase or is a Play Console
step you must do once. Work top to bottom.

---

## 1. What the app already does for compliance

| Play requirement | Where it's handled |
| --- | --- |
| Privacy policy inside the app **and** at a public URL | `/privacy` route (`src/routes/privacy.tsx`) |
| Terms of use | `/terms` route |
| App version + package ID visible to users | `/about` route, `src/lib/app-info.ts` |
| First-run disclosures (unofficial app, no hosted streams, odds are informational 18+, ads) | `src/components/first-run-notice.tsx`, shown once |
| Google UMP / GDPR consent before personalised ads | `src/lib/native/consent.ts`, called from `initAds()` |
| User can change ad consent later | Settings → "Ad privacy options" |
| Notification permission requested in context, not on launch | `src/lib/native/notifications.ts` (asked when the user enables alerts) |
| Users can turn all notifications off | Settings → "Mute everything", plus per-league/per-club controls |
| Ads not shown over content / not on app open / capped interstitials | `src/lib/native/ads.ts` (3-minute gap, every 3rd screen, never on `/`) |
| Deleting the push registration when alerts are turned off | `src/lib/push.functions.ts` (`unregisterDevice`) |

## 2. Before you upload — code steps

1. **AdMob IDs are already real.** Your `.env.production` already has the live
   units you created:
   ```
   VITE_ADMOB_BANNER_ID=ca-app-pub-2683576802120823/6097625127
   VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-2683576802120823/6257407222
   VITE_ADMOB_REWARDED_ID=ca-app-pub-2683576802120823/3735632771
   VITE_ADMOB_TESTING=false
   ```
   Shipping test ads to production, or clicking your own live ads, gets the
   AdMob account suspended.
2. **AdMob app ID is already in `android/app/src/main/AndroidManifest.xml`:**
   ```xml
   <meta-data
     android:name="com.google.android.gms.ads.APPLICATION_ID"
     android:value="ca-app-pub-2683576802120823~9075142252"/>
   ```
   Missing this crashes the app on launch.
3. **Configure a GDPR message in AdMob** (Privacy & messaging → European
   regulations *and* US states). Without a published message the UMP form
   never appears and EEA traffic serves no ads.
4. **Set the real support email and publisher name** in `src/lib/app-info.ts`
   and in the Privacy Policy — a dead support address is a common rejection.
5. **Bump the version** in `src/lib/app-info.ts` *and*
   `android/app/build.gradle` (`versionName` / `versionCode`) together.
6. **Keep permissions minimal.** The manifest should only need `INTERNET`,
   `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` (for scheduled reminders) and
   `AD_ID`. Remove anything Capacitor added that you don't use — every extra
   permission needs a justification.
7. **Deep links:** add the `footballlivetv://match` intent filter documented in
   `capacitor.config.ts`.
8. Build: `npm run build && npx cap sync android`, then generate icons/splash:
   `npx @capacitor/assets generate --android ...` (exact command in
   `capacitor.config.ts`).
9. Produce a signed **Android App Bundle (.aab)** in Android Studio
   (Build → Generate Signed Bundle), targeting the current required API level
   (Play requires targetSdk = latest − 1; check the Play Console warning).

## 3. Play Console — Data safety form answers

Declare exactly this (it matches what the code does):

- **Does your app collect or share user data?** Yes.
- **Data types collected:**
  - *Device or other IDs* — collected, **not** shared, used for **App
    functionality** (push token) and **Advertising** (AdMob advertising ID).
    Not required for the app to work (only if alerts are enabled).
  - *App activity → other user-generated content* (followed clubs and alert
    preferences) — collected, not shared, App functionality, optional.
- **Is data encrypted in transit?** Yes (HTTPS/FCM).
- **Can users request data deletion?** Yes — turning alerts off deletes the
  registration; describe this and give the support email.
- **Third-party SDKs to list:** Google AdMob, Firebase Cloud Messaging.
- Do **not** claim "no data collected" — an AdMob app always collects the ad ID.

## 4. Play Console — content rating & policy questionnaires

- **Category:** Sports. **Ads:** Yes, contains ads (also tick "Contains ads" on
  the store listing).
- **Content rating questionnaire:** answer **No** to "simulated gambling" and
  **No** to real gambling — the app displays odds for information only and has
  no bookmaker link-out, no wagering and no virtual currency. If you ever add an
  affiliate link to a bookmaker, the app becomes a **real-money gambling app**
  and needs separate country-by-country Play certification plus an 18+ rating.
  Keep odds display-only unless you're ready for that.
- **Target audience:** 18+ (or 16+/18+). Do **not** select a children's audience
  — that would forbid the ad setup you're using.
- **Ads declaration:** interstitial + rewarded + banner, all AdMob.
- **News app?** Answer No — the news feed is aggregated headlines, not
  first-party journalism.

## 5. The two things most likely to get this app rejected or taken down

1. **Streaming other people's broadcasts.** Play's IP policy and the rights
   holders both act fast. Only ever link out to the official rights holder's
   app/site, or embed a stream you're licensed/affiliated to show (bookmaker or
   Sportradar in-play video). Never bundle scraped IPTV `.m3u8` links, and never
   use club or broadcaster logos in the store icon or feature graphic.
2. **Misleading store listing.** Don't promise "watch every match free" if the
   app is a listings guide. Describe it as *live scores, fixtures, tables and a
   TV/streaming guide*. A title/description that oversells streaming is a
   Deceptive Behaviour strike.

Also worth doing: keep club logos to in-app content served from your data
provider (the app fetches them by domain at runtime), and use your own artwork
for the icon, splash and screenshots — which is already the case.

## 6. Store listing content — DONE, in `/mnt/documents/play-store/`

| Asset | File | Status |
| --- | --- | --- |
| App icon 512×512 | `app-icon-512.png` | Ready |
| Feature graphic 1024×500 | `feature-graphic.png` | Ready |
| Phone screenshots 1080×1920 | `screenshots-listing/1…6.png` (captioned) | Ready — upload 5; skip `6_match_detail.png` unless you hold streaming rights |
| Raw screenshots | `screenshots/` | Alternative, uncaptioned |
| Title, short + full description, promo script | `docs/PLAY_STORE_LISTING.md` | Ready to copy-paste |
| Privacy policy URL | publish the web app, use `https://<domain>/privacy` | You |
| Tablet screenshots | — | Only if you declare tablet support |

## 7. Build and sign the .aab

Full copy-paste runbook: **`docs/RELEASE_BUILD.md`** (keystore, signing config,
manifest entries, `bundleRelease`, `bundletool` verification). This has to run
on your own machine — the build needs the Android SDK and your upload keystore
must never leave it.

## 8. Pre-launch

Upload to **internal testing** first, read the Play Console **pre-launch
report** (it catches crashes, ANRs, accessibility and policy issues on real
devices), fix anything flagged, then promote to production.

## 9. Verified: consent really does run before any ad request

`src/lib/native/ads.consent.test.ts` drives the real ad code against a fake
AdMob plugin and asserts the call ordering. All 9 cases pass:

- `requestConsentInfo` → `showConsentForm` → `initialize`, in that order
- banner, interstitial and rewarded each collect consent before their first
  ad request
- consent is requested **once** even when three ad surfaces start in parallel
- outside the EEA/UK (`NOT_REQUIRED`) no form is shown, but the status is
  still checked before `initialize`
- if the consent check fails (offline), ads still serve non-personalised
- Settings → "Ad privacy options" opens the UMP privacy options form
- on the web build nothing touches AdMob at all

Re-run any time with `npx vitest run src/lib/native/ads.consent.test.ts`.
On-device, confirm the real dialog by installing a fresh build with the device
region set to an EEA country — a published GDPR message in AdMob is required
(section 2, step 3) or the form never appears.

