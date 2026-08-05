# Fantaseer — Twitch Extension Review Walkthrough (v0.0.1)

> For the **Walkthrough Guide and Change Log** field when moving from Hosted Test → Review.

---

## Name of Channel for Review

**Channel:** https://www.twitch.tv/ezexey

This version is activated on the channel above for the review.

**Scheduling preference:** This channel is **not kept permanently live**. Rather than holding a stream open indefinitely while the review is queued, I'd prefer to **schedule a review time**. Please **reach out with instructions on how to schedule a window**, and I'll bring the channel live — with an active Hearthstone session and seeded draft/leaderboard data — for the review team at the agreed time. Contact details are on the Version Details → Contact tab.

---

## What Fantaseer Does

Fantaseer is a game-agnostic fantasy-draft and pick'em platform delivered as a Twitch Extension. Viewers draft lineups and compete on a per-channel leaderboard without leaving the stream. The first supported game is **Hearthstone**; the architecture is built to add more games later.

All three pillars are live in this version:

| Pillar       | Tagline   | Status in v0.0.1                                                          |
| ------------ | --------- | ------------------------------------------------------------------------- |
| **Fantasy**  | Draft 'em | **Live** — viewers draft a lineup; picks that appear in play are rewarded |
| **Scores**   | Beat 'em  | **Live** — per-channel leaderboard rolling up fantasy and Pickaroo points |
| **Pickaroo** | Pick 'em  | **Live** — viewers call what happens next; correct calls score points     |

---

## Broadcaster Setup — Fantaseer Client (HDT plugin)

Fantaseer reads live Hearthstone game state through a companion plugin for **Hearthstone Deck Tracker (HDT)**. This is a required **broadcaster-side** step — viewers install nothing. Authorizing through the plugin is what registers the broadcaster as a Fantaseer **Player** and links the channel; the extension's configuration view expects this Player to already exist.

### Prerequisites

- Windows PC with **Hearthstone** installed
- **Hearthstone Deck Tracker** installed — download: https://hsreplay.net/downloads/

### Step 1 — Download the Fantaseer Client plugin

- Releases: **https://github.com/Foobasaur/Fantaseer.Client/releases** (use the latest release)
- **https://github.com/Foobasaur/Fantaseer.Client/releases/tag/v0.0.1.0**

### Step 2 — Install the plugin into HDT

Either method works. These mirror HDT's official plugin install guide: https://github.com/HearthSim/Hearthstone-Deck-Tracker/wiki/Available-Plugins

**Method A — drag & drop**

1. In HDT, open `Options → Tracker → Plugins`.
2. Drag the downloaded `.zip` / `.dll` into the plugins window.
3. Restart HDT.
4. Enable **Fantaseer** in `Options → Tracker → Plugins`.

**Method B — manual**

1. Extract the download into HDT's plugins folder — default `%AppData%\Hearthstone Deck Tracker\Plugins`, also reachable via `Options → Tracker → Plugins → Plugins Folder`. Keep the archive's folder structure intact.
2. (Re-)start HDT.
3. Enable **Fantaseer** in `Options → Tracker → Plugins`.
4. **If the plugin doesn't show up in the list:** Windows blocks downloaded DLLs — right-click the Fantaseer `.dll` → **Properties** → tick **Unblock** at the bottom → OK, then restart HDT.

### Step 3 — Authorize through the client (creates the Fantaseer Player)

1. With the plugin enabled, click **Fantaseer** in HDT — a panel opens on the left.
2. **Before authorizing, prepare the browser:** the auth flow launches into your default browser and lands in the active window's Twitch session. Bring to the foreground a browser window that is already logged into the Twitch account that will act as broadcaster (for this review: the QA account).
3. Click **Authorize** in the panel. The browser opens to complete Twitch authorization for that account.
4. Completing authorization registers the channel and creates the **Player** that the extension configuration resolves against. Until this has happened, the configuration view has no Player to find and falls back to viewer-only (JWT) identity.

### Step 4 — Verify

- HDT is running with the plugin enabled and authorized.
- The extension configuration view on the channel now resolves the broadcaster as a Player (no fallback).
- Start a Hearthstone game — live game events now feed fantasy scoring and Pickaroo resolution for the channel.

---

## Walkthrough Guide

### 1. Finding the extension

The extension appears in the channel's viewer-facing surface. Open it from the live channel page (https://www.twitch.tv/ezexey) while logged into a viewer Twitch account.

### 2. Identity (required to participate)

- The extension runs **after the viewer shares their Twitch identity** via the "grant permission" prompt. Participation begins once identity is shared.
- The viewer's **username** is what's used for ranking/leaderboard display.
- Configuration is **per broadcaster channel** — the broadcaster sets the extension up for their channel after completing **Broadcaster Setup** above.

### 3. Fantasy — "Draft 'em" (live)

1. Open the **Fantasy** tab.
2. **Start a new draft.**
3. Browse the pickable pool (Hearthstone cards/heroes), using the **filter** controls (set/expansion, mechanics, text search) to narrow results.
4. Tap entities to add them to the **draft deck** drawer (right side). The badge shows `picks / max`.
5. When the draft satisfies its rules, the **Confirm** action submits the lineup.
6. As the streamer plays, picks that **show up in the live game** are matched against the viewer's draft and rewarded — this feeds the leaderboard.

**To demo:** open Fantasy → start a new draft → apply a filter → add picks until valid → Confirm. Drafted entities that subsequently appear in the broadcaster's Hearthstone game register as scoring events.

### 4. Scores — "Beat 'em" (live)

1. Open the **Scores** tab.
2. The **leaderboard** ranks viewers on the channel by points rolled up from fantasy engagement (drafts placed, picks observed in play) and Pickaroo hits.
3. Entries are shown by the viewer's **username**.

**To demo:** after one or more drafts have scoring events, open Scores to see ranked entries update.

### 5. Pickaroo — "Pick 'em" (live)

1. Open the **Pickaroo** tab.
2. When the streamer's game reaches a decision point, an **open Pickaroo** appears with a set of options for what happens next.
3. Tap an option to lock in your call before the Pickaroo closes.
4. When the in-game outcome resolves, calls that match the result are scored as **hits** — these feed the leaderboard alongside fantasy points.

**To demo:** with an open Pickaroo, tap a pick → once the game resolves the outcome, open Scores to see hits reflected in the ranking.

---

## Reviewer Notes

### Environment

- Fantaseer is best demonstrated against an **active Hearthstone** session, since fantasy scoring matches drafted entities to live game state. Because the review benefits from a live game, I've requested a scheduled review window above rather than holding a stream open indefinitely.
- Broadcaster-side game integration requires the **Fantaseer Client** HDT plugin — see **Broadcaster Setup** above. The previously reported `OIDC Player not found. Using JWT extension Viewer fallback` occurs when the configuration view is opened on a channel whose broadcaster has not yet authorized through the client (Broadcaster Setup, Step 3).
- Seeded drafts and leaderboard entries can be made available so the Scores leaderboard is populated immediately at review time.

### Test accounts / access

- Any viewer Twitch account can participate after sharing identity at the "grant permission" prompt.
- The broadcaster configures the extension from the channel's config view **after completing Broadcaster Setup** (plugin installed + authorized).
- **No shared broadcaster credentials are provided** — broadcaster access is self-serve. Authorizing the review team's own QA Twitch account through the Fantaseer Client (Broadcaster Setup, Step 3) creates its Player; that account can then act as broadcaster and use the configuration view on its own channel.

### Known scope limits in v0.0.1

- Single game supported (**Hearthstone**); additional games are roadmap items.
