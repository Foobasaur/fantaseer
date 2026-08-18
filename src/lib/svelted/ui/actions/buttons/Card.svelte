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
      class={[!props.disabled && 'hover-glow cursor-pointer', 'relative rounded-2xl']}>
      <figure class={`rounded-2xl ${props.img.w ?? 'w-63'}`}>
        <img
          src={props.img.src}
          alt={props.img.alt ||
            props.img.src
              .split('/')
              .at(-1)
              ?.replace(/\.\w+$/, '') ||
            props.img.src}
          decoding="async"
          loading="lazy"
          class="object-contain" />
      </figure>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
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
  --ease: linear(0, 0.931 13.8%, 1.196 21.4%, 1.343 29.8%, 1.378 36%, 1.365 43.2%, 1.059 78%, 1);
}
.hover-glow:hover {
  filter: drop-shadow(0 0 12px rgba(0, 255, 0, 0.6)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.3));
  transition: filter 400ms ease-out;

  > :nth-child(n + 2) {
    isolation: isolate;
    z-index: 1;
    scale: 1.2;
  }

  > :first-child {
    overflow: hidden;
    grid-area: 1/1/4/4;
    transform: rotate3d(var(--transform), 0, 10deg);
    transition:
      transform var(--ease) 500ms,
      scale var(--ease) 500ms;
  }

  &:hover {
    --ease: linear(0, 0.708 15.2%, 0.927 23.6%, 1.067 33%, 1.12 41%, 1.13 50.2%, 1.019 83.2%, 1);
    filter: drop-shadow(0 0 12px rgba(0, 255, 0, 0.6)) drop-shadow(0 0 24px rgba(255, 255, 255, 0.3));

    > :first-child {
      scale: 1.05;
    }
  }

  > :nth-child(2) {
    grid-area: 1/1/2/2;
  }
  > :nth-child(3) {
    grid-area: 1/2/2/3;
  }
  > :nth-child(4) {
    grid-area: 1/3/2/4;
  }
  > :nth-child(5) {
    grid-area: 2/1/3/2;
  }
  > :nth-child(6) {
    grid-area: 2/3/3/4;
  }
  > :nth-child(7) {
    grid-area: 3/1/4/2;
  }
  > :nth-child(8) {
    grid-area: 3/2/4/3;
  }
  > :nth-child(9) {
    grid-area: 3/3/4/4;
  }

  &:has(> :nth-child(2):hover) {
    --transform: -1, 1;
  }
  &:has(> :nth-child(3):hover) {
    --transform: -1, 0;
  }
  &:has(> :nth-child(4):hover) {
    --transform: -1, -1;
  }
  &:has(> :nth-child(5):hover) {
    --transform: 0, 1;
  }
  &:has(> :nth-child(6):hover) {
    --transform: 0, -1;
  }
  &:has(> :nth-child(7):hover) {
    --transform: 1, 1;
  }
  &:has(> :nth-child(8):hover) {
    --transform: 1, 0;
  }
  &:has(> :nth-child(9):hover) {
    --transform: 1, -1;
  }
}
</style>
