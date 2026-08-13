<script lang="ts">
import { invalidate } from '$app/navigation';
import { resolve } from '$app/paths';
import Pickems from '$lib/core/games/HS/features/pickaroo/svelted/ui/Pickems.svelte';
import { usePubSub } from '$lib/common/twitch/svelted/twitch.svelte.js';
import ebs from '$lib/common/ebs';
import Categorically from '$lib/svelted/ui/app/Categorically.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';
import Stats from '$lib/svelted/ui/layout/Stats.svelte';
import { has, hasnot } from '$lib/utilz/morph';
import { tc } from '$lib/utilz/polly';

import type { Stat } from '$lib/svelted/ui/layout/Stats.svelte';

let { data, params } = $props();

let error = $state<toothy<string>>();
let loading = $state(false);

// Optimistic pick — set on submit, cleared when server fetch confirms
let optimisticPick = $state<{ pickarooId: number; pickable: string } | null>(null);

const category = $derived(data.categories.find(c => c.mode === params.mode));
const totals = $derived(data.totals);

// then s.pickems.hits / s.pickems.misses / s.pickems.attempts per row

// At most one open pickaroo per category (current schema; will be per-eventable when more pickaroo types ship)
const pickaroo = $derived(data.pickaroos?.find(p => p.categoryId === category?.id));

// Viewer's open pickem against that pickaroo
const pickem = $derived(data.pickems.find(p => p.pickarooId === pickaroo?.id && p.eventable === null));

const currentPickable = $derived(
  optimisticPick && optimisticPick.pickarooId === pickaroo?.id ?
    pickaroo.pickables.find(p => p?.id === optimisticPick?.pickable)
  : pickaroo?.pickables.find(p => p?.id === pickem?.pickable)
);

const stated = ({ attempts = -1, hits = -1, misses = -1 }) =>
  [
    { title: 'Misses', value: misses, icon: '💨', varient: 'text-base-content' },
    { title: 'Hits', value: hits, icon: '🎰', varient: 'text-success' },
    { title: 'Attempts', value: attempts, icon: '🎲', varient: 'text-primary' }
  ].filter(s => s.value > -1) as Stat[];

usePubSub({
  'pickaroos:updated': () => invalidate(data.sourcee),
  'pickems:updated': () => {
    optimisticPick = null;
    invalidate(data.sourcee);
  },
  '*': e => {
    if (e.events.includes('pickems:updated')) optimisticPick = null;
    if (category) invalidate(data.sourcee);
  }
});
</script>

<Header {loading} {error} />

<div class="page-content">
  {#if !category && totals.length}
    <Stats stats={stated(totals.find(hasnot('category'))?.pickems || { attempts: 0, hits: 0, misses: 0 })} />

    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each totals.filter(has('category')) as { pickems, category } (category.id)}
        <Categorically
          title={category.mode}
          href={resolve('/app/[game]/[[mode]]/pickaroo', {
            game: params.game,
            mode: category.mode
          })}>
          <div class="divider my-0"></div>
          <Stats class={'rounded-t-none'} stats={stated({ hits: pickems.hits, misses: pickems.misses })} />
        </Categorically>
      {:else}{/each}
    </div>
  {:else if pickaroo}
    <Pickems
      pickables={pickaroo.pickables}
      pickem={currentPickable}
      submit={async pick => {
        loading = true;
        error = await tc(async () => {
          optimisticPick = { pickarooId: pickaroo.id, pickable: pick.id };
          await ebs(`/app/${params.game}/${params.mode}/pickaroo`).post({ pick, pickarooId: pickaroo.id });
        });
        loading = false;
      }} />
  {:else}<Empty icon="⏳" tagline="Pickarooooooing..." animate={true} />{/if}
</div>
