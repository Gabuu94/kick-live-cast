# Play Console walkthrough — Football Live TV

Everything here is done by you, in your own Google account, at
<https://play.google.com/console>. One-off developer account fee: $25.
Values to copy come from `docs/PLAY_STORE_LISTING.md`, assets from
`/mnt/documents/play-store/`, the build from `docs/RELEASE_BUILD.md`.

---

## 1. Create the app + basic info

**All apps → Create app**

| Field | Value |
| --- | --- |
| App name | `Football Live TV: Scores` |
| Default language | English (United States) or English (United Kingdom) |
| App or game | App |
| Free or paid | Free (cannot be changed to free later — choose Free) |
| Declarations | Tick Developer Programme Policies + US export laws |

Then **Create app**.

### 1a. Store listing
Left menu → **Grow → Store presence → Main store listing**

- Short description → the 80-char line in `PLAY_STORE_LISTING.md`
- Full description → the long block in the same file
- App icon → `play-store/app-icon-512.png`
- Feature graphic → `play-store/feature-graphic.png`
- Phone screenshots → upload 5 from `play-store/screenshots-listing/`
  (`1…5.png`). **Do not upload `6_match_detail.png`** — it reads as a
  streaming-rights claim.
- Save.

### 1b. Store settings
**Grow → Store presence → Store settings**
- App category: **Sports**
- Tags: Football, Live scores, Sports news
- Email: `support@footballlivetv.app` (must be a mailbox you actually read)
- Website: `https://kick-live-cast.lovable.app`

### 1c. Privacy policy
**Policy → App content → Privacy policy → Start**
Paste: `https://kick-live-cast.lovable.app/privacy` → Save.
(Publish your own domain later and update this URL; it must load with no login.)

## 2. App content (the questionnaire wall)

**Policy → App content.** Complete every card; Play blocks release until all are green.

1. **Ads** → *Yes, my app contains ads*.
2. **App access** → *All functionality is available without special access*.
3. **Content rating** → start questionnaire.
   - Category: **Reference, News or Educational** → then Sports content
   - Violence / sexual / language / controlled substance: **No** to all
   - **Simulated gambling: No**. **Real gambling: No** (odds are display-only,
     no link-out, no wagering, no virtual currency)
   - Ads: Yes · Shares location: No · Digital purchases: No
   - Submit → you'll get IARC ratings (typically PEGI 3 / ESRB Everyone; the
     listing can still state 18+ guidance for the odds panel)
4. **Target audience and content** → age groups **18 and over** only.
   Never tick under-13 — that would ban your AdMob setup.
5. **News app** → **No** (aggregated headlines, not first-party journalism).
6. **Data safety** → *Yes, my app collects or shares user data*, then:
   - **Device or other IDs** → Collected, **not** shared, *optional*,
     purposes: **App functionality** + **Advertising or marketing**
   - **App activity → Other user-generated content** (followed clubs, alert
     prefs) → Collected, not shared, optional, **App functionality**
   - Encrypted in transit: **Yes**
   - Users can request deletion: **Yes** (turning alerts off deletes the push
     registration; give the support email)
   - Do **not** answer "no data collected" — AdMob always collects the ad ID.
7. **Government apps** → No. **Financial features** → None.
8. **Health** → No. **Advertising ID** → declare used for **Advertising**.

## 3. Upload the .aab + Play App Signing

Build the bundle first with `docs/RELEASE_BUILD.md` (needs JDK 17 + Android
Studio on your own machine).

**Release → Testing → Internal testing → Create new release**

On your very first upload Play shows **"Play App Signing"**:
- Click **Continue / Accept** on *Use Play App Signing* (it's now mandatory for
  new apps). Google generates and holds the **app signing key**; your
  `footballlivetv-upload.jks` becomes only the **upload key**.
- Nothing else to configure. Later find it under
  **Release → Setup → App integrity → App signing** — that page shows the
  SHA-1/SHA-256 of the app signing certificate. Copy the **SHA-256** into
  Firebase (for FCM) and into AdMob if asked.
- Back up `footballlivetv-upload.jks` + passwords offline. Losing it means
  requesting an upload-key reset from Google.

