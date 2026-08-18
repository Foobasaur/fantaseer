<script lang="ts">
import ebs from '$lib/common/ebs';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';
import { kappa } from '$lib/utilz/stringz';

let { data } = $props();
let selected = $state({
  viewers: new Set<number>(),
  drafts: new Set<number>(),
  banned: new Set<number>(),
  events: new Set<number>()
});
let tab = $state<keyof typeof selected>('viewers');

const actionable = $derived.by(() => {
  const viewer = (id?: number, meta?: { username?: string } | null) =>
    (meta || data.viewers.find(v => v.id === id)?.meta)?.username || `Viewer #${id}`;
  return {
    viewers: {
      action: 'ban',
      data: data.viewers
        .filter(v => !data.banned.some(b => b.viewerId === v.id))
        .map(e => ({ ...e, display: viewer(e.id, e.meta) }))
    },
    events: {
      action: 'clear',
      data: data.events.map(e => ({ ...e, display: `${e.eventable} - ${e.pickable}` }))
    },
    drafts: {
      action: 'delete',
      data: data.drafts.map(e => ({ ...e, display: viewer(e.viewerId) }))
    },
    banned: {
      action: 'unban',
      data: data.banned.map(e => ({ ...e, display: viewer(e.viewerId) }))
    }
  };
});
const error = $derived(
  data.player ? undefined : (
    'OIDC Player not found. Using JWT extension Viewer fallback. Login through a Fantaseer client and gamer on'
  )
);
</script>

<Header {error} />

<div class="flex h-full flex-col gap-3 p-3">
  <h2 class="text-lg font-bold">Channel Moderation</h2>

  <div role="tablist" class="tabs-bordered tabs">
    {#each Object.keys(selected).map(k => k as keyof typeof selected) as option}
      <button role="tab" class="tab" class:tab-active={tab === option} onclick={() => (tab = option)}>
        {kappa(option)} ({actionable[option].data.length})
      </button>
    {/each}
  </div>

  <div class="flex items-center justify-between">
    <label class="label cursor-pointer gap-2">
      <input
        type="checkbox"
        class="checkbox checkbox-sm"
        checked={selected[tab].size > 0 && selected[tab].size === actionable[tab].data.length}
        indeterminate={selected[tab].size > 0 && selected[tab].size < actionable[tab].data.length}
        onchange={() =>
          (selected[tab] = new Set(
            selected[tab].size === actionable[tab].data.length ? [] : actionable[tab].data.map(d => d.id)
          ))} />
      <span class="text-sm">Select all</span>
    </label>
    <button
      class="btn btn-sm btn-error"
      disabled={!selected[tab].size}
      onclick={async () => {
        const client = ebs(`/configure/config`);
        data = await client.post({ action: actionable[tab].action, ids: [...selected[tab]] });
        selected[tab] = new Set();
      }}>
      {kappa(actionable[tab].action)} ({selected[tab].size})
    </button>
  </div>
  <div class="flex flex-col gap-1 overflow-y-auto">
    {#each actionable[tab].data as entity (entity.id)}
      <div class="flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2">
        <input
          type="checkbox"
          class="checkbox checkbox-sm"
          checked={selected[tab].has(entity.id)}
          onchange={() => {
            const next = selected[tab];
            next.has(entity.id) ? next.delete(entity.id) : next.add(entity.id);
            selected[tab] = new Set(next);
          }} />
        <div class="flex-1 text-sm space-x-1">
          <span class="font-medium">{entity.display}</span>
          <span class="text-xs opacity-60">{entity.createdAt.toLocaleString()}</span>
          {#if 'categoryId' in entity}
            {@const category = data.categories.find(c => c.id === entity.categoryId)}
            {#if category}<span class="opacity-60">({category.mode})</span>{/if}
          {/if}
          <!-- <span class="text-xs opacity-60">#{entity.id}</span> -->
        </div>
      </div>
    {:else}<Empty />{/each}
  </div>
</div>
