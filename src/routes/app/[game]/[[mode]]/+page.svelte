<script lang="ts">
import { resolve } from '$app/paths';
import { fabio } from '$lib/svelted/app';
import Categorically from '$lib/svelted/ui/app/Categorically.svelte';

let { data, params } = $props();

const totals = $derived(data.totals.find(t => t.category?.mode === params.mode));
const summary = $derived.by(() => ({
  fantasy: [
    { title: 'Drafts', value: totals?.fantasy.drafts },
    { title: 'Ratings', value: totals?.fantasy.eventables.reduce((n, e) => n + e.events, 0) }
  ],
  pickaroo: [
    { title: 'Open', value: totals?.pickaroo?.open },
    { title: 'Live', value: totals && totals.pickems.attempts - (totals.pickems.hits + totals.pickems.misses) },
    { title: 'Hits', value: totals?.pickems.hits },
    { title: 'Misses', value: totals?.pickems.misses }
  ],
  scores: [
    { title: 'Fantasy', value: totals?.fantasy.picks },
    { title: 'Pickaroo', value: totals?.pickems.attempts }
  ]
}));

// TODO?: Activity Feed
</script>

<div class="page-content">
  <div class="grid gap-4 md:grid-cols-3">
    {#each fabio.slice(1) as { icon, tagline, slug }}
      {@const stats = summary[slug as keyof typeof summary]}
      <Categorically
        title={slug}
        {tagline}
        {icon}
        {stats}
        href={slug === 'home' ?
          resolve('/app/[game]', { game: params.game })
        : resolve(`/app/[game]/[[mode]]/${slug}`, { game: params.game, mode: params.mode })}>
        {#snippet children()}
          {@const topScores = slug === 'scores' ? totals?.scores.slice(0, 3) : null}
          {#if topScores?.length}
            <div class="divider my-2"></div>
            <div class="mt-2 space-y-1">
              {#each topScores as entry (entry.username)}
                <div class="flex items-center gap-2 text-sm">
                  <span class="font-bold opacity-60">#{entry.rank}</span>
                  <span class="flex-1">{entry.username}</span>
                  <span class="font-semibold">{entry.score.weighted}</span>
                </div>
              {/each}
            </div>
          {/if}
        {/snippet}
      </Categorically>
    {/each}
  </div>
</div>
