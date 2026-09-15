# Building and signing the production .aab

This must run on a machine with **JDK 17** and the **Android SDK** (Android
Studio). It cannot be produced in the Lovable sandbox — there is no Android
toolchain and, more importantly, your upload keystore must never leave your
machine.

Copy-paste the whole block, then follow section 4.

## 1. Get the project locally

```bash
git clone <your-repo> footballlivetv && cd footballlivetv
npm install
```

## 2. Point the build at your real AdMob units

Your real units are already in `.env.production`. It should look like this:

```bash
VITE_ADMOB_BANNER_ID=ca-app-pub-2683576802120823/6097625127
VITE_ADMOB_INTERSTITIAL_ID=ca-app-pub-2683576802120823/6257407222
VITE_ADMOB_REWARDED_ID=ca-app-pub-2683576802120823/3735632771
VITE_ADMOB_TESTING=false
```

Shipping the built-in Google test unit IDs to production is an AdMob policy
violation; leaving `VITE_ADMOB_TESTING=true` serves test ads forever.

## 3. Add the Android platform and native assets

```bash
npm run build
npx cap add android            # first time only — creates android/
npx cap sync android
npx @capacitor/assets generate --android \
  --iconBackgroundColor '#0A1220' --iconBackgroundColorDark '#0A1220' \
  --splashBackgroundColor '#0A1220' --splashBackgroundColorDark '#050A14'
```

That reads `resources/icon.png`, `resources/splash.png` and
`resources/splash-dark.png` (all regenerated with the new logo) and writes
every launcher density, the adaptive icon and both splash screens.

Then edit `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- inside <application> — the app crashes on launch without this -->
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-XXXXXXXXXXXXXXXX~4444444444"/>

<!-- inside the main <activity>, alongside the existing intent filters -->
<intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="footballlivetv" android:host="match" />
</intent-filter>
```

Confirm the permission list is only:
`INTERNET`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`,
`SCHEDULE_EXACT_ALARM` (only if you keep exact kick-off reminders),
`com.google.android.gms.permission.AD_ID`, `VIBRATE`. Delete anything else.

Push notifications also need `android/app/google-services.json` from your
Firebase project (Project settings → Your apps → Android, package
`com.footballlivetv.app`).

## 4. Create the upload keystore (once — then back it up)

```bash
keytool -genkey -v -keystore ~/footballlivetv-upload.jks \
  -alias upload -keyalg RSA -keysize 2048 -validity 10000
```

Lose this file and you can never update the app under the same listing
(unless you enrol in Play App Signing key reset). Back it up somewhere
offline; never commit it.

`android/key.properties` (add to `.gitignore`):

```properties
storeFile=/absolute/path/to/footballlivetv-upload.jks
storePassword=…
keyAlias=upload
keyPassword=…
```

In `android/app/build.gradle`, above `android {`:

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("key.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

and inside `android { … }`:

```gradle
signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

Keep `versionCode` / `versionName` in `defaultConfig` in step with
`APP_BUILD` / `APP_VERSION` in `src/lib/app-info.ts` (currently **1** /
**1.0.0**). Every upload needs a higher `versionCode`.

## 5. Build the bundle

```bash
cd android && ./gradlew clean bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

Verify before uploading:

```bash
# signature present
jarsigner -verify -verbose -certs app-release.aab | head -5
# install the exact APKs Play would generate, on a real device
bundletool build-apks --bundle=app-release.aab --output=fltv.apks \
  --ks=~/footballlivetv-upload.jks --ks-key-alias=upload --mode=universal
bundletool install-apks --apks=fltv.apks
```

Smoke-test on the device: launch (no crash = the AdMob app ID is right), see
the consent dialog on a fresh EEA install, enable alerts, tap a test push,
confirm it deep-links to the match screen.

## 6. Upload

Play Console → your app → Testing → **Internal testing** → Create release →
upload the `.aab`. Read the **pre-launch report** (real-device crashes, ANRs,
policy and accessibility issues), fix, then promote to Production.

Enrol in **Play App Signing** when prompted — Google then holds the app
signing key and your keystore is only the upload key.
