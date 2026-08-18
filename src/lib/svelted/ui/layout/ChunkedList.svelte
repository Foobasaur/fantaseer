<script lang="ts" generics="T">
import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

import Empty from './Empty.svelte';

/**
 * Progressively rendered list.
 *
 * LAYOUT CONTRACT — `src/routes/app/[game]/[[mode]]/+layout.svelte`:
 * the app shell is `flex h-dvh flex-col` with a `shrink-0` header (mode tabs),
 * a `shrink-0` footer (the fab flower) and a single scroll container in the
 * middle — `<main class="scrollbar-overlay min-h-0 flex-1">`. Pages render
 * inside it, wrapped in the `page-content` utility (`app.css`). So this
 * component never scrolls itself and never claims a height: it stays in the
 * page flow and hangs its lazy-load sentinel off the *ancestor* scroller,
 * which it resolves at runtime (falling back to the viewport when the tree is
 * flat, e.g. the standalone draft route).
 *
 * Rendering is chunked rather than virtualised: rows already scrolled past
 * stay in the DOM, so `scrollbar-gutter: stable` on the shell never jitters
 * and in-page anchors keep working.
 */
interface Props {
  /** Full collection — only `chunk` rows at a time reach the DOM. */
  items: T[];
  /** Row body. Rendered inside the `<li>`, so it owns the row's content, not its chrome. */
  item: Snippet<[T, number]>;
  /** Rows added per reveal. */
  chunk?: number;
  /** Pixels of lookahead below the scroller before the next chunk is pulled in. */
  lookahead?: number;
  /** Change this (typically `params.mode`) to rewind to the first chunk when the page swaps data sets. */
  reset?: unknown;
  /** Keying function — falls back to the index, which is fine for append-only feeds. */
  key?: (item: T, index: number) => PropertyKey;
  /** Rendered above the list; pair with `sticky` to pin it to the shell's scroller. */
  head?: Snippet;
  /** Rendered below the list, outside the lazy-load sentinel. */
  foot?: Snippet;
  /** Replaces the default `Empty` when there is nothing to show. */
  empty?: Snippet;
  /** `Empty` fallbacks — omitted values fall through to the current fab section (`foobonic`). */
  icon?: string;
  tagline?: string;
  sticky?: boolean;
  /** Extra classes for the `<ul>`. */
  class?: ClassValue;
  /** Extra classes for each `<li>` — one value for every row, or a function of the row. */
  row?: ClassValue | ((item: T, index: number) => ClassValue);
}

let {
  items,
  item,
  chunk = 24,
  lookahead = 300,
  reset,
  key,
  head,
  foot,
  empty,
  icon,
  tagline,
  sticky,
  class: klass,
  row
}: Props = $props();

// Counted in chunks, not rows, so a later `chunk` change re-sizes the window
// instead of being frozen at whatever the prop was on first render.
let chunks = $state(1);

const visible = $derived(items.slice(0, chunks * chunk));
const remaining = $derived(items.length - visible.length);

// Rewind on an explicit data-set swap only. A pub/sub `invalidate` re-runs the
// layout load and hands us a fresh array every time; resetting on identity
// would yank rows out from under a viewer who had already scrolled.
$effect(() => {
  void reset;
  chunks = 1;
});

// Nearest scrolling ancestor — `main.scrollbar-overlay` in the app shell.
// `null` means "observe against the viewport", the correct root when this is
// rendered outside the shell.
const scroller = (node: HTMLElement) => {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if (overflowY === 'auto' || overflowY === 'scroll') return el;
  }
  return null;
};

// Attachment: runs on the sentinel, which only exists while rows are pending,
// so the observer is torn down for free once the list is fully revealed.
const lazily = (node: HTMLElement) => {
  if (typeof IntersectionObserver === 'undefined') return;
  const observer = new IntersectionObserver(entries => entries.some(e => e.isIntersecting) && (chunks += 1), {
    root: scroller(node),
    rootMargin: `0px 0px ${lookahead}px 0px`
  });
  observer.observe(node);
  return () => observer.disconnect();
};
</script>

{#if head}
  <!-- z-9 keeps the sticky head under the layout's fab flower (z-10+) while
       clearing page content. No padding or margin of its own: these elements
       are direct children of `page-content`, which already owns the gutters
       (`p-1`, `ml-1.5 -mr-1`) and the rhythm between them (`space-y-3`). -->
  <div
    class={[
      'flex flex-wrap items-center justify-between gap-2',
      sticky && 'sticky top-0 z-9 bg-base-200/80 backdrop-blur-sm'
    ]}>
    {@render head()}
  </div>
{/if}

{#if !items.length}
  {#if empty}{@render empty()}{:else}<Empty {icon} {tagline} animate={true} />{/if}
{:else}
  <ul class={['rounded-xl bg-base-200', klass]}>
    {#each visible as entry, i (key?.(entry, i) ?? i)}
      <li
        class={[
          'flex items-center gap-2 border-b border-base-300 p-3 transition-all',
          'last:border-b-0 hover:bg-base-content/5',
          'first:rounded-t-xl last:rounded-b-xl',
          typeof row === 'function' ? row(entry, i) : row
        ]}>
        {@render item(entry, i)}
      </li>
    {/each}
  </ul>

  {#if remaining}
    <!-- Doubles as the observer target and the no-JS/no-IO escape hatch. -->
    <div {@attach lazily} class="flex justify-center">
      <button class="btn gap-2 btn-ghost btn-sm" onclick={() => (chunks += 1)}>
        <span class="loading loading-dots loading-xs"></span>
        {remaining} more
      </button>
    </div>
  {/if}
{/if}

{@render foot?.()}
