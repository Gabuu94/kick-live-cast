# Where to get real data for Football Live TV

The app currently runs on demo data in `src/lib/football-data.ts` and derived
odds in `src/lib/odds.ts`. Swap those two modules for live feeds and the whole
UI keeps working.

## 1. Live scores, fixtures, standings, lineups, events

| Provider | Coverage | Live latency | Cost | Notes |
|---|---|---|---|---|
| **API-Football (api-sports.io)** | 1,100+ leagues, events, lineups, stats, injuries, predictions | ~15s | Free 100 req/day, paid from ~$19/mo | Best all-round starting point; single API covers everything this app shows |
| **SportMonks Football** | Global, very deep (xG, pressure index) | ~5-10s | From ~€39/mo | Excellent docs, good for scaling |
| **Sportradar / Stats Perform (Opta)** | Official, sub-second | Enterprise (4-5 figures/yr) | What broadcasters use — overkill until you have scale |
| **football-data.org** | Top ~13 European leagues | Minutes | Free tier | Fine for a beta, too slow for "live" |
| **LiveScore / FlashScore feeds** | Global | Fast | Licensed | Only via commercial agreement — do not scrape |

Recommended start: **API-Football**. One key, one base URL, JSON that maps
almost 1:1 to the `Match`, `StandingRow` and `MatchEvent` types already defined.

Wire it as a server function (`src/lib/*.functions.ts`) so the API key stays on
the server, and cache responses for 10-15s to stay inside rate limits.

## 2. Odds

| Provider | Notes |
|---|---|
| **The Odds API** (the-odds-api.com) | Simplest: 1X2, totals, BTTS across 40+ bookmakers. Free 500 req/mo |
| **OddsJam / OpticOdds** | Real-time push, in-play odds, more bookmakers, paid |
| **API-Football odds endpoint** | Included in the same subscription — pre-match only |
| **Bookmaker affiliate feeds** (Bet365, 1xBet, Betway partner programmes) | Free odds + revenue share, but adds gambling-content obligations on Play Store |

`src/lib/odds.ts` already returns the shape these APIs use (decimal 1X2,
over/under line, BTTS), so it is a drop-in replacement.

Play Store note: showing odds is fine as informational content, but linking to
a bookmaker turns the app into a **real-money gambling app** with a separate
Play policy, country restrictions and an 18+ rating. Keep odds display-only
unless you go through that certification.

## 3. Live streaming

There is **no legal public API for live football video.** Streams are sold
territory by territory. Your realistic options:

1. **Affiliate/partner streams** — bookmakers (Bet365, 1xBet) and services like
   Sportradar's Live Channel license in-play video to partners. This is how most
   Play Store "live football" apps actually operate.
2. **Official rights holders** — deep-link out to the broadcaster's app
   (SuperSport, Sky, DAZN, beIN) instead of embedding. Zero legal risk, and the
   `channels` field already drives this.
3. **Free-to-air/OTT channels** — some federations and free channels publish
   HLS URLs you may embed with permission.
4. **Your own rights** — for lower leagues, buying regional digital rights is
   cheap and gives you something no competitor has.

### What is already built (free legal streaming)

`src/lib/streams.ts` is a directory of rights holders' **own free services** —
FIFA+, UEFA.tv, CAF TV, SABC Sport, RTVE, RaiPlay, ARD/ZDF, ITVX, TF1, StarTimes
and the official league YouTube channels. The Watch tab (`/watch`) filters them
by the viewer's country, and the match screen shows the ones relevant to that
league.

Three source kinds are supported by `src/components/stream-player.tsx`:

| Kind | Behaviour |
| --- | --- |
| `youtube` | Plays in-app through YouTube's own IFrame embed (sanctioned, ads are YouTube's) |
| `hls` | Plays in-app with `hls.js` / native HLS — use only for feeds you're licensed for |
| `web` | Opens the broadcaster's site or app — always safe |

In-app playback is deliberately gated: a source is only offered as "watch free"
when it is embeddable **and** declares the match's league. Everything else is a
link-out, so the app never promises a stream it can't deliver.

Add your own sources with no code change via the `VITE_STREAM_SOURCES` env var
(JSON array of `StreamSource`); they take priority over the built-ins. That is
where a licensed HLS URL or a bookmaker/Sportradar feed goes if you buy one.

### Keeping it legal

Never re-stream, proxy or scrape IPTV `.m3u8` links, and never embed a YouTube
video whose owner disabled embedding. Both are a fast route to a Play Store
takedown and a DMCA claim. Free coverage genuinely varies by country — the UI
says so rather than implying every match is free.


## 4. News

- **NewsAPI.org** / **GNews** — keyword-filtered football headlines, free tier
- **RSS** from BBC Sport, Sky Sports, Goal, ESPN — free, just parse the feed
- API-Football also exposes transfers and injuries, which read like news

## 5. Push events

Point your feed poller at `POST /api/public/push/events` with the
`x-push-secret` header; dedupe, throttling and fan-out are already handled.

## Suggested stack for launch

- API-Football (scores, fixtures, standings, events, lineups)
- The Odds API (odds)
- RSS aggregation (news)
- Broadcaster deep links, upgraded to affiliate streams once traffic justifies it
- AdMob: anchored banner + interstitial every 3 screens + rewarded unlock
