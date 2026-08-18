<script lang="ts">
import { foobonic } from '$lib/common/app';
import type { Snippet } from 'svelte';

interface Props {
  children?: Snippet;
  src?: string;
  title?: string;
  icon?: string;
  tagline?: string;
  class?: string;
  animate?: boolean;
}
let { children, src, ...props }: Props = $props();
const { title, icon, tagline } = $derived({ ...foobonic(), ...props });
</script>

<div class={['items-center justify-center text-center mt-9', props.class]}>
  {#if src}<img {src} alt="Empty" class={['justify-self-center', props.animate && 'empty-animate']} />
  {:else}
    <div class="empty-rotate">
      <div class={['mb-4 text-9xl empty-glow', props.animate && 'empty-animate']}>{icon}</div>
    </div>
    <h3 class="mb-2 text-2xl font-semibold mt-6">{title}</h3>
  {/if}
  <p class={['opacity-70', props.animate && 'empty-pulse']}>{tagline}</p>
  {@render children?.()}
</div>

<style>
.empty-glow {
  filter: drop-shadow(0 0 6px color-mix(in oklab, currentColor 35%, transparent))
    drop-shadow(0 0 18px color-mix(in oklab, currentColor 25%, transparent))
    drop-shadow(0 0 32px color-mix(in oklab, currentColor 15%, transparent));
  transform-origin: center;
  will-change: transform, filter;
}
.empty-pulse {
  animation: empty-pulse 3.5s ease-in-out infinite;
}
.empty-animate {
  animation:
    empty-float 6s linear infinite,
    empty-glow-pulse 3.5s ease-in-out infinite;
}
.empty-rotate {
  animation: empty-tilt 9s linear infinite;
}
/*
      -6px
   ╲    ↑    ╱
    (87.5)(12.5)
  ╱       ╳       ╲     ← crossover point at center (0,0)
  (75) ─(0,50)──(25)   ← extreme left, center, extreme right
  ╲       ╳       ╱
    (62.5)(37.5)
   ╱    ↓    ╲
       +6px
*/
@keyframes empty-float {
  0% {
    transform: translate(0, 0);
  }
  10% {
    transform: translate(7px, -5px);
  }
  20% {
    transform: translate(11px, -2px);
  }
  25% {
    transform: translate(12px, 0);
  }
  30% {
    transform: translate(11px, 2px);
  }
  40% {
    transform: translate(7px, 5px);
  }
  50% {
    transform: translate(0, 0);
  }
  60% {
    transform: translate(-7px, -5px);
  }
  70% {
    transform: translate(-11px, -2px);
  }
  75% {
    transform: translate(-12px, 0);
  }
  80% {
    transform: translate(-11px, 2px);
  }
  90% {
    transform: translate(-7px, 5px);
  }
  100% {
    transform: translate(0, 0);
  }
}

@keyframes empty-tilt {
  0%,
  100% {
    transform: rotate(-3deg);
  }
  50% {
    transform: rotate(3deg);
  }
}
@keyframes empty-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 0.85;
  }
}

@keyframes empty-glow-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 4px color-mix(in oklab, currentColor 25%, transparent))
      drop-shadow(0 0 14px color-mix(in oklab, currentColor 18%, transparent))
      drop-shadow(0 0 26px color-mix(in oklab, currentColor 10%, transparent));
  }
  50% {
    filter: drop-shadow(0 0 8px color-mix(in oklab, currentColor 45%, transparent))
      drop-shadow(0 0 22px color-mix(in oklab, currentColor 32%, transparent))
      drop-shadow(0 0 40px color-mix(in oklab, currentColor 20%, transparent));
  }
}

@media (prefers-reduced-motion: reduce) {
  .empty-animate,
  .empty-pulse {
    animation: none;
  }
}
</style>
