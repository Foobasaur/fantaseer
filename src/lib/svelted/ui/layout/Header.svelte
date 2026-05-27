<script lang="ts">
import { numbaz } from '$lib';

interface Props {
  loading?: boolean;
  heading?: string;
  error?: toothy<string>;
  stats?: Array<{ title: string; value: string | number }>;
  tabs?: Array<{
    id: string;
    label?: string;
    count?: number;
    badge: {
      text: string;
      class?: string;
    };
  }>;
  currentTab?: string;
}
let { currentTab = $bindable(), error = $bindable(), loading, heading, stats, tabs }: Props = $props();
// const { title, icon, tagline } = $derived.by(foobonic);
</script>

<div class="flex flex-wrap items-center justify-between gap-2">
  <!-- <div class={tabs || true ? 'hidden' : 'block'}>
    <h1 class="flex items-baseline gap-2 text-lg font-bold xs:text-2xl">
      {icon}
      {heading ?? title}
      <span class="text-sm opacity-70"> {tagline}</span>
      {#if loading}
        <span class="loading loading-sm loading-spinner"></span>
      {/if}
    </h1>
  </div> -->

  {#if tabs && tabs.length > 0}
    <div role="tablist" class="mx-auto tabs-box tabs tabs-sm xs:mx-0">
      {#each tabs as tab (tab.id)}
        <button
          role="tab"
          class="tab gap-1 px-2 text-xs xs:gap-2 xs:px-3 xs:text-sm"
          class:tab-active={currentTab === tab.id}
          onclick={() => (currentTab = tab.id)}>
          <span class="badge badge-xs xs:badge-sm {tab.badge.class ?? ''}">{tab.badge.text}</span>
          {tab.label}
          {#if tab.count !== undefined}
            <span class="badge badge-xs badge-neutral xs:badge-sm">{tab.count}</span>
          {/if}
        </button>
      {/each}
    </div>
  {/if}
  {#if stats}
    <div class="stats mx-0 overflow-visible bg-base-200 shadow">
      {#each stats as stat, idx (stat.title)}
        <div class="stat px-3 py-2 xs:px-4">
          <!-- <div class="stat-title hidden text-xs xs:block">{stat.title}</div> -->
          <div
            class="tooltip tooltip-left stat-value text-sm xs:text-lg {numbaz.is(idx) ? 'text-primary' : 'text-secondary'}"
            data-tip={stat.title}>
            {stat.value}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

{#if loading}
  <span class="loading loading-spinner loading-xl fixed inset-0 m-auto"></span>
{/if}
<!-- Error Toast -->
{#if error}
  <div class="ml-3 my-4 alert flex justify-between alert-error">
    <span>{error}</span>
    <button class="btn btn-ghost btn-sm" onclick={() => (error = undefined)}> ✕ </button>
  </div>
{/if}
