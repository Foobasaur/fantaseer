<script lang="ts">
import { invalidate } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import { usePubSub } from '$lib/common/twitch/svelted/twitch.svelte';
import { fabio, foobonic } from '$lib/common/app';
import { kappa } from '$lib/utilz/morph';

let { data, params, children } = $props();
let fabulous = $derived.by(foobonic);

// ── Live updates ────────────────────────────────────────────────────────
usePubSub({
  'players:updated': _ => invalidate(data.sourcee),
  '*': _ => !params.mode && invalidate(data.sourcee)
});
</script>

<svelte:head><title>{data.game.name}</title></svelte:head>

{#snippet Header()}
  <!--
to_top mask, original (6% / 94%):
  bottom ─ transparent
   ↓ 6%   black (full opacity)
   │      black
   │ 94%  black
   ↑      transparent (fade only in last 6%)
  top

to_top mask, new (30% / 94%):
  bottom ─ transparent
   ↓ 30%  black (full opacity) ← fade now eats first 30% from bottom
   │      black
   │ 94%  black
   ↑      transparent
  top
-->
  <div class="shadow-[0_72px_90px_9px_var(--color-primary)]">
    <nav
      class="tabs tabs-border tabs-xs xs:tabs-sm bg-base-300 pb-1 justify-center
           mask-[
             linear-gradient(to_right,transparent,black_3%,black_97%,transparent),
             linear-gradient(to_top,transparent,black_35%,black_65%,transparent)
           ]
           [&]:[--tab-border-color:color-mix(in_oklch,var(--color-base-content)_15%,transparent)]">
      {#each data.categories.map(c => c.mode) as mode (mode)}
        <a
          role="tab"
          class="tab [&.tab-active]:font-semibold"
          class:tab-active={params.mode === mode}
          href={resolve(
            page.route.id === '/app/[game]/[[mode]]/fantasy/[draft]' ? '/app/[game]/[[mode]]/fantasy' : fabulous.route,
            { game: params.game, mode: mode }
          )}>
          {mode}
        </a>
      {/each}
    </nav>
  </div>
{/snippet}

{#snippet Main()}<div class="mx-auto">{@render children()}</div>{/snippet}

{#snippet Footer()}
  <div class="fab fab-flower">
    <button class="btn btn-circle btn-lg btn-info">
      <span class="drop-shadow-[0_0_3px_rgba(0,0,0,1)] mb-0.5 text-xl">{fabulous.icon}</span>
    </button>
    <span class="fab-close btn btn-circle btn-lg btn-error">⇲</span>
    {#each fabio as { slug, icon, route }}
      <div class="tooltip" data-tip={kappa(slug)}>
        <a
          href={resolve(route, {
            game: data.game.code,
            mode: page.route.id === route ? undefined : params.mode
          })}
          class="btn btn-circle shadow-lg btn-lg btn-neutral">
          <span class="text-xl">{icon}</span>
        </a>
      </div>
    {/each}
  </div>
{/snippet}

<div class="flex h-dvh flex-col">
  <header class="shrink-0">{@render Header()}</header>
  <main class="scrollbar-overlay min-h-0 flex-1">{@render Main()}</main>
  <footer class="shrink-0">{@render Footer()}</footer>
</div>

<style>
.scrollbar-overlay {
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  /* Hidden by default */
  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    background: transparent;
  }

  /* Reveal on hover */
  &:hover::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: oklch(50% 0 0 / 0.4);
    border-radius: 9999px;
  }

  /* Firefox fallback */

  &:hover {
    scrollbar-color: oklch(50% 0 0 / 0.4) transparent;
  }
}
</style>
