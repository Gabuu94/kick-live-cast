# In-app streams, live ticker, predictions, ad-before-content

## One thing I can't do as asked

I can't put links to matches we don't have rights to inside the app. Any app that plays paid
broadcasts for free gets removed from Google Play and loses its AdMob account, usually within days.

What I can do — and what this plan does — is make every source we *are* allowed to use actually
play inside the app instead of bouncing you to a website, and give you a simple place to paste any
feed you license yourself.

## 1. Watch tab: real playback, not link-outs

- Official channels (FIFA+, UEFA.tv, CAF, LaLiga, Bundesliga, Serie A) that allow embedding now
  play in a full-screen in-app player right in the Watch tab — tap a source, it plays there.
- Free-to-air broadcaster feeds that publish an open live stream play directly in the app player.
- Anything that legally can't be embedded still opens the broadcaster's own page, clearly labelled
  "opens on the broadcaster" so nobody taps expecting playback.
- A "My sources" box in Settings: paste a stream address you own or license, give it a name and the
  leagues it covers, and it appears everywhere in the app as a playable source. Saved on the device,
  no rebuild needed.

## 2. Live scores ticker + instant goal alerts

- A slim ticker pinned under the header on every screen: live matches scroll past with score and
  minute, tap one to open it. Hidden when nothing is in play.
- Live screens refresh every 15 seconds, and the match screen flashes the score and plays a short
  pulse the moment a goal lands.
- Goal push alerts: when the feed reports a goal in a match you follow, a push fires and opens that
  exact match screen. This reuses the alert rules and the anti-spam throttle already built.

## 3. Predictions tab

New bottom-tab "Predict" with, per upcoming match:

- Win / draw / win percentages with a visual bar.
- A predicted score line.
- Form (last 5) for both sides, head-to-head record, and the two or three reasons behind the call
  (form, home advantage, goals scored/conceded).
- Confidence badge: High / Medium / Low.
- Marked clearly as statistical estimates, not betting advice — required for the 18+ store listing.

## 4. Ad before content on "Watch live"

- Tapping Watch live, or opening the Predict tab or the Watch tab, shows a full-screen ad first,
  then the content. On the Watch live button it's a rewarded ad; on tab entry it's an interstitial.
- Guardrails so this doesn't feel broken or breach ad policy: never on first app launch, at most one
  full-screen ad every 60 seconds, and if the ad fails to load the content opens anyway.
- On the web preview there are no ads, so content opens immediately.

## Technical notes

- Predictions computed in `src/lib/predict.ts` from SportMonks form, goals and H2H; served through a
  server function so the token stays server-side. Demo fallback when the feed is down.
- Ticker polls the existing `useMatches()` query at a 15s interval; goal detection diffs the previous
  score snapshot per match id and fires the existing local/push notification path with the dedupe
  ledger in `src/lib/push/dedupe.ts`.
- `src/lib/streams.ts` gains `embeddable` handling plus a device-local custom-source store; the Watch
  tab renders the existing `HlsVideo` / YouTube iframe player inline for those.
- Ad gate lives in one `useAdGate()` hook wrapping `showRewarded` / `showInterstitial` with the
  frequency cap, used by the Watch live button and the Predict/Watch route entries.
