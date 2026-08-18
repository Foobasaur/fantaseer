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

let revealed = $state(0); // established by the reset effect below, which also covers mount
let scrolled = $state(false);
let anchor: toothy<HTMLElement>; // the mounted sentinel; plain let — only read untracked

// The app shell (app/[game]/[[mode]]/+layout.svelte) owns the single scroll
// container: <main class="scrollbar-overlay min-h-0 flex-1"> between a shrink-0
// header and footer. Pages flow inside it, so this component must not bring a
// scrollport of its own — an inner one is unconstrained there and never scrolls.
// Instead resolve the nearest scrolling ancestor at runtime and observe against
// it, falling back to the browser viewport outside the shell.
const scroller = (node: HTMLElement) => {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
  }
  return null;
};

// new items identity (refilter) -> first chunk, back to top of the scroller
$effect(() => {
  void items;
  revealed = chunk;
  if (anchor) (scroller(anchor) ?? document.documentElement).scrollTop = 0;
});

function reveal() {
  if (revealed < items.length) revealed = Math.min(items.length, revealed + chunk);
}

// IO only fires on intersection *changes*; after appending, the sentinel can stay
// intersecting without a change event. Re-observing forces a fresh initial record
// post-layout, so auto-fill continues until the sentinel truly leaves the margin.
function sentinel(node: HTMLElement) {
  anchor = node;
  const root = scroller(node);
  const io = new IntersectionObserver(
    entries => {
      if (entries.some(x => x.isIntersecting) && revealed < items.length) {
        reveal();
        io.unobserve(node);
        io.observe(node);
      }
    },
    { root, rootMargin: `0px 0px ${preload}px 0px` }
  );
  io.observe(node);
  const onScroll = () => (scrolled = true);
  const target = root ?? window;
  target.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    io.disconnect();
    target.removeEventListener('scroll', onScroll);
    anchor = undefined;
  };
}

$effect(() => {
  if (import.meta.env.DEV && items.length > 100 && revealed >= items.length && !scrolled) {
    console.warn(
      '[ChunkedList] revealed the entire list without any scrolling; no scrolling ' +
        'ancestor constrains this list. Check the shell chain (flex parents need min-h-0).'
    );
  }
});
</script>

<!-- display:contents keeps the component layout-transparent: rows participate
     directly in the parent's container (e.g. the draft grid's flex-wrap), so
     gap-0 card touching and wrapping behave as if the list weren't there. -->
<div class="contents">
  {#each items.slice(0, revealed) as item, i (i)}
    {@render row(item, i)}
  {:else}{#if empty}{@render empty()}{:else}<Empty src={e} tagline="Foo Baribbit?" />{/if}{/each}
  <!-- basis-full drops the sentinel below the last flex row; inert in block flow -->
  <div {@attach sentinel} class="basis-full" style:height="1px"></div>
</div>
