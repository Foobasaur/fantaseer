<script lang="ts">
import { untrack } from 'svelte';

import { create } from '$lib/core/games/HS/impl/fantasy/draft/svelted/store.svelte';
import { checker, PREFIXER } from '$lib/utilz/morph';
import { eqludes } from '$lib/utilz/stringz';

import cardpack from '$lib/assets/hs/icons/icon_cardpack.png';
import Deck from '$lib/core/games/HS/impl/fantasy/draft/svelted/ui/Deck.svelte';
import Slider from '$lib/core/games/HS/impl/fantasy/draft/svelted/ui/controls/Slider.svelte';
import Cardio from '$lib/svelted/ui/actions/buttons/Card.svelte';
import Selecto from '$lib/svelted/ui/inputs/selects/Box.svelte';
import Radio from '$lib/svelted/ui/inputs/selects/Radio.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import type { HS, FantasyDraftPageData as PageData, Server } from '@';

// STATE:
let filtering = $state(false);

// PROPS:
interface Props {
  category: Server.DB.Infertable['categories'];
  data: R3place<PageData, 'req', Awaited<PageData['req']>>;
  error?: string;
}
let { error = $bindable(), category, data }: Props = $props();
const store = $derived(
  untrack(() =>
    create(
      category.mode,
      (data.req.pickables as HS.Card[]).sort((a, b) => a.dbfId - b.dbfId)
    )
  )
);
const Filtered = $derived(store.session.filtered);
const Filter = (mechanic: string) =>
  Filtered.filter(
    c =>
      checker(mechanic, c.mechanics) || checker(mechanic, c.referencedTags) || eqludes(c.text, `<b>${mechanic.toLowerCase()}`)
  );
</script>

{#snippet Pickles(picks: HS.Card[])}
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

  <!-- Main Content -->
  <div class="drawer-content">
    {#if store.validate.valid}
      <!-- Show confirm UI when draft is complete -->
      <div class="page-content">
        {@render Pickles(store.session.picks)}
        <button class="btn btn-primary w-full" onclick={async () => (error = await store.submit())}>Confirm</button>
      </div>
    {:else if store}
      <!-- Sticky header with draft.filters -->
      <div
        class="sticky top-0 pt-2 pl-2 pr-1 mx-auto flex w-full flex-col z-9 isolate
         before:content-[''] before:absolute before:inset-0 before:-z-10 before:bg-base-200/80 before:shadow-2xl
         before:backdrop-brightness-90 before:mask-intersect
         before:mask-[linear-gradient(to_right,transparent,black_10%,black_90%,transparent),linear-gradient(to_bottom,transparent,black_0%,black_78%,transparent)]">
        <Slider class="mb-2" type={store.rules.slider} bind:value={store.session.filter[store.rules.slider]} />

        <details class="filter-details group" bind:open={filtering}>
          <!-- Summary positioned where the old toggle button was -->
          <summary
            data-tip="Toggle Filterizers"
            class="tooltip btn absolute tooltip-right -bottom-6 -left-3 text-primary-content btn-link no-underline cursor-pointer list-none">
            <span class="text-lg group-open:hidden">🔎</span>
            <span class="text-lg hidden group-open:inline">🔍</span>
          </summary>

          <!-- Content shown when <details> is open — {#if} gated so the mechanics collection (a Filter()
               sweep per key) is not recomputed on every streamed-in chunk while the panel is closed -->
          {#if filtering}
            <Radio class="flex my-0.5" {...store.options.radials} bind:selected={store.session.filter.radials} />

            <div class="join mb-1 flex items-stretch justify-center">
              <input
                type="text"
                placeholder="Search"
                class="flex flex-col items-center justify-center text-center input input-sm w-full"
                bind:value={store.session.filter.search} />
              <Selecto collection={store.options.draftables} bind:selected={store.session.filter.set} />
              {#if store.options.types}
                <Selecto collection={store.options.types.card} bind:selected={store.session.filter.card} />
                <Selecto
                  collection={store.options.types[store.session.filter.card as keyof typeof store.options.types]}
                  bind:selected={store.session.filter[store.session.filter.card as keyof typeof store.session.filter]} />
              {/if}
              <Selecto
                collection={Object.fromEntries(
                  Object.entries(store.options.mechanics).filter(
                    ([key]) => key === PREFIXER || key === store?.session.filter.mechanic || Filter(key)?.length
                  )
                )}
                bind:selected={store.session.filter.mechanic} />
            </div>
          {/if}
        </details>

        <!-- Draft drawer toggle button -->
        <label for="draft-drawer" class="drawer-button absolute right-0 -bottom-24 z-9 flex cursor-pointer">
          <figure class="relative scale-[.69]">
            <img src={cardpack} alt="Open Picks" class="h-full w-full object-contain" />
            <span class="absolute inset-0 mt-3 flex justify-center">🔱</span>
            <span class="absolute inset-0 mt-5 flex items-center justify-center">
              <span class="badge badge-soft font-semibold backdrop-blur-sm">
                {store.session.picks.length}/{store.rules.length}
              </span>
            </span>
          </figure>
        </label>
      </div>

      <!-- Card Grid -->
      <div class="flex flex-wrap justify-center gap-0">
        {#each Filter(store.session.filter.mechanic) as card (card.id)}
          {@const count = store.session.picks.filter(p => p.id === card.id)?.length}
          <Cardio
            class={card.type === 'HERO' ? `[&_img]:-mb-5` : `[&_img]:-mb-9`}
            img={{ src: store.rules.display(card) }}
            badge={!count ? '' : 'x' + count}
            disabled={!store.canAdd(card)}
            onclick={() => store.session.picks.push(card)} />
        {:else}<Empty />{/each}
        <!-- <pre>{JSON.stringify(card, null, 2)}</pre> -->
      </div>
    {/if}
  </div>

  <!-- Drawer Side: Draft Deck Panel -->
  <div class="drawer-side">
    <label for="draft-drawer" aria-label="close sidebar" class="drawer-overlay"></label>
    <div class="flex min-h-full w-69 flex-col bg-base-200">
      <label for="draft-drawer" class="btn absolute top-2 right-2 z-1 btn-circle btn-ghost btn-sm">✕</label>
      {@render Pickles(store.session.picks)}
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
