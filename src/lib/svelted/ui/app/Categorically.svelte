<script lang="ts">
import type { Snippet } from 'svelte';
import type { Stat } from '../layout/Stats.svelte';
import Statio from '../layout/Stats.svelte';

interface Props {
  title?: string;
  stats?: Stat[];
  href?: string;
  icon?: string;
  tagline?: string | boolean;
  actions?: Snippet;
  children?: Snippet;
}
let { title, href, stats, icon, tagline, actions, children }: Props = $props();
</script>

<svelte:element
  this={href ? 'a' : 'div'}
  {href}
  class="card bg-base-200 shadow-md card-xs {href ? 'transition-all duration-300 hover:scale-[1.01] hover:shadow-xl' : ''}">
  <div class="card-body mx-1.5">
    {#if icon || tagline}
      <div class="flex items-center gap-3">
        {#if icon}<span class="text-3xl">{icon}</span>{/if}
        <div>
          {#if title}<h2 class="card-title capitalize">{title}</h2>{/if}
          {#if tagline}<p class="text-sm opacity-60">{tagline}</p>{/if}
        </div>
      </div>
    {:else}
      <div class="flex justify-between gap-3">
        <h2 class={["card-title capitalize", title && 'my-1']}>{title}</h2>
        {@render actions?.()}
      </div>
    {/if}

    {#if stats?.length}
      {#if title || tagline}<div class="divider my-0"></div>{/if}
      <Statio {stats} class={[!title && '-mt-3']} />
    {/if}

    {@render children?.()}
  </div>
</svelte:element>
