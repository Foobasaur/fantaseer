<script lang="ts">
interface Props {
  selected: unknown;
  collection?: Array<strumbol | kvp> | readonly string[];
  hidden?: boolean;
  ghost?: boolean;
}
let open = $state(false);
let { selected = $bindable<unknown | strumbol>(), ...props }: Props = $props();
const normalized = $derived(props.collection?.map(c => (Array.isArray(c) ? c : ([c, c] as const))));
</script>

<select
  bind:value={selected}
  hidden={!props.collection?.length}
  onclick={() => (open = true)}
  onfocus={() => (open = true)}
  onfocusout={() => (open = false)}
  onblur={() => (open = false)}
  class="select join-item select-sm"
  class:select-ghost={props.ghost}>
  {#each normalized as [key, label], i}
    <option value={key} class:font-bold={i === 0}>
      {open ? String(label) : String(label).replace('Any ', '')}
    </option>
  {/each}
</select>
