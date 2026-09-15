# Football Live TV — build the Android app and publish it (baby steps)

Everything in the project is ready. The Android project now lives in the
`android/` folder, with your AdMob app ID already inside the manifest.

## What you need on your own computer (once)

1. Install **Node.js** (LTS) — https://nodejs.org
2. Install **Android Studio** — https://developer.android.com/studio
   During setup accept the Android SDK + build tools.
3. Install **Java 21 JDK** (Android Studio usually ships one).

The building must happen on your computer — it cannot be done here.

## Step 1 — Get the code

- In Lovable, click **GitHub → Connect / Export to GitHub**.
- On your computer: `git clone <your repo>` then `cd` into it.
- Run `npm install`.

## Step 2 — Open the Android project

```
npx cap sync android
npx cap open android
```

Android Studio opens. Wait for "Gradle sync finished" at the bottom.

## Step 3 — Test with FAKE ads first

1. Open `.env` (create it if missing) and put `VITE_ADMOB_TESTING="true"`.
2. In Android Studio press the green ▶ Run button with your phone plugged in
   (USB debugging on) or an emulator selected.
3. The app opens. You should see a banner at the bottom, an interstitial when
   you open Predict/Watch, and a rewarded ad on "Watch live".
4. **Never tap your own real ads.** Only tap the test ones.

## Step 4 — App icon and splash

```
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#0b1a14' --iconBackgroundColorDark '#0b1a14' \
  --splashBackgroundColor '#0b1a14' --splashBackgroundColorDark '#0b1a14'
npx cap sync android
```

## Step 5 — Make your signing key (once, keep it forever)

```
keytool -genkey -v -keystore football-live-tv.jks -alias footballlivetv \
  -keyalg RSA -keysize 2048 -validity 10000
```

Save the file and the passwords somewhere safe. If you lose it you can never
update your app again.

Create `android/key.properties`:

```
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=footballlivetv
storeFile=/full/path/to/football-live-tv.jks
```

In `android/app/build.gradle`, above `android {`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

and inside `android { ... }`:

```gradle
signingConfigs {
    release {
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled false
    }
}
```

## Step 6 — Build the upload file (.aab)

Set `VITE_ADMOB_TESTING="false"` back (real ads), then:

```
npm run build
npx cap sync android
cd android
./gradlew clean bundleRelease
```

Your file: `android/app/build/outputs/bundle/release/app-release.aab`

## Step 7 — Play Console

Follow `docs/PLAY_CONSOLE_WALKTHROUGH.md` click by click:

1. Create the app — name **Football Live TV: Scores**, Free, English.
2. Store listing — icon, feature graphic, screenshots from
   `/mnt/documents/play-store/` and the text in `docs/PLAY_STORE_LISTING.md`.
3. Privacy policy — `https://livefootball.dev/privacy`
4. App content — ads = YES, target age **18+**, data safety answers from
   `docs/PLAY_STORE_CHECKLIST.md`.
5. Upload the `.aab` to **Internal testing** first, enrol in Play App Signing.
6. Add yourself as a tester, install from the test link, check it works.
7. Read the pre-launch report, fix anything red.
8. Then promote to **Production** with a 10–20% staged rollout.

## Reminders

- App ID already in the manifest: `ca-app-pub-2683576802120823~9075142252`
- Banner / Interstitial / Rewarded IDs are in `.env.production`
- Ads only appear in the Android app, never on the website.
- The app shell loads `https://livefootball.dev`, so publish the site in
  Lovable before shipping an app update.
