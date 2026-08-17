<script lang="ts">
import { invalidate } from '$app/navigation';
import { usePubSub } from '$lib/common/twitch/svelted/twitch.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';
import { emojiFace, eqludes, format } from '$lib/utilz/stringz';

//
const toppings = [
  [
    ['podium-enter--gold', 'text-5xl', 'h-12 bg-success/30'],
    ['👑', '🥇']
  ],
  [
    ['podium-enter--silver', 'text-4xl', 'h-8 bg-info/30'],
    ['🎩', '🥈']
  ],
  [
    ['podium-enter--bronze', 'text-3xl', 'h-6 bg-warning/30'],
    ['🧢', '🥉']
  ]
] as const;

// ── Props
let { data, params } = $props();

// scores: show ↑/↓ when an invalidate-triggered reload shifts ranks.
let snapshot = new Map<number, number>();
const { totals, previous } = $derived.by(() => {
  const totals = data.totals.find(t => t.category?.mode === params.mode);
  const previous = snapshot;
  if (totals) snapshot = new Map(totals.scores.map(s => [s.viewer.id, s.rank]));
  return { totals, previous };
});

// classic stadium podium order (silver–gold–bronze).
const podium = $derived(totals?.scores && [totals.scores[1], totals.scores[0], totals.scores[2]].filter(Boolean));
const leaderboard = $derived(totals?.scores.slice(3));

usePubSub({ '*': _ => params.mode && invalidate(data.sourcee) });

type Entry = NonNullable<typeof totals>['scores'][number]
</script>

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
      {#if false && entry.viewer.meta.avatar && !eqludes(entry.viewer.meta.avatar!, 'user-default-pictures')}<img
          src={entry.viewer.meta.avatar}
          alt={entry.viewer.meta.avatar} />
      {:else}<span>{emojiFace[entry.viewer.id % emojiFace.length]}</span>{/if}
    </div>
  </div>
{/snippet}

{#snippet Username(entry: Entry)}
  <!-- Positive = moved up since last invalidate, negative = moved down, 0 = same/new. -->
  {@const delta = (prev => (prev ? prev - entry.rank : 0))(previous.get(entry.viewer.id))}
  <span class="flex-1 truncate font-medium">
    {entry.viewer.meta.username}
    {#if delta > 0}
      <span class="text-success text-xs font-bold">↑{delta}</span>
    {:else if delta < 0}
      <span class="text-error text-xs font-bold">↓{-delta}</span>
    {/if}
    {#if entry.viewer.id === data.user.id}<span class="badge badge-primary badge-xs">You</span>{/if}
  </span>
{/snippet}

{#snippet Breakdown(entry: Entry)}
  <div class="tooltip-content text-left">
    <p class="font-bold">{entry.viewer.meta.username}</p>
    {#each [`🏁${entry.fantasy.drafts} ✨${entry.score.engagement} `, ` 🎲${entry.pickems.attempts} ⚡${entry.score.pickems}`] as e}
      <p>{e}</p>
    {/each}
    <p class="text-xs opacity-70">Rank #{entry.rank} of {totals?.scores.length}</p>
  </div>
{/snippet}

<!-- Body ─────────────────────────────────────────────────────── -->
<Header />
{#if !totals?.scores.length}
  <Empty icon="🏟️" tagline="Supreeeeeememeing..." animate={true} />
{:else}
  <div class="page-content">
    <!-- Podium (top 3) -->
    {#if podium?.length}
      <div class="flex items-end justify-center gap-4 px-4 pt-2">
        {#each podium as entry (entry.viewer.id)}
          {@const topping = toppings[entry.rank - 1]}
          <div class={['flex flex-col items-center tooltip tooltip-bottom podium-enter', topping[0][0]]}>
            <!-- Crown for #1: existing pinger animation (entrance ping + scale + glow loop) -->
            <span class={['z-2 -mt-3 pinger', topping[0][1], entry.rank === 3 && '-mb-3']}>{topping[1][0]}</span>

            {@render Avatar(entry)}

            <!-- Medal hangs slightly over the avatar via -mt-2, like a ribbon necklace -->
            <span class={['-mt-2', topping[0][1]]}>{topping[1][1]}</span>

            <!-- S -->
            <span class="text-lg font-bold"> {format(entry.score.weighted)}</span>

            <!-- Username row with inline rank-change indicator + "You" tag -->
            {@render Username(entry)}

            <!-- podium platform -->
            <div class={['mt-1 w-full rounded-t-md', topping[0][2]]}></div>
            {@render Breakdown(entry)}
          </div>
        {/each}
      </div>
    {/if}

    <!-- ── Rest of leaderboard (rank 4+) ──────────────────────────────── -->
    {#if leaderboard?.length}
      <ul class="rounded-xl bg-base-200">
        {#each leaderboard as entry (entry.viewer.id)}
          <li
            class={[
              'tooltip tooltip-top flex items-center gap-2 border-b border-base-300 p-3 transition-all',
              'last:border-b-0 hover:bg-base-content/5',
              'first:rounded-t-xl last:rounded-b-xl',
              entry.viewer.id === data.user.id && 'bg-accent/60'
            ]}>
            <div class="tooltip-content text-left"></div>

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
