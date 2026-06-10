<script lang="ts">
import { resolve } from '$app/paths';
import { fabio } from '$lib/svelted/app';
import Categorically from '$lib/svelted/ui/app/Categorically.svelte';

let { data, params } = $props();
const summary = $derived.by(() => {
  const totals = data.totals.find(t => t.category?.mode === params.mode);
  return {
    totals: { top3: totals?.scores.slice(0, 3) },
    fantasy: [
      ['Drafts', totals?.fantasy.drafts],
      ['Ratings', totals?.fantasy.eventables.reduce((n, e) => n + e.events, 0)]
    ],
    pickaroo: [
      ['Hits', totals?.pickems.hits],
      ['Misses', totals?.pickems.misses]
    ],
    scores: [
      ['Fantasy', totals?.fantasy.picks],
      ['Pickaroo', totals?.pickems.attempts]
    ]
  };
});
</script>

{#snippet Top3()}
  <div class="divider my-2"></div>
  <div class="mt-2 space-y-1">
    {#each summary.totals.top3 as entry (entry.username)}
      <div class="flex items-center gap-2 text-sm">
        <span class="font-bold opacity-60">#{entry.rank}</span>
        <span class="flex-1">{entry.username}</span>
        <span class="font-semibold">{entry.score.weighted}</span>
      </div>
    {/each}
  </div>
{/snippet}

<div class="page-content">
  <div class="grid gap-4 md:grid-cols-3">
    {#each (([, ...c]) => c)(fabio) as { icon, tagline, slug: title, route } (title)}
      <Categorically
        {title}
        {icon}
        {tagline}
        href={resolve(route, { game: params.game, mode: params.mode })}
        stats={summary[title].map(([title, value]) => ({ title, value }))}
        children={title === 'scores' && summary.totals.top3?.length ? Top3 : undefined} />
    {/each}
  </div>
</div>
