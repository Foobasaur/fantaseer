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

## Walkthrough Guide

### 1. Finding the extension

The extension appears in the channel's viewer-facing surface. Open it from the live channel page (https://www.twitch.tv/ezexey) while logged into a viewer Twitch account.

### 2. Identity (required to participate)

- The extension runs **after the viewer shares their Twitch identity** via the "grant permission" prompt. Participation begins once identity is shared.
- The viewer's **username** is what's used for ranking/leaderboard display.
- Configuration is **per broadcaster channel** — the broadcaster sets the extension up for their channel.

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
- Seeded drafts and leaderboard entries can be made available so the Scores leaderboard is populated immediately at review time.

### Test accounts / access

- Any viewer Twitch account can participate after sharing identity at the "grant permission" prompt.
- The broadcaster configures the extension from the channel's config view.

### Known scope limits in v0.0.1

- Single game supported (**Hearthstone**); additional games are roadmap items.
