<script lang="ts">
import { goto, invalidate } from '$app/navigation';
import { page } from '$app/state';
import { gg } from '$lib/core/games/games';
import DraftedView from '$lib/core/games/HS/features/fantasy/draft/svelted/ui/Deck.svelte';
import DraftView from '$lib/core/games/HS/features/fantasy/draft/svelted/ui/Draft.svelte';
import { usePubSub } from '$lib/common/twitch/svelted/twitch.svelte.js';
import ebs from '$lib/common/ebs';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';
import { isHttpError } from '@sveltejs/kit';

import type { Server } from '@';

let { data, params } = $props();
let error = $state('');

const category = $derived(data.categories.find(c => c.mode === params.mode));
const overview = $derived.by(() => {
  const game = gg(data.game.code);
  const eventables = game.scored(data.events || []);
  const eventToPickable = new Map(eventables.map(e => [e.id, e.pickable]));
  return {
    events: Map.groupBy(eventables, e => e.pickable),
    observers: Map.groupBy(
      (data.observers || []).filter(o => eventToPickable.has(o.eventId)),
      o => eventToPickable.get(o.eventId)!
    )
  };
});
usePubSub({ '*': _ => invalidate(data.sourcee) }, 'events:created');
</script>

{#key page.url.pathname}
  {#if page.params.draft === 'new'}
    <Header bind:error />
    <DraftView
      {data}
      submit={async store => {
        try {
          const req = ebs(`/app/${data.game.code}/${params.mode}/fantasy/${params.draft}`);
          const res = await req.post<Server.EBS.Draft<'post'>>({ picks: store.picks });
          if (res.success) {
            store.clear();
            goto(`/app/${data.game.code}/${params.mode}/fantasy`, { replaceState: true });
          } else throw new Error('Failed to create draft');
        } catch (err) {
          console.error(err);
          error = isHttpError(err) ? err.body.message : (err as Error).message || `An unexpected ${error} occurred`;
        }
      }} />
  {:else if data.draft}
    <div class="page-content">
      <DraftedView {overview} {category} picks={data.draft.pickables} />
    </div>
  {:else}<Empty />{/if}
{/key}
