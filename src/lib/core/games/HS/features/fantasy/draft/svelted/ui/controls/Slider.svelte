<script lang="ts">
import { blobby } from '$lib/utilz/morph';

const icons = { tiers: blobby(import.meta.glob('$lib/assets/hs/icons/bg/tier-*.png', { eager: true })) };
const filtrations = { mana: [0, 1, 2, 3, 4, 5, 6, 7], tier: [1, 2, 3, 4, 5, 6, 7] } as const;

// Props: type of filtration (mana or tier), current value, and optional class for styling
interface Props {
  type: keyof typeof filtrations;
  value: number;
  class?: string;
}
let { value = $bindable(-1), ...props }: Props = $props();

// Runed
const collection = $derived(filtrations[props.type]);
const min = $derived(collection[0] - 1);
</script>

<div class={['w-full max-w-xs flex-col mx-auto', props.class]}>
  <input
    type="range"
    {min}
    max={collection.length}
    bind:value
    step="1"
    class="range-hexagon range text-blue-300 [--range-thumb:blue] range-md" />
  <div class="-px-1 flex w-full justify-between">
    <div
      class={[
        'hs-icon',
        props.type === 'mana' ? 'hs-icon-mana' : 'hs-icon-tier',
        value === min ? 'opacity-100' : 'opacity-50'
      ]}>
      <span class="mb-0.5">⌀</span>
    </div>
    <!-- <div class="mx-6 flex w-full max-w-xs flex-col items-center"> -->
    {#each collection as element}
      <div class={[value === element ? 'opacity-100' : 'opacity-50']}>
        {#if props.type === 'mana'}
          <div class="hs-icon hs-icon-mana"><span>{element}</span></div>
        {:else}
          <img src={icons.tiers[`tier-${element}`]} alt="T-{element}" class="h-6 w-6 object-contain transition-opacity" />
        {/if}
      </div>
    {/each}

    {#if props.type === 'mana'}
      <div class={['hs-icon hs-icon-mana', value === collection.length ? 'opacity-100' : 'opacity-50']}>
        <span>∆</span>
      </div>
    {/if}
  </div>
</div>

<style>
.range-hexagon {
  --hexagon: polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%);
}

.range-hexagon::-webkit-slider-thumb {
  width: var(--range-thumb-size, 20px);
  height: var(--range-thumb-size, 20px);
  clip-path: var(--hexagon);
}

.range-hexagon::-moz-range-thumb {
  width: var(--range-thumb-size, 20px);
  height: var(--range-thumb-size, 20px);
  clip-path: var(--hexagon);
}

.range-hexagon.range-md {
  --range-thumb-size: 20px;
}
</style>
