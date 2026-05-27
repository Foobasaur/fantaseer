# Fantwitly — Twitch Extension Version Details

> Reference for the **Version Details** tab fields required when moving from Hosted Test → Review.
>
> Source: [Twitch Extensions Life Cycle — Moving from Hosted Test to Review](https://dev.twitch.tv/docs/extensions/life-cycle/#moving-from-hosted-test-to-review)

---

## General Settings

### Name

The extension's display name shown to streamers and viewers.

|           |                                                                     |
| --------- | ------------------------------------------------------------------- |
| **Value** | `Fantwitly`                                                         |
| **Notes** | Appears in the Extensions Discovery Directory and on channel pages. |

### Summary

A 1–2 sentence description of what the extension does — visible to both streamers and viewers.

|           |                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------- |
| **Value** | _TODO_                                                                                                        |
| **Draft** | "Fantasy drafts for your favorite games — predict outcomes, draft picks, and compete with chat in real time." |
| **Notes** | Keep it punchy. This is the first text streamers read in the Discovery tab.                                   |

### Description

Extended detail beyond the Summary about the extension's functionality.

|           |                                                                                                                                                                                                                                                                                                                             |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value** | _TODO_                                                                                                                                                                                                                                                                                                                      |
| **Draft** | "Fantwitly is a game-agnostic fantasy draft platform built as a Twitch Extension. Viewers join live drafts, pick from game-specific entities (cards, heroes, champions), and compete on leaderboards — all without leaving the stream. The first supported game is Hearthstone Battlegrounds, with more games coming soon." |
| **Notes** | Can be longer-form. Describe core features, supported games, and how viewers/streamers interact.                                                                                                                                                                                                                            |

### Author Name

Full name of the extension author or organization credited in the Extensions Manager.

|           |                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------- |
| **Value** | _TODO (your name or org name)_                                                                           |
| **Notes** | This is the public-facing credit line. Use a consistent identity across all Twitch developer properties. |

### General Category

Choose the single most appropriate category from the dropdown.

|                       |                                                                                                                                                                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**             | `Extension for Games`                                                                                                                                                                                                             |
| **Alternatives**      | `Viewer Engagement` could work if framing it as game-agnostic community engagement, but since Fantwitly is built specifically to support games (HS as reference, LOL/DOTA planned), **Extension for Games** is the strongest fit. |
| **Available options** | Extension for Games · Games in Extensions · Schedule and Countdowns · Polling and Voting · Loyalty and Recognition · Music · Viewer Engagement · Streamer Tools                                                                   |

### Game Category _(conditionally required)_

Required for extensions integrated with a game; otherwise optional. Select up to 15 games.

|           |                                                                                                                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value** | `Hearthstone` (at minimum for MVP)                                                                                                                                                                       |
| **Notes** | Start typing the game name and the field autocompletes. Add additional games as support is released (League of Legends, Dota 2, etc.). **Required** because Fantwitly is integrated with specific games. |

---

## Image Assets

### Logo Image

|                 |                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------- |
| **Spec**        | **100×100 PNG**                                                                             |
| **Constraints** | No Twitch or Glitch logos. A default is assigned if omitted.                                |
| **Status**      | _TODO — create or commission_                                                               |
| **Notes**       | Should be recognizable at small sizes. Consider the Fantwitly brand mark at this dimension. |

### Taskbar Icon Image _(video-component only)_

|             |                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------- |
| **Spec**    | **24×24 PNG**                                                                                            |
| **Applies** | Only if Fantwitly uses the **video-component** extension type.                                           |
| **Status**  | _TODO — determine if applicable based on extension type_                                                 |
| **Notes**   | Appears at the bottom of the stream video indicating which extension is active. Must be legible at 24px. |

### Discovery Image

The splash screen — first thing streamers see of the extension in the Discovery tab.

|                 |                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**        | **300×200 PNG**                                                                                                                          |
| **Constraints** | Avoid heavy text, excessive detail, and transparency.                                                                                    |
| **Status**      | _TODO — create or commission_                                                                                                            |
| **Tips**        | Show the extension in action (a draft in progress, a pick screen). Minimal text — let the visual sell it. Avoid transparent backgrounds. |

### Screenshot Image

Screenshots showing the extension in action. Best tool to help streamers understand functionality.

|                   |                                                                                                                                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spec**          | Minimum **1024×768** (recommended size), **4:3 aspect ratio**                                                                                                                                               |
| **Formats**       | PNG, JPG, or GIF                                                                                                                                                                                            |
| **Max file size** | 10 MB per image                                                                                                                                                                                             |
| **Minimum count** | 1 (required for review submission)                                                                                                                                                                          |
| **Status**        | _TODO — capture from hosted test_                                                                                                                                                                           |
| **Tips**          | Show: (1) the draft interface with picks in progress, (2) the viewer-facing panel/overlay, (3) the broadcaster config view if applicable. Clear, contextual screenshots dramatically improve install rates. |

---

## Contact & Legal

### Author Email

|                |                                                                                                                                                           |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**      | _TODO_                                                                                                                                                    |
| **Visibility** | **Private** — Twitch uses this for lifecycle notifications. Never revealed publicly.                                                                      |
| **Critical**   | After submission, a verification email is sent. **You must click the link** or you will not receive notifications about upload issues or approval status. |

### Support Email _(optional)_

|                |                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Value**      | _TODO_                                                                                                                    |
| **Visibility** | **Public** — shown to streamers for support queries.                                                                      |
| **Notes**      | Can be the same as Author Email, or a dedicated support address. Optional but recommended for a good streamer experience. |

### EULA or Terms of Service URL

|           |                                                                                                                                   |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Value** | _TODO_                                                                                                                            |
| **Notes** | Must be a publicly accessible URL hosting your Terms of Service or End User License Agreement. Required before review submission. |

### Privacy Policy URL

|           |                                                                                                                                                                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value** | _TODO_                                                                                                                                                                                                                                                        |
| **Notes** | Must be a publicly accessible URL hosting your privacy policy. Required before review submission. Since Fantwitly handles viewer identity (opaque IDs, optional identity linking), the policy should cover data collection, storage, and third-party sharing. |

---

## Submission Checklist

- [ ] **Drafts** — singulation ie: retire/replace current
- [ ] **Drafts** — filtration ie: coorect filter results for patchs
- [ ] **pubSub** — events ie: replace useEventSource with pubsubs
- [ ] **pickaroo** — move to coming soon
- [ ] **productionify** — move repos to github org ie its public domainspace
- [ ] **Name** — finalized
- [ ] **Summary** — 1–2 sentences, reviewed
- [ ] **Description** — detailed, accurate to current feature set
- [ ] **Author Name** — set
- [ ] **General Category** — selected (`Extension for Games`)
- [ ] **Game Category** — at least `Hearthstone` added
- [ ] **Logo Image** — 100×100 PNG uploaded
- [ ] **Taskbar Icon** — 24×24 PNG uploaded _(if video-component)_
- [ ] **Discovery Image** — 300×200 PNG uploaded
- [ ] **Screenshot(s)** — at least one, 1024×768+, 4:3 ratio
- [ ] **Author Email** — entered and **verified** (clicked confirmation link)
- [ ] **Support Email** — entered _(optional but recommended)_
- [ ] **EULA / ToS URL** — publicly accessible
- [ ] **Privacy Policy URL** — publicly accessible

> **Reminder:** If you need to change any Version Details after entering Hosted Test, you must move back to Local Test first.

**DEVIATION:** Roboto-only response (no Claude/Claudio/Claudius split).
**REASON:** Three of four sub-tasks are unambiguous mechanical execution (memory updates, file diff listing, re-rendering with a stated constraint); the one creative decision (how the tri-color gradient distributes across the mark) doesn't warrant four-lens synthesis.
**JUSTIFICATION:** User memory convention — _"For unambiguous mechanical changes, single Roboto-only response is preferred."_

---

## 1. Memory updates

Viewing current edits, then applying the rename.Memory saved. Now locating the instructions file in the project.Memory saved. Now surveying the instructions file for rename scope.

---

## 2. Changes to `.github/copilot-instructions.md`

The attached project instructions file contains the `Fantwitly` name directly but — confirming via project knowledge search — does not explicitly name `Predictachu` or describe its functionality. So the direct edits to the instructions file are minimal; related files need broader touches.

### Required edits (instructions.md itself)

**Scope section, opening sentence:**

```diff
- **Fantwitly** is a **game-agnostic Twitch Extension platform** for fantasy-style
-   predictions and drafting. Hearthstone integration serves as the **reference MVP
-   implementation**, not the sole use case.
+ **Fantaseer** is a **game-agnostic Twitch Extension platform** for fantasy-style
+   drafting and pick'em wagering. Hearthstone integration serves as the **reference
+   MVP implementation**, not the sole use case.
```

### Recommended edit (worth considering — because Pickaroo wagers are platform-level, not game-specific)

**Core Principle, to surface wagers as a first-class platform concept:**

```diff
- **Core Principle:** Platform features (events, drafts, picks, viewers) are
-   game-agnostic.
+ **Core Principle:** Platform features (events, drafts, picks, wagers, viewers)
+   are game-agnostic.
```

---

### Related files that also need renames (flagged, not scoped to your ask)

These aren't in `.github/copilot-instructions.md` but will diverge from the canonical naming if left alone:

| File                                                 | Change                                                                                                                                                                |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLAUDE.md` — Project Overview line                  | `Fantwitly` → `Fantaseer`; `predictions and drafting` → `drafting and pick'em wagering`                                                                               |
| `CLAUDE.md` — Features block                         | `**Predictachu**: Rolling lottery predictions with wagers and odds` → `**Pickaroo**: Rolling pick'em wagers with odds calculations`                                    |
| `CLAUDE.md` — Adding a New Game step 4               | `prediction templates` → `pick'em templates` (or `wager templates`)                                                                                                   |
| `CLAUDE.md` — Key Directories list                   | `(fantasy, pickaroo, scores)` → `(fantasy, pickaroo, scores)`                                                                                                       |
| `src/lib/server/db/schema/enums.ts`                  | `slugs` pgEnum: `'pickaroo'` → `'pickaroo'` (requires migration)                                                                                                    |
| `src/lib/games/HS/features/pickaroo/`             | Directory rename → `pickaroo/`                                                                                                                                         |
| `src/routes/app/[game]/[[mode]]/pickaroo/`        | Route rename → `pickaroo/`                                                                                                                                             |
| `src/lib/games/types.d.ts`                           | `IPredictachu<TKeys>` → `IPickaroo<TKeys>`; rename `pickaroo` field on `IGame`                                                                                      |
| `src/lib/games/HS/features/pickaroo/templates.ts` | Export `pickaroo` → `pickaroo`; type `IPredictachu` → `IPickaroo`                                                                                                    |
| `src/lib/server/types.d.ts`                          | `EBS.Predictachu` → `EBS.Pickaroo`; `pickaroo.get` references                                                                                                       |
| `src/lib/svelted/app.svelte.ts`                      | `fabItems` entry: slug `'pickaroo'` → `'pickaroo'`, tagline `"Predict 'em"` → `"Pick 'em"`; `Routers` type; `'pickaroo:load'` invalidate key; `getFabItem` union |
| UI strings (Predictachu page, summaries)             | `"Predictioneers"`, `"Total Votes"` etc. → pick'em-appropriate labels (`"Pickerz"`, `"Pick'em Wagers"`, etc. — Elie's call on voice)                                  |

This is the scope a full codebase rename would cover. Happy to produce a Claude Code-ready self-contained prompt for the rename if Elie wants to hand it off.

---

## 3. Triad glyph, redone

Gradient of the three emoji as distinct colors — sparkle (purple), bolt (yellow/Pickaroo), trophy (gold). 24×24 sparkle uses a linear gradient through all three; the 100×100 and 300×200 let each shape carry its dedicated color so the "three pillars" reading stays clean.---

### Color choices — open for tuning

The palette picked:

- **Fantasy ✨ → `#9147FF`** (Twitch purple, keeps brand affinity)
- **Pickaroo ⚡ → `#FFD93D`** (electric yellow, plays the Pokémon wink without being too literal)
- **Scores 🏆 → `#F5B800`** (warm gold, sits right next to the yellow without clashing)

Pickaroo-yellow and Scores-gold are close neighbors on the wheel. That's intentional — they read as "sibling features" while purple (Fantasy) stands apart as the strategic/drafting pillar. If Elie wants more separation between Pickaroo and Scores, shifting Scores toward a deeper amber (`#D97706`) or a coppery tone (`#C2570C`) widens the gap without breaking the warm triad.

Say the word if Elie wants the color swatch regenerated with alternatives, the same treatment applied to the other three directions (Fw monogram / Pick cursor / Grid of picks), or a Claude Code-ready prompt for the full `Predictachu → Pickaroo` codebase rename.


![alt text](image-3.png)