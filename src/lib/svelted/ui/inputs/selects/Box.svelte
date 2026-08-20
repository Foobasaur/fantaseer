<script lang="ts">
import { PREFIXER } from '$lib/utilz/morph';

interface Props {
  selected: unknown;
  collection?: Record<string, string>;
  hidden?: boolean;
  ghost?: boolean;
  sort?: boolean;
}
let open = $state(false);
let { selected = $bindable<unknown | strumbol>(), ...props }: Props = $props();
// opt-in: collections like draftables carry a deliberate order (defs with sort: null); sorting compares
// labels, not keys, and pins the Any entry first since the first option is the bolded default
const entries = $derived(
  (all =>
    props.sort ?
      all.sort(([a, la], [b, lb]) =>
        a.startsWith(PREFIXER) ? -1
        : b.startsWith(PREFIXER) ? 1
        : String(la).localeCompare(String(lb))
      )
    : all)(Object.entries(props.collection ?? {}))
);
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
