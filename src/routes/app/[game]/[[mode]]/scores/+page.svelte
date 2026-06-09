<script lang="ts">
import { invalidate } from '$app/navigation';
import { usePubSub } from '$lib/core/twitch/svelted/twitch.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';
import { emojiFace, eqludes } from '$lib/utilz/stringz';

// ENHANCEMENT: show ↑/↓ when an invalidate-triggered reload shifts ranks.
// snapshot lives in module scope as a closure variable, not $state — read
// inside the derived returns the prior ranks, then we capture new ranks for
// the next read. The plain-let mutation is intentional: writes aren't tracked,
// so the derived has only data/params.mode as dependencies.
let snapshot = new Map<number, number>();

// ── Props
let { data, params } = $props();

// ── Derived reactive state ──────────────────────────────────────────────
const { totals, previous } = $derived.by(() => {
  const totals = data.totals.find(t => t.category?.mode === params.mode);
  const previous = snapshot;
  if (totals) snapshot = new Map(totals.scores.map(s => [s.viewerId, s.rank]));
  return { totals, previous };
});
type Entry = NonNullable<typeof totals>['scores'][number];

// ENHANCEMENT: classic stadium podium order (silver–gold–bronze).
// The viewer's eye lands on the center first; rank 1 belongs there.
// `.filter(Boolean)` keeps things sane when there are fewer than 3 entries.
const podium = $derived(totals?.scores && [totals.scores[1], totals.scores[0], totals.scores[2]].filter(Boolean));
const leaderboard = $derived(totals?.scores.slice(3));

// ── Helpers ─────────────────────────────────────────────────────────────

// Format score: numbers ≥1000 become "1.2k". Optional icon prefix for flair.
const format = (score: number) => (score >= 1000 ? (score / 1000).toFixed(1) + 'k' : score);
// ── Live updates ────────────────────────────────────────────────────────
usePubSub({
  'events:created': _ => invalidate(data.dependz),
  'pickems:updated': _ => invalidate(data.dependz),
  'pickaroos:updated': _ => invalidate(data.dependz),
  'players:updated': _ => invalidate(data.dependz),
  '*': _ => invalidate(data.dependz)
});
</script>

<Header />

<!-- ── Snippets ────────────────────────────────────────────────────────── -->

