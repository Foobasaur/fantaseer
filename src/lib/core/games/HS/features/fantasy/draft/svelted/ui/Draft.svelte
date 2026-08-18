<script lang="ts">
import type { Card } from '$lib/core/games/HS/types';
import type { DB, FantasyDraftPageData as PageData } from '@';

import { checker, PREFIXER } from '$lib/utilz/morph';
import { eqludes } from '$lib/utilz/stringz';

import empty from '$lib/assets/empty.png';
import cardpack from '$lib/assets/hs/icons/icon_cardpack.png';

import Cardio from '$lib/svelted/ui/actions/buttons/Card.svelte';
import Selecto from '$lib/svelted/ui/inputs/selects/Box.svelte';
import Radio from '$lib/svelted/ui/inputs/selects/Radio.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';

import { create } from '../store.svelte';
import Deck from './Deck.svelte';
import Slider from './Slider.svelte';
import { page } from '$app/state';

// PROPS: data for the draft and a submit function to finalize picks
type Store = ReturnType<typeof create>;
let { data, submit }: { data: PageData; submit: (store: Store) => void } = $props();

let category = $state<DB.Infertable['categories']>();
let store = $state<Store>();
let search = $state('');

// Reset picks and filters when category changes
$effect(() => {
  category ||= data.categories.find(c => c.mode === page.params.mode);
  if (category) store = create(category.mode);
});

// DRAFT STORE: Manages draft state and logic
const picks = $derived(store?.picks || []);
const filter = $derived(store?.filter);

// CATEGORY VALIDATION: Filter cards by category draftables (expansion sets)
const draftable = $derived.by(() => ({
  pickables: (data.pickables ?? []) as Card[],
  draftables: store?.rules.draftables(data.draftables) || []
}));

// FILTERED CARDS: Apply filtration based on selected filters
const Filtered = $derived.by(() => {
  return draftable.pickables.filter(
    c =>
      store?.check(c).every(Boolean) &&
      (search.length < 4 || [c.rarity, c.name, c.flavor, c.text].some(field => eqludes(String(field), search)))
  );
});
const Filter = (mechanic: strumbol) =>
  Filtered.filter(
    c =>
      eqludes(c.text, `<b>${String(mechanic).toLowerCase()}`) ||
      checker(mechanic, c.mechanics) ||
      checker(mechanic, c.referencedTags)
  );
// DEBUG: card count per set
// $effect(() => {
//   const name = new Map(draftable.draftables);
//   const n: Record<string, number> = {};
//   for (const c of draftable.pickables) {
//     const k = (name.get(c.set as string) ?? c.set) as string;
//     n[k] = (n[k] ?? 0) + 1;
//   }

//   console.table(n);
//   const log = Object.entries(n)
//     .sort((a, b) => b[1] - a[1])
//     .map(([s, c]) => `${s}: ${c}`)
//     .join('\n');
//   console.log(`${log}\ntotal: ${draftable.pickables.length}`);
// });
</script>