Then in the release form:
- Drag in `app-release.aab`
- Release name: `1.0.0 (1)`
- Release notes (`<en-US>`): "First release — live scores, fixtures, tables,
  match centre and the TV guide."
- **Next → Save → Review release → Start rollout to Internal testing**

> Do the first upload to **Internal testing**, not Production. Internal testing
> is instant (no review wait) and lets you catch crashes before a real review.
> Promote to Production only after step 5.

## 4. Internal testing: testers + install check

**Release → Testing → Internal testing → Testers tab**

1. **Create email list** → name it `Core testers` → paste emails (up to 100),
   one per line, including your own Google account → Save changes.
2. Tick the list → **Save**.
3. **Copy link** at the bottom → that's the opt-in URL.
4. On your phone: sign in to the Play Store with a tester email → open the
   link → **Become a tester** → **Download it on Google Play** → Install.
   - Link 404s or "not available"? Wait ~10 minutes after rollout, confirm the
     phone's active Play account matches the tester email, and confirm the
     release status is *Available to internal testers*.
5. Smoke test on the device:
   - App launches without crashing → your AdMob **APPLICATION_ID** in the
     manifest is correct (a missing one crashes on launch)
   - First-run legal notice appears once
   - Set the device region to an EEA country on a fresh install → the **consent
     dialog** appears before any ad
   - Enable alerts → accept the notification permission → send a test push from
     Firebase → tapping it opens the **correct match screen** (deep link)
   - Watch tab lists official sources; scores/fixtures/tables load

(Optional wider ring: **Closed testing → Create track** with an email list or a
Google Group, same flow. Play requires closed testing with 12+ testers for 14
days only for **personal** developer accounts created after Nov 2023 — an
organisation account skips it.)

## 5. Pre-launch report

**Release → Testing → Pre-launch report → Overview.** It appears ~1 hour after
any track rollout: Google runs your APK on real devices and robo-crawls it.

Tabs and what to do:

| Tab | What matters | Fix |
| --- | --- | --- |
| **Stability** | Crashes/ANRs per device | Read the stack trace + logcat link. Crash on launch = missing AdMob app ID or missing `google-services.json`. ANR = long work on the main thread. |
| **Performance** | Startup time, frame drops | Non-blocking, but slow start hurts install rates. |
| **Accessibility** | Small touch targets (<48dp), low contrast, missing labels | Non-blocking warnings; fix labels on icon-only buttons. |
| **Security & trust** | Insecure HTTP, exposed keys, vulnerable SDKs | **Must fix.** Ensure every endpoint is HTTPS and no secret keys ship in the bundle. |
| **Screenshots** | What the crawler saw | Use it to confirm the crawler reached real screens, not a blank page. |
| **Deprecated / policy** | targetSdk, SDK warnings | Bump `targetSdk` to the currently required level. |

Errors are **red = must fix and re-upload with a higher `versionCode`**;
amber = advisory.

## 6. Readiness checks before Production

Play's **Publishing overview** must show zero blockers. Confirm all of:

- [ ] All **App content** cards green (Data safety, content rating, target
      audience, ads, news, app access, advertising ID)
- [ ] Privacy policy URL live and reachable without login
- [ ] Main store listing complete: icon, feature graphic, 4–8 screenshots,
      short + full description
- [ ] Store settings: category, contact email, tags
- [ ] Countries/regions selected under **Production → Countries / regions**
- [ ] Play App Signing enrolled; upload keystore backed up
- [ ] Real AdMob unit IDs, `VITE_ADMOB_TESTING=false`, AdMob app ID in the
      manifest, GDPR + US-states messages published in AdMob
- [ ] Permissions limited to INTERNET, POST_NOTIFICATIONS,
      RECEIVE_BOOT_COMPLETED, AD_ID, VIBRATE (+ SCHEDULE_EXACT_ALARM only if
      you keep exact kick-off reminders)
- [ ] `versionCode` higher than anything previously uploaded
- [ ] Pre-launch report has no red errors
- [ ] Installed and smoke-tested from the internal track on a real device
- [ ] Listing does **not** promise free streams of paid broadcasts

Then: **Release → Production → Create new release → promote the tested
bundle → Review release → Start rollout to Production.** Choose a staged
rollout (10–20%) for the first version. Review usually takes a few hours to
7 days for a brand-new developer account.
