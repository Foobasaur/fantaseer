<script lang="ts">
import { stats } from '$lib/core/games/games';
import Stats from '$lib/svelted/ui/layout/Stats.svelte';
import type { Game, HS, Server } from '@';

interface Props {
  picks: HS.Card[] | unknown[]; // Can be either pickables or full card objects depending on context
  category?: Server.DB.Infertable['categories'];
  overview?: {
    events?: Map<string, ReturnType<Game.Client<Game.Code>['scored']>>;
    observers?: Map<string, Server.DB.Metabled<'observers', unknown>[]>;
  };
  onRemove?: (pick: HS.Card) => void;
}
const { onRemove, ...props }: Props = $props();

const mode = $derived(props.category?.mode as HS.Mode);
const pickables = $derived(props.picks as HS.Card[]);
const deck = $derived.by(() => {
  const map = new Map(pickables.map(c => [c.id, c]));
  const grouped = new Map<string, { card: HS.Card; count: number }>();
  for (const pick of pickables) {
    const card = map.get(pick.id);
    if (card) {
      const existing = grouped.get(pick.id);
      grouped.set(pick.id, { card, count: (existing?.count ?? 0) + 1 });
    }
  }
  return [...grouped.values()].sort((a, b) => (a.card.cost ?? 0) - (b.card.cost ?? 0));
});
</script>

<div class="card h-full w-full flex-col bg-base-300 backdrop-blur-lg">
  <!-- Header -->
  <div class="flex shrink-0 items-center gap-3 border-b border-base-content/10 px-3 py-2">
    <div class="avatar avatar-placeholder">
      <div class="w-10 rounded-full bg-base-content/10">
        <span class="text-xl">🃏</span>
      </div>
    </div>
    <div class="flex flex-col">
      <span class="text-sm font-bold">{props.category?.mode} Deck</span>
      <span class="text-xs opacity-60">{pickables.length} Cards</span>
    </div>
  </div>

  <!-- HS.Card List -->
  <div class="flex-1 overflow-y-auto">
    {#each deck as { card, count } (card.id)}
      <div class="group flex flex-col transition-all hover:bg-base-content/5">
        <div class="relative flex h-11 cursor-pointer items-center overflow-hidden border-b border-base-content/5">
          <!-- Mana Cost -->
          <div class={['hs-icon z-10', mode === 'Battlegrounds' ? 'hs-icon-tier' : 'hs-icon-mana']}>
            <span>{(mode === 'Battlegrounds' ? card.techLevel : card.cost) || 0}</span>
          </div>

          <!-- HS.Card Tile Background -->
          <div class="relative flex h-full flex-1 items-center overflow-hidden">
            <img
              src={card.img.tile}
              alt={card.name}
              class="absolute inset-0 h-full w-full object-cover object-center transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:opacity-80" />
            <div class="absolute inset-0 bg-linear-to-r from-base-100/90 via-base-100/50 to-transparent"></div>
            <span
              class="relative z-10 origin-left pl-2 text-sm font-semibold transition-all duration-100 group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]">
              {card.name}
            </span>
          </div>

          <!-- Legendary Star -->
          {#if card.rarity === 'LEGENDARY'}
            <span class="drop-shadow-[0_0_3px_rgba(0,0,0,0.9)] absolute right-3 z-10">⭐</span>
          {:else if count > 1}
            <span class="absolute right-2 z-10 badge badge-soft badge-sm font-semibold">x{count}</span>
          {/if}

          <!-- Remove Button (editable mode only) -->
          {#if onRemove}
            <div class="absolute right-2 z-20 opacity-0 transition-all duration-300 group-hover:opacity-100">
              <div class="tooltip tooltip-left" data-tip="remove">
                <button
                  class="btn btn-circle btn-sm btn-error"
                  aria-label="Remove {card.name}"
                  onclick={() => onRemove?.(card)}>
                  <span>✘</span>
                </button>
              </div>
            </div>
          {/if}
        </div>
        {#if props.overview}
          {@const events = props.overview.events?.get(card.id) ?? []}
          {@const stat = stats(events)}
          <div class={['mx-1 mb-2 flex-1 opacity-80', events.length > 0 ? 'block' : 'hidden']}>
            <Stats
              class={['rounded-none', stat.length === 1 && 'hidden']}
              stats={[{ icon: '♾️', title: 'Ratings', value: events.length }].filter(s => s.value > 0)} />
            <hr class="border-t border-dashed border-base-content/20" />
            <Stats stats={stat} class={['rounded-t-none']} />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div>
