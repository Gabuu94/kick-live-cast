# AdMob setup — Football Live TV

## Your real IDs

| Item | Value |
| --- | --- |
| AdMob App ID (Android) | `ca-app-pub-5118856418936874~9292290757` |
| Banner unit | `ca-app-pub-5118856418936874/4487520788` |
| Interstitial unit | `ca-app-pub-5118856418936874/7132022115` |
| Rewarded interstitial unit | `ca-app-pub-5118856418936874/6221818012` |
| Rewarded unit | `ca-app-pub-5118856418936874/7207596625` |

## 1. App ID in the Android project

Already set in `android/app/src/main/AndroidManifest.xml`:

```xml
<meta-data
    android:name="com.google.android.gms.ads.APPLICATION_ID"
    android:value="ca-app-pub-5118856418936874~9292290757"/>
```

Without this line the app crashes on launch.

## 2. Unit IDs

They are in `.env.production`. Production builds pick them up automatically,
and `VITE_ADMOB_TESTING=false` turns off test mode.

## 3. Where ads appear

| Placement | Type |
| --- | --- |
| App launch (about 1s after the first screen) | full-screen interstitial, once per app open |
| Switching section (Watch, Predict, Standings…) | full-screen interstitial, max 1 every 45s |
| Opening the Watch tab / Predict tab | full-screen ad gate before the content |
| "Watch live" on a stream | rewarded video |
| Every screen | anchored bottom banner |
| Inside lists | in-feed banner every 5 cards |

## 4. app-ads.txt

`public/app-ads.txt` lists both publisher IDs. In AdMob → Settings →
app-ads.txt, set the developer website to `livefootball.dev` and verify.

## 5. Warning

Never tap your own live ads — AdMob bans accounts for invalid traffic.
Test on your device with `VITE_ADMOB_TESTING="true"`.