{#snippet Avatar(entry: Entry)}
  <div class="avatar avatar-placeholder">
    <div
      class={[
        'rounded-full ring ring-offset-2 ring-offset-base-100',
        'bg-neutral text-neutral-content',
        entry.rank === 1 ? 'text-9xl w-24 ring-success'
        : entry.rank === 2 ? 'text-8xl w-20 ring-info'
        : entry.rank === 3 ? 'text-7xl w-16 ring-warning'
        : 'text-5xl w-8'
      ]}>
      {#if false && entry.avatar && !eqludes(entry.avatar, 'user-default-pictures')}<img
          src={entry.avatar}
          alt={entry.username} />
      {:else}<span>{emojiFace[entry.viewerId % emojiFace.length]}</span>{/if}
    </div>
  </div>
{/snippet}

<!-- ENHANCEMENT: movement indicator. Only renders if the rank actually changed
     since the previous snapshot, so it stays invisible on first load. -->
{#snippet Username(entry: Entry)}
  <!-- Positive = moved up since last invalidate, negative = moved down, 0 = same/new. -->
  {@const delta = (prev => (prev ? prev - entry.rank : 0))(previous.get(entry.viewerId))}
  <span class="flex-1 truncate font-medium">
    {entry.username}
    {#if delta > 0}
      <span class="text-success text-xs font-bold">↑{delta}</span>
    {:else if delta < 0}
      <span class="text-error text-xs font-bold">↓{-delta}</span>
    {/if}
    {#if entry.viewerId === data.user.id}<span class="badge badge-primary badge-xs">You</span>{/if}
  </span>
{/snippet}

<!-- ENHANCEMENT: richer tooltip body.
 Tooltip-content overrides the data-tip when daisyUI is set up for
 rich content. Shows full name, score breakdown, and rank context. -->
{#snippet Breakdown(entry: Entry)}
  <div class="tooltip-content text-left">
    <p class="font-bold">{entry.username}</p>
    {#each [`🏁${entry.fantasy.drafts} ✨${entry.score.engagement} `, ` 🎲${entry.pickems.attempts} ⚡${entry.score.pickems}`] as e}
      <p>{e}</p>
    {/each}
    <p class="text-xs opacity-70">Rank #{entry.rank} of {totals?.scores.length}</p>
  </div>
{/snippet}

<!-- ── Empty state ─────────────────────────────────────────────────────── -->
{#if !totals?.scores.length}
  <!-- ENHANCEMENT: actionable empty state. Was a dead "be the first" tease;
       now offers a concrete next step when there's a mode in scope. -->
  <Empty icon="🏟️" tagline="Supreeeeeememeing..." animate={true} />
{:else}
  <div class="page-content">
    <!-- ── Podium (top 3) ──────────────────────────────────────────────
         Order is silver-gold-bronze. `items-end` aligns bottoms; the per-rank
         platform heights at the bottom of each column push the avatars to
         different heights, creating the stagecraft step. -->
    {#if podium?.length}
      <div class="flex items-end justify-center gap-4 px-4 pt-2">
        {#each podium as entry, i (entry.viewerId)}
          <div
            class={[
              'flex flex-col items-center tooltip tooltip-bottom podium-enter',
              i === 0 ? 'podium-enter--silver'
              : i === 2 ? 'podium-enter--bronze'
              : 'podium-enter--gold'
            ]}>
            <!-- Crown for #1: existing pinger animation (entrance ping + scale + glow loop) -->
            <span
              class={[
                'z-2 -mt-3 pinger',
                entry.rank === 1 ? 'text-5xl'
                : entry.rank === 2 ? 'text-4xl'
                : '-mb-3 text-3xl'
              ]}
              >{entry.rank === 1 ? '👑'
              : entry.rank === 2 ? '🎩'
              : '🧢'}</span>

            {@render Avatar(entry)}

            <!-- Medal hangs slightly over the avatar via -mt-2, like a ribbon necklace -->
            <span
              class={[
                '-mt-2',
                entry.rank === 1 ? 'text-5xl'
                : entry.rank === 2 ? 'text-4xl'
                : 'text-3xl'
              ]}>
              {entry.rank === 1 ? '🥇'
              : entry.rank === 2 ? '🥈'
              : '🥉'}
            </span>

            <!-- ENHANCEMENT: trophy icon on the headline score for podium-only flair.
                 TODO: tween the value for a count-up effect on real-time updates —
                 svelte/motion `Tween` per entry is the cleanest path; needs a small
                 child component since Tween instances can't live in a snippet. -->
            <span class="text-lg font-bold"> {format(entry.score.weighted)}</span>

            <!-- Username row with inline rank-change indicator + "You" tag -->
            {@render Username(entry)}

            <!-- ENHANCEMENT: podium platform.
                 Variable height by rank gives the columns different total heights,
                 which with `items-end` on the parent flex pushes the rank-1
                 content visibly higher than the rest. -->
            <div
              class={[
                'mt-1 w-full rounded-t-md',
                entry.rank === 1 ? 'h-12 bg-success/30'
                : entry.rank === 2 ? 'h-8 bg-info/30'
                : 'h-6 bg-warning/30'
              ]}>
            </div>
            {@render Breakdown(entry)}
          </div>
        {/each}
      </div>
    {/if}

    <!-- ── Rest of leaderboard (rank 4+) ──────────────────────────────── -->
    {#if leaderboard?.length}
      <!-- `overflow-hidden` clips the bg-primary highlight so the rounded
           corners on the ul stay visible at the top/bottom rows. -->
      <ul class="rounded-xl bg-base-200">
        {#each leaderboard as entry (entry.viewerId)}
          <li
            class={[
              'tooltip tooltip-top flex items-center gap-2 border-b border-base-300 p-3 transition-all',
              'last:border-b-0 hover:bg-base-content/5',
              'first:rounded-t-xl last:rounded-b-xl',
              entry.viewerId === data.user.id && 'bg-accent/60'
            ]}>
            <div class="tooltip-content text-left"></div>
            <!-- ENHANCEMENT: rank number. Below #3 there were no visual
                 anchors — #4 and #11 looked identical at a glance. -->
            <span class="w-8 text-center font-mono text-sm opacity-60">#{entry.rank}</span>

            {@render Avatar(entry)}
            {@render Username(entry)}
            <span class="text-lg font-bold">{entry.score.weighted}</span>
            {@render Breakdown(entry)}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
/* ── Crown animation chain (unchanged) ──────────────────────────────── */
@keyframes ping {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.5);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes pulse {
  30%,
  100% {
    transform: scale(1.5);
  }
}

@keyframes glowIn {
  0% {
    filter: drop-shadow(0 0 0 transparent);
  }
  60% {
    filter: drop-shadow(0 0 18px currentColor);
  }
  100% {
    filter: drop-shadow(0 0 9px currentColor);
  }
}

@keyframes glow {
  0%,
  100% {
    filter: drop-shadow(0 0 9px currentColor);
  }
  50% {
    filter: drop-shadow(0 0 18px currentColor);
  }
}

.pinger {
  animation:
    ping 0.6s cubic-bezier(0, 0, 0.2, 1) 1,
    glowIn 0.6s cubic-bezier(0, 0, 0.2, 1) 1 forwards,
    pulse 1s cubic-bezier(0, 0, 0.2, 1) 0.6s 1 forwards,
    glow 2s ease-in-out 0.6s infinite;
}

/* ── ENHANCEMENT: staggered podium entrance ───────────────────────────
   Rank 3 (bronze) lands first, then silver, then gold — building up to
   the crown's ping. `backwards` fill keeps the entries invisible during
   their delay window so the stagger reads cleanly. */
@keyframes podiumEnter {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.podium-enter {
  animation: podiumEnter 0.4s ease-out backwards;
}
.podium-enter--bronze {
  animation-delay: 0s;
}
.podium-enter--silver {
  animation-delay: 0.15s;
}
.podium-enter--gold {
  animation-delay: 0.3s;
}

@media (prefers-reduced-motion: reduce) {
  .pinger,
  .podium-enter {
    animation: none;
  }
}
</style>
