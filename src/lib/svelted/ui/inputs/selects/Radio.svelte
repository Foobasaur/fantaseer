<script lang="ts">
import { onMount } from "svelte";

interface Props {
  selected: strumbol[];
  collection: Array<strumbol>;
  imgs: Record<string, string>;
  class?: string;
}
let { selected = $bindable<strumbol[]>(), collection, imgs, ...props }: Props = $props();
onMount(() => {
  if (!selected.length) selected = collection;
});
</script>

<div class={['flext flex-wrap justify-center', props.class]}>
  {#each collection as key}
    {@const active = selected.includes(key)}
    <label
      class="btn aspect-square rounded-full p-0 btn-ghost transition-all duration-200 btn-xs md:btn-md xs:btn-sm
      {active ? 'scale-105' : 'scale-75 opacity-60 grayscale hover:scale-95 hover:opacity-100 hover:grayscale-0'}"
      title={String(key)}>
      <input
        type="checkbox"
        class="hidden"
        checked={active}
        onchange={() => {
          selected =
            collection.every(k => selected.includes(k)) ? [key]
            : selected.includes(key) ?
              selected.length <= 1 ?
                (selected = collection)
              : selected.filter(k => k !== key)
            : [...selected, key];
        }} />
      <img
        src={imgs[String(key).toLowerCase()]}
        alt={key as string}
        class="size-full rounded-full object-scale-down outline outline-amber-100" />
    </label>
  {/each}
</div>