{#snippet Pickles()}
  <Deck
    {picks}
    {category}
    onRemove={card => {
      const idx = picks.findIndex(c => c.id === card.id);
      idx > -1 && picks.splice(idx, 1);
    }} />
{/snippet}
<div class="drawer drawer-end">
  <input id="draft-drawer" type="checkbox" class="drawer-toggle" />

  <!-- Main Content: Card Browser -->
  <div class="drawer-content">
    {#if store && store.validation.valid}
      <!-- Show confirm UI when draft is complete -->
      <div class="page-content">
        {@render Pickles()}
        <button class="btn btn-primary w-full" onclick={() => submit(store!)}>Confirm</button>
      </div>
    {:else if store && filter}
      <!-- Sticky header with draft.filters -->
      <div
        class="sticky top-0 pt-2 pl-2 pr-1 mx-auto flex w-full flex-col z-9 isolate
         before:content-[''] before:absolute before:inset-0 before:-z-10 before:bg-base-200/80 before:shadow-2xl before:backdrop-brightness-90 before:mask-intersect
         before:mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent),linear-gradient(to_bottom,transparent,black_0%,black_78%,transparent)]">
        <Slider class="mb-2" type={store.rules.slider} bind:value={filter[store.rules.slider]} />

        <details class="filter-details group">
          <!-- Summary positioned where the old toggle button was -->
          <summary
            data-tip="Toggle Filterizers"
            class="tooltip btn absolute tooltip-right -bottom-6 -left-3 text-primary-content btn-link no-underline cursor-pointer list-none">
            <span class="text-lg group-open:hidden">🔎</span>
            <span class="text-lg hidden group-open:inline">🔍</span>
          </summary>

          <!-- Content shown when <details> is open -->
          <Radio
            class="flex my-0.5"
            collection={store.rules.radial.collection}
            imgs={store.rules.radial.imgs}
            bind:selected={filter.radials} />

          <div class="join mb-1 flex items-stretch justify-center">
            <input
              type="text"
              placeholder="Search"
              class="flex flex-col items-center justify-center text-center input input-sm w-full"
              bind:value={search} />
            <Selecto collection={draftable.draftables} bind:selected={filter.set} />
            {#if store.rules.types}
              <Selecto collection={store.rules.types.card} bind:selected={filter.card} />
              <Selecto
                collection={store.rules.types[filter.card as keyof typeof store.rules.types]}
                bind:selected={filter[filter.card as keyof typeof filter]} />
            {/if}
            <Selecto
              collection={store.rules.mechanics.filter(
                m => m[0] === PREFIXER || m[0] === filter.mechanic || Filter(m[0]).length
              )}
              bind:selected={filter.mechanic} />
          </div>
        </details>

        <!-- Draft drawer toggle button -->
        <label for="draft-drawer" class="drawer-button absolute right-0 -bottom-24 z-9 flex cursor-pointer">
          <figure class="relative scale-[.69]">
            <img src={cardpack} alt="Open Picks" class="h-full w-full object-contain" />
            <span class="absolute inset-0 mt-3 flex justify-center">🔱</span>
            <span class="absolute inset-0 mt-5 flex items-center justify-center">
              <span class="badge badge-soft font-semibold backdrop-blur-sm">
                {picks.length}/{store.rules.length}
              </span>
            </span>
          </figure>
        </label>
      </div>

      <!-- Card Grid -->
      <div class="flex flex-wrap justify-center gap-0">
        {#each Filter(filter.mechanic) as card (card.id)}
          {@const count = picks.filter(p => p.id === card.id)?.length}
          <Cardio
            class={card.type === 'HERO' ? `[&_img]:-mb-5` : `[&_img]:-mb-9`}
            img={{ src: store.rules.display(card) }}
            badge={!count ? '' : 'x' + count}
            disabled={!store.canAdd(card)}
            onclick={() => picks.push(card)} />
          <!-- <pre>{JSON.stringify(card, null, 2)}</pre> -->
        {:else}
          <Empty src={empty} tagline="Ribbit?" />
        {/each}
      </div>
    {/if}
  </div>

  <!-- Drawer Side: Draft Deck Panel -->
  <div class="drawer-side">
    <label for="draft-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
    <div class="flex min-h-full w-69 flex-col bg-base-200">
      <label for="draft-drawer" class="btn absolute top-2 right-2 z-1 btn-circle btn-ghost btn-sm">✕</label>
      {@render Pickles()}
    </div>
  </div>
</div>

<style>
/* Hide default disclosure triangle */
.filter-details > summary::-webkit-details-marker {
  display: none;
}
.filter-details > summary {
  list-style: none;
}

/* Animate open/close */
.filter-details::details-content {
  block-size: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    block-size 300ms ease-out,
    opacity 200ms ease-out,
    content-visibility 300ms allow-discrete;
  interpolate-size: allow-keywords;
}

.filter-details[open]::details-content {
  block-size: auto;
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .filter-details::details-content {
    transition: none;
  }
}
</style>
