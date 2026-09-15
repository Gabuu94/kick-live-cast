# AdMob setup — Football Live TV

## Your real IDs

| Item | Value |
| --- | --- |
| AdMob App ID (Android) | `ca-app-pub-2683576802120823~9075142252` |
| Banner unit | `ca-app-pub-2683576802120823/6097625127` |
| Interstitial unit | `ca-app-pub-2683576802120823/6257407222` |
| Rewarded unit | `ca-app-pub-2683576802120823/3735632771` |

## 1. App ID in the Android project

In `android/app/src/main/AndroidManifest.xml`, inside `<application>`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-2683576802120823~9075142252"/>
```

Without this line the app crashes on launch.

## 2. Unit IDs

They are already in `.env.production`. Production builds pick them up
automatically, and `VITE_ADMOB_TESTING=false` turns off test mode.

## 3. Still to do

All three ad units are created and wired into `.env.production`.

## 4. Warning

Never tap your own live ads — AdMob bans accounts for invalid traffic.
Test on your device with `VITE_ADMOB_TESTING="true"`.
