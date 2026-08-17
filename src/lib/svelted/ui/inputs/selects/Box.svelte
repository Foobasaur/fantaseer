<script lang="ts">
interface Props {
  selected: unknown;
  collection?: Record<string, string>;
  hidden?: boolean;
  ghost?: boolean;
}
let open = $state(false);
let { selected = $bindable<unknown | strumbol>(), ...props }: Props = $props();
const entries = $derived(Object.entries(props.collection ?? {}));
</script>

<select
  bind:value={selected}
  hidden={!entries.length}
  onclick={() => (open = true)}
  onfocus={() => (open = true)}
  onfocusout={() => (open = false)}
  onblur={() => (open = false)}
  class="select join-item select-sm"
  class:select-ghost={props.ghost}>
  {#each entries as [key, label], i}
    <option value={key} class:font-bold={i === 0}>
      {open ? String(label) : String(label).replace('Any ', '')}
    </option>
  {/each}
</select>
