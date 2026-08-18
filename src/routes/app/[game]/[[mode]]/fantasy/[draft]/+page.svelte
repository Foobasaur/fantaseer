<script lang="ts">
import { invalidate } from '$app/navigation';
import { usePubSub } from '$lib/common/twitch/svelted/twitch.svelte.js';
import { gg } from '$lib/core/games/games';
import DraftedView from '$lib/core/games/HS/impl/fantasy/draft/svelted/ui/Deck.svelte';

let { data, params } = $props();

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

<div class="page-content">
  <DraftedView {overview} {category} picks={data.draft.pickables} />
</div>
