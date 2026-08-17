<script lang="ts">
import { page } from '$app/state';
import { create } from '$lib/core/games/HS/impl/pickaroo/rules';
import Cardio from '$lib/svelted/ui/actions/buttons/Card.svelte';
import type { HS } from '@';

// PROPS: data for the draft and a submit function to finalize picks
let props: { pickables?: unknown[]; pickem?: unknown; submit: (pick: HS.Card) => Promise<void> } = $props();
const store = $derived(create(page.params.mode));
const pick = $derived(props.pickem ? (props.pickem as HS.Card) : null);
const cards = $derived.by(() => {
  const arr = (props.pickables?.filter(Boolean) ?? []) as HS.Card[];
  return pick ? [pick, ...arr.filter(c => c !== pick)] : arr;
});
</script>

{#if cards.length && !pick}
  <div
    aria-hidden="true"
    class="sticky top-6 z-9 pointer-events-none mx-auto flex w-fit items-center justify-center whitespace-nowrap
     text-4xl clock-cycle clock-glow">
    <span class="text-[clamp(1rem,6vw,3.75rem)] font-bold [text-shadow:0_1px_3px_rgba(0,0,0,0.95)]"
      >{store.rules.describe}</span>
  </div>
{/if}
<div class="flex flex-wrap justify-center">
  {#each cards as card (card.id)}
    {#snippet badge()}<span class="picked-cycle" aria-hidden="true"></span>{/snippet}
    {#snippet overlay()}<span class="text-9xl opacity-60 clock-cycle clock-glow" aria-hidden="true"></span>{/snippet}
    {@const picked = pick?.id === card.id}
    <Cardio
      class={card.type === 'HERO' ? `[&_img]:-mb-5` : `[&_img]:-mb-9`}
      img={{ src: store.rules.display(card) }}
      badge={picked && badge}
      overlay={picked && overlay}
      disabled={pick != null && pick.id !== card.id}
      onclick={() => !pick && props.submit(card)} />
  {/each}
</div>

<style>
.clock-cycle {
  line-height: 1;
}
.clock-glow {
  filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.963)) drop-shadow(0 0 3px rgba(255, 255, 255, 0.3));
}
@keyframes clock-tick {
  0% {
    content: '🕐';
  }
  4.166% {
    content: '🕑';
  }
  8.333% {
    content: '🕒';
  }
  12.5% {
    content: '🕓';
  }
  16.666% {
    content: '🕔';
  }
  20.833% {
    content: '🕕';
  }
  25% {
    content: '🕖';
  }
  29.166% {
    content: '🕗';
  }
  33.333% {
    content: '🕘';
  }
  37.5% {
    content: '🕙';
  }
  41.666% {
    content: '🕚';
  }
  45.833% {
    content: '🕛';
  }
  50% {
    content: '🕜';
  }
  54.166% {
    content: '🕝';
  }
  58.333% {
    content: '🕞';
  }
  62.5% {
    content: '🕟';
  }
  66.666% {
    content: '🕠';
  }
  70.833% {
    content: '🕡';
  }
  75% {
    content: '🕢';
  }
  79.166% {
    content: '🕣';
  }
  83.333% {
    content: '🕤';
  }
  87.5% {
    content: '🕥';
  }
  91.666% {
    content: '🕦';
  }
  95.833% {
    content: '🕧';
  }
  100% {
    content: '🕐';
  }
}
.clock-cycle::before {
  content: '🕐';
  animation: clock-tick 12s steps(24, end) infinite;
}

.picked-cycle {
  filter: drop-shadow(0 0 36px rgba(160, 255, 141, 0.6)) drop-shadow(0 0 18px rgba(255, 255, 255, 0.3));
}

/* prettier-ignore */
@keyframes picked-tick {
  0% { content: '👍'; }
  33.333% {
    content: '🤞';
  }
  66.666% {
    content: '👎';
  }
  100% {
    content: '🤞';
  }
}
.picked-cycle::before {
  content: '👍';
  animation: picked-tick 6s steps(4, end) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .clock-cycle::before {
    animation: none;
  }
  .picked-cycle::before {
    animation: none;
  }
}
</style>
