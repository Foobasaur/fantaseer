<script lang="ts">
import type { Snippet } from 'svelte';
import type { ClassValue } from 'svelte/elements';

const props: {
  img: { src: string; alt?: string; w?: string };
  badge?: toothy<string | Snippet>;
  disabled?: boolean;
  class?: ClassValue;
  overlay?: toothy<Snippet>; // Optional overlay content
  onclick: () => void;
} = $props();
const onclick = () => !props.disabled && props.onclick();

// Tilt axis is set from pointer position instead of 8 hit-zone divs + :has() selectors: with :has() in
// the stylesheet, every card streaming into the grid invalidated styles grid-wide and stuttered the hover
// transition on the card under the pointer. Same 3x3 zone quantization as the old selectors.
const zone = (v: number) => (v < 1 / 3 ? -1 : v > 2 / 3 ? 1 : 0);
const tilt = (el: HTMLElement) => {
  let rect: DOMRect;
  const measure = () => (rect = el.getBoundingClientRect());
  const move = (e: PointerEvent) =>
    el.style.setProperty(
      '--transform',
      `${zone((e.clientY - rect.top) / rect.height)}, ${-zone((e.clientX - rect.left) / rect.width)}`
    );
  el.addEventListener('pointerenter', measure);
  el.addEventListener('pointermove', move);
  return () => {
    el.removeEventListener('pointerenter', measure);
    el.removeEventListener('pointermove', move);
  };
};
</script>

<div class="card-cv">
  <div class="group indicator {props.class}" class:opacity-50={props.disabled}>
    {#if props.badge}
      <span class="indicator-item z-1 mt-12 mr-12 p-3 badge badge-sm font-semibold badge-neutral">
        {#if typeof props.badge === 'string'}{props.badge}{:else}{@render props.badge()}{/if}
      </span>
    {/if}
    <div
      {onclick}
      role="button"
      tabindex="0"
      onkeydown={e => e.key === 'Enter' && onclick()}
      {@attach tilt}
      class={[!props.disabled && 'hover-glow cursor-pointer', 'relative rounded-2xl']}>
      <!-- aspect-ratio reserves the box of the hearthstonejson 256x388 renders before load: without it every
           unloaded img is 0x0, so each load reflows the whole grid and lazy-loading sees all cards as "near
           the viewport" and fetches eagerly -->
      <figure class={`rounded-2xl ${props.img.w ?? 'w-63'}`}>
        <img
          src={props.img.src}
          alt={props.img.alt || props.img.src}
          decoding="async"
          loading="lazy"
          class="object-contain w-full aspect-256/388" />
      </figure>
    </div>
    {#if props.overlay}
      <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
        {@render props.overlay()}
      </div>
    {/if}
  </div>
</div>

<style>
.card-cv {
  content-visibility: auto;
  /* content-box size (spec) — the 32px padding is added on top, giving the same
     316x424 border-box as an on-screen card. Sizing this as the border-box made
     every off-screen card 64px wider/taller than its rendered self. */
  contain-intrinsic-size: 252px 360px;
  padding: 32px; /* holds the ~24px glow + tilt scale inside paint containment */
  margin: -32px; /* restores your gap-0 touching layout */
}
.hover-glow {
  display: inline-grid;
  perspective: 75rem;
  --transform: 0, 0;
  /* the previous nested &:hover always won specificity, so this was the ease actually in effect */
  --ease: linear(0, 0.708 15.2%, 0.927 23.6%, 1.067 33%, 1.12 41%, 1.13 50.2%, 1.019 83.2%, 1);
}
.hover-glow:hover {
  filter: drop-shadow(0 0 12px rgba(0, 255, 0, 0.6)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.3));
  transition: filter 400ms ease-out;

  > figure {
    overflow: hidden;
    scale: 1.05;
    transform: rotate3d(var(--transform), 0, 10deg);
    transition:
      transform var(--ease) 500ms,
      scale var(--ease) 500ms;
  }
}
</style>
