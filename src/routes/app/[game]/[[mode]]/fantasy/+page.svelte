<script lang="ts">
import { invalidate } from '$app/navigation';
import { resolve } from '$app/paths';
import { gg, stats } from '$lib/core/games/games';
import { usePubSub } from '$lib/core/twitch/svelted/twitch.svelte';
import { dependz } from '$lib/svelted/app';
import Categorically from '$lib/svelted/ui/app/Categorically.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';
import Stats from '$lib/svelted/ui/layout/Stats.svelte';
import { has, hasnot } from '$lib/utilz/morph';

let { params, data } = $props();

// ── Hoisted scoreable policy ──
const game = $derived(gg(data.game.code));

// ── Page state ──
const category = $derived(data.categories.find(c => c.mode === params.mode));
const totals = $derived(data.totals);

// ── Per-draft breakdown ──
const overview = $derived.by(() => {
  const eventables = game.scored(data.events || []);
  const picksByDraft = Map.groupBy(data.picks || [], p => p.draftId);
  const obsByEvent = Map.groupBy(data.observers || [], o => o.eventId);
  const eventsByPick = Map.groupBy(eventables, e => `${e.categoryId}:${e.pickable}`);

  return {
    eventables,
    drafts: (data.drafts || [])
      .toSorted((a, b) => a.categoryId - b.categoryId || a.id - b.id)
      .map(draft => {
        const picks = picksByDraft.get(draft.id) ?? [];
        const events = picks.flatMap(p => eventsByPick.get(`${draft.categoryId}:${p.pickable}`) ?? []);
        const observations = events.flatMap(e => obsByEvent.get(e.id) ?? []);
        return { ...draft, picks, events, observations };
      })
  };
});

const draft = ({ mode = params.mode, draft = 'new' } = {}) => `/app/${params.game}/${mode}/fantasy/${draft}`;

usePubSub({ '*': e => e.events.includes('events:created') && invalidate(category ? dependz.pickaroo : dependz.app) });
</script>

<Header />

<div class="page-content">
  {#if category && overview.drafts.length}
    <!-- User's Drafts Across All Modes -->
    <Categorically title="Drafts">
      {#snippet actions()}
        {#if data.open}
          <span class="tooltip tooltip-info tooltip-bottom" data-tip={`${data.open.next.toLocaleString()}`}>
            Next draft available {data.open.nextStr}
          </span>
        {:else}
          <a class="btn btn-primary btn-xs" href={draft()}>New Draft</a>
        {/if}
      {/snippet}

      <!-- Overall Stats -->
      <Stats class={'rounded-b-none'} stats={[{ icon: '♾️', title: 'Ratings', value: overview.eventables.length }]} />
      <hr class="-my-2 border-t border-dashed border-base-content/20" />
      <Stats class={'rounded-t-none'} stats={stats(overview.eventables)} />

      <!-- Draft List -->
      <ul class="rounded-xl bg-base-200">
        {#each overview.drafts as d (d.id)}
          <li
            class="flex items-center gap-3 border-b border-base-300 px-4 py-3 justify-between
               transition-all last:border-b-0 hover:bg-base-content/5">
            <a class="flex flex-1 items-center gap-2" href={draft({ mode: category.mode, draft: String(d.id) })}>
              <span class="flex-1">{category.mode}</span>
              <span class="tabular-nums">{d.timez.str}</span>
              <span class="flex flex-1 justify-end">
                <span class="badge badge-ghost badge-sm">🔥{d.events.length}</span>
              </span>
            </a>
          </li>
        {/each}
      </ul>
    </Categorically>
  {:else if !category && totals?.length}
    <!-- Overall Stats -->
    {@const summary = totals.find(hasnot('category'))}
    <Stats stats={stats(game.scored(summary?.fantasy.eventables || []))} />
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each totals.filter(has('category')) as summary (summary.category.id)}
        <Categorically
          title={summary.category.mode}
          href={resolve('/app/[game]/[[mode]]/fantasy', {
            game: params.game,
            mode: summary.category.mode
          })}
          stats={[
            { icon: '🏁', title: 'Drafts', value: summary.fantasy.drafts },
            { icon: '♾️', title: 'Ratings', value: summary.fantasy.eventables.reduce((n, e) => n + e.events, 0) }
          ]} />
      {/each}
    </div>
  {:else}
    <Empty icon="🔮" tagline="Fantaseeeeeering......" animate={true}>
      {#if params.mode && data.player}<a class="btn my-3 btn-primary" href={draft()}>New Draft</a>{/if}
    </Empty>
  {/if}
</div>
