<script lang="ts">
import type { ClassValue } from 'svelte/elements';

export interface Stat {
  title?: strumbol;
  tooltip?: string;
  value?: strumbol;
  icon?: Emoji;
  varient?:
    | 'text-base-content'
    | 'text-primary'
    | 'text-secondary'
    | 'text-accent'
    | 'text-info'
    | 'text-success'
    | 'text-warning'
    | 'text-error';
}
const props: { stats: Stat[]; class?: ClassValue } = $props();
</script>

<div class={['bg-base-content/10 rounded-box overflow-hidden flex flex-wrap gap-x-px', props.class]}>
  {#each props.stats as stat, index (stat.title ?? index)}
    <div class="stat tooltip flex-1 basis-32  -mr-px min-w-0 py-2.5 px-3.5 bg-base-300">
      <div class="stat-title truncate">{stat.title}</div>
      <div class={['stat-value text-xl', stat.varient ?? 'text-primary']}>{stat.value || 0}</div>
      <div class="stat-figure text-xl">{stat.icon}</div>
      {#if stat.tooltip}
        <div class="tooltip-content absolute top-1/2 left-1/2 -translate-y-1/2 bg-transparent">
          <div class="-rotate-10 bg-primary bg-linear-to-r from-amber-600 to-fuchsia-600 font-black bg-blend-overlay">
            {stat.tooltip}
          </div>
        </div>
      {/if}
    </div>
  {/each}
</div>
