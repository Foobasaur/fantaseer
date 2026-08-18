<!-- ChunkedList.svelte -->
<script lang="ts" generics="T">
import e from '$lib/assets/empty.png';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import type { Snippet } from 'svelte';

let {
  items,
  chunk = 60,
  preload = 400,
  row,
  empty
}: {
  items: T[];
  chunk?: number;
  preload?: number; // px before the list's end at which the next chunk loads
  row: Snippet<[T, number]>;
  empty?: Snippet;
} = $props();

let viewport: HTMLDivElement;
let revealed = $state(0); // established by the reset effect below, which also covers mount
let scrolled = $state(false);

// new items identity (refilter) -> first chunk, back to top
$effect(() => {
  void items;
  revealed = chunk;
  if (viewport) viewport.scrollTop = 0;
});

function reveal() {
  if (revealed < items.length) revealed = Math.min(items.length, revealed + chunk);
}

// IO only fires on intersection *changes*; after appending, the sentinel can stay
// intersecting without a change event. Re-observing forces a fresh initial record
// post-layout, so auto-fill continues until the sentinel truly leaves the margin.
function sentinel(node: HTMLElement) {
  const io = new IntersectionObserver(
    entries => {
      if (entries.some(x => x.isIntersecting) && revealed < items.length) {
        reveal();
        io.unobserve(node);
        io.observe(node);
      }
    },
    { root: node.parentElement }
  );
  io.observe(node);
  return () => io.disconnect();
}

$effect(() => {
  if (import.meta.env.DEV && items.length > 100 && revealed >= items.length && !scrolled) {
    console.warn(
      '[ChunkedList] revealed the entire list without any scrolling; the scrollport is ' +
        'probably unconstrained. Size the parent chain (flex parents need min-h-0).'
    );
  }
});
</script>

<div bind:this={viewport} onscroll={() => (scrolled = true)}>
  {#each items.slice(0, revealed) as item, i (i)}
    <div>{@render row(item, i)}</div>
  {:else}{#if empty}{@render empty()}{:else}<Empty src={e} tagline="Foo Baribbit?" />{/if}{/each}
  <div {@attach sentinel} style:height="1px"></div>
</div>

