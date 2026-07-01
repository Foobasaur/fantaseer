<script lang="ts">
import banner from '$lib/assets/home/banner.png';
import fantasy from '$lib/assets/home/fantasy.png';
import pickaroo from '$lib/assets/home/pickaroo.png';
import scores from '$lib/assets/home/scoring.png';
import { onMount } from 'svelte';
import { cubicOut } from 'svelte/easing';
import { fade, scale } from 'svelte/transition';

const SPRITE_PX = 96; // logical sprite box; baked-in glow has room here
const GLYPH_PX = 60;
const GITHUB = 'https://github.com/Foobasaur';
const DOWNLOAD = 'https://github.com/Foobasaur/Fantaseer.Client/releases';
const TWITCH = 'https://dashboard.twitch.tv/extensions/jlhgspyu42o9po12ppumnwv9xy38nn-0.0.1';
const EMOJIS = ['⚡', '✨', '👻', '👽', '💀', '🪙', '🎴', '🕹️', '🃏', '🌟', '🔮', '🎲'];
const features = [
  {
    icon: '✨',
    img: fantasy,
    name: 'Fantasy',
    tagline: "Draft 'em",
    desc: 'Viewers draft lineups. Streamers gameplay rewards picks that show up in play.'
  },
  {
    icon: '⚡',
    img: pickaroo,
    name: 'Pickaroo',
    tagline: "Pick 'em",
    desc: "Live pick'ems on what happens next. Hit the call, collect the points."
  },
  {
    icon: '🏆',
    img: scores,
    name: 'Scores',
    tagline: "Beat 'em",
    desc: "Leaderboards roll fantasy engagement and pick'em points into one ranking."
  }
];
let active = $state<(typeof features)[number] | null>(null);
let canvas: HTMLCanvasElement;
// $state so the focus effect re-reads it once bind:this lands; lastFocused is only
// touched from handlers/cleanup so a plain ref is fine there
let closeBtn = $state<HTMLButtonElement>();
let lastFocused: HTMLElement | null = null;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const closePreview = () => (active = null);

// reveals an element once it scrolls into view; skips straight to visible under reduced motion
function reveal(node: HTMLElement, delay = 0) {
  if (reducedMotion()) {
    node.classList.add('is-visible');
    return {};
  }
  node.style.transitionDelay = `${delay}ms`;
  const io = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        node.classList.add('is-visible');
        io.disconnect();
      }
    },
    { threshold: 0.2 }
  );
  io.observe(node);
  return { destroy: () => io.disconnect() };
}
// while the preview is open: lock body scroll, pull focus into the dialog,
// and restore both when it closes
$effect(() => {
  if (!active) return;
  const prevOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  closeBtn?.focus();
  return () => {
    document.body.style.overflow = prevOverflow;
    lastFocused?.focus();
    lastFocused = null;
  };
});

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const seed = (w: number, h: number, n: number, sprites: HTMLCanvasElement[]) =>
  Array.from({ length: n }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.28, -0.05),
    size: rand(22, 50),
    opacity: rand(0.22, 0.6),
    phaseX: rand(0, 6.28),
    phaseY: rand(0, 6.28),
    // store the index, not the sprite canvas, so motes pick up rebuilt sprites after a DPR change
    spriteIndex: Math.floor(Math.random() * sprites.length)
  }));
onMount(() => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let sprites: HTMLCanvasElement[] = [];
  let dpr = 0;
  let raf = 0;
  let motes = new Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
    phaseX: number;
    phaseY: number;
    spriteIndex: number;
  }>();

  const sync = () => {
    const newDpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (newDpr !== dpr) {
      dpr = newDpr;
      sprites = EMOJIS.map(emoji => {
        const c = document.createElement('canvas');
        c.width = SPRITE_PX * dpr;
        c.height = SPRITE_PX * dpr;
        const cx = c.getContext('2d')!;
        cx.scale(dpr, dpr);
        cx.font = `${GLYPH_PX}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.shadowColor = 'rgba(168, 85, 247, 0.7)';
        cx.shadowBlur = 18;
        cx.fillText(emoji, SPRITE_PX / 2, SPRITE_PX / 2);
        return c;
      });
    }

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(32, Math.max(14, Math.round((w * h) / 65000)));
    if (motes.length === 0) motes = seed(w, h, target, sprites);
    else if (motes.length < target) motes.push(...seed(w, h, target - motes.length, sprites));
    else motes.length = target;
  };

  const frame = (t: number) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);
    for (const m of motes) {
      if (!reduce) {
        m.x += m.vx + Math.sin(t / 2400 + m.phaseX) * 0.18;
        m.y += m.vy + Math.cos(t / 2600 + m.phaseY) * 0.14;
        const pad = 60;
        if (m.x < -pad) m.x = w + pad;
        else if (m.x > w + pad) m.x = -pad;
        if (m.y < -pad) m.y = h + pad;
        else if (m.y > h + pad) m.y = -pad;
      }
      ctx.globalAlpha = m.opacity;
      const half = m.size / 2;
      ctx.drawImage(sprites[m.spriteIndex], m.x - half, m.y - half, m.size, m.size);
    }
    raf = requestAnimationFrame(frame);
  };

  sync();
  window.addEventListener('resize', sync);
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', sync);
  };
});
</script>

<svelte:window
  onkeydown={e => {
    if (!active) return;
    if (e.key === 'Escape') closePreview();
    // single-control dialog: keep focus pinned to the close button
    else if (e.key === 'Tab') {
      e.preventDefault();
      closeBtn?.focus();
    }
  }} />

{#snippet PILL(cls: { href: string; 'aria-label': string }, d: string, txt: string)}
  <a
    href={cls.href}
    target="_blank"
    rel="noopener"
    aria-label={cls['aria-label']}
    class="inline-flex items-center outline-none">
    <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path {d} />
    </svg>
    <span
      class="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out
       group-hover:ml-2 group-hover:max-w-24 group-hover:opacity-100
       group-has-focus-visible:ml-2 group-has-focus-visible:max-w-24 group-has-focus-visible:opacity-100
       motion-reduce:ml-2 motion-reduce:max-w-24 motion-reduce:opacity-100 motion-reduce:transition-none">{txt}</span>
  </a>
{/snippet}
{#if active}
  <div
    role="dialog"
    aria-modal="true"
    aria-label={`${active.name} preview`}
    class="fixed inset-0 z-50 flex items-center justify-center p-6"
    transition:fade={{ duration: reducedMotion() ? 0 : 160 }}>
    <button
      type="button"
      tabindex="-1"
      aria-label="Close preview"
      onclick={closePreview}
      class="absolute inset-0 cursor-default bg-black/80 backdrop-blur-sm"></button>
    <figure
      class="relative z-10 flex flex-col items-center"
      transition:scale={{ start: 0.94, opacity: 0, duration: reducedMotion() ? 0 : 220, easing: cubicOut }}>
      <img
        src={active.img}
        alt={active.name}
        decoding="async"
        class="max-h-[80vh] max-w-[min(64rem,100%)] rounded-2xl shadow-2xl ring-1 ring-purple-400/30" />
      <button
        bind:this={closeBtn}
        type="button"
        onclick={closePreview}
        aria-label="Close preview"
        class="absolute -right-3 -top-3 grid h-9 w-9 place-items-center rounded-full border border-white/20 bg-[#1a0b2e] text-purple-100 shadow-lg transition hover:border-purple-400/60 hover:bg-[#2a1147] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 motion-reduce:transition-none">
        <svg
          class="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <figcaption class="mt-4 flex items-center gap-2 text-sm">
        <span class="text-lg">{active.icon}</span>
        <span class="font-semibold text-white">{active.name}</span>
        <span class="text-purple-300/60">· {active.tagline}</span>
      </figcaption>
    </figure>
  </div>
{/if}
<main class="relative min-h-screen overflow-hidden bg-[#0c0418] text-white">
  <canvas bind:this={canvas} aria-hidden="true" class="pointer-events-none fixed inset-0 z-0"></canvas>

  <section class="relative z-10">
    <img src={banner} alt="" fetchpriority="high" class="block aspect-5/2 max-h-125 w-full object-cover object-center" />
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-[#0c0418]"></div>
  </section>

  <section class="relative z-10 mx-auto max-w-3xl px-6 text-center -mt-[clamp(40px,8vw,128px)]">
    <h1
      class="wordmark font-black tracking-tight drop-shadow-[0_4px_24px_rgba(124,58,237,0.4)] text-[clamp(48px,7vw,112px)] leading-none">
      fantaseer
    </h1>

    <div class="hero-in-cta mt-8 flex flex-wrap items-center justify-center gap-3">
      <div
        class="group cta-pill bg-[#9146FF] shadow-lg shadow-purple-900/50 ring-1 ring-purple-300/30
           hover:bg-[#a366ff] hover:shadow-[0_0_28px_-4px_rgba(145,70,255,0.75)] has-focus-visible:ring-white/70">
        {@render PILL(
          { href: TWITCH, 'aria-label': 'Install Twitch extension' },
          'M2.149 0L.537 4.119v17.481h5.731V24h3.224l3.045-3.4h4.657L24 13.851V0H2.149zm2.149 2.149h17.553v10.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045H4.298V2.149zm6.418 11.149h2.149V6.418h-2.149v6.88zm5.731 0h2.149V6.418h-2.149v6.88z',
          'Twitch'
        )}
      </div>
      <div
        class="group cta-pill cta-pill-ghost
           hover:border-emerald-400/50 hover:shadow-[0_0_24px_-4px_rgba(16,185,129,0.55)] hover:text-emerald-300
           has-focus-visible:ring-emerald-300/60">
        {@render PILL(
          { href: DOWNLOAD, 'aria-label': 'Download the Fantaseer companion plugin' },
          'M11 3h2v8h3l-4 5-4-5h3V3z M5 19h14v2H5z',
          'Download'
        )}
      </div>
      <div
        class="group cta-pill cta-pill-ghost
           hover:border-white/40 hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.28)] has-focus-visible:ring-white/60">
        {@render PILL(
          { href: GITHUB, 'aria-label': 'View Fantaseer on GitHub' },
          'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.3v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3',
          'GitHub'
        )}
      </div>
    </div>
  </section>

  <section
    class="relative z-10 mx-auto mt-20 grid max-w-5xl gap-6 px-6 pb-20 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-center sm:gap-4">
    {#each features as f, i (f.name)}
      {#if i > 0}
        <div aria-hidden="true" class="flex items-center justify-center text-purple-400/30">
          <svg
            class="h-5 w-5 rotate-90 sm:rotate-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </div>
      {/if}
      <article
        use:reveal={i * 120}
        class="reveal group relative rounded-2xl border border-white/10 bg-white/4 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-purple-400/40 hover:bg-white/[0.07]">
        <button
          type="button"
          onclick={e => {
            lastFocused = e.currentTarget as HTMLElement;
            active = f;
          }}
          aria-label={`Preview ${f.name}`}
          class="absolute inset-0 z-10 cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0c0418]"
        ></button>
        <span
          aria-hidden="true"
          class="pointer-events-none absolute right-4 top-4 text-purple-300/0 transition duration-300 group-hover:text-purple-300/70 group-focus-within:text-purple-300/70">
          <svg
            class="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </span>
        <div class="flex items-center gap-3">
          <span class="text-3xl drop-shadow-[0_0_12px_rgba(250,204,21,0.45)]">{f.icon}</span>
          <div>
            <h2 class="text-xl font-bold">{f.name}</h2>
            <p class="text-sm text-purple-300/70">{f.tagline}</p>
          </div>
        </div>
        <p class="mt-4 text-sm leading-relaxed text-purple-100/70">
          {f.desc}
        </p>
      </article>
    {/each}
  </section>

  <footer use:reveal class="reveal relative z-10 pb-8 text-center text-xs text-purple-300/40">
    fantaseer · a league of extraordinary fantasy meta brews
  </footer>
</main>

<style>
/* base white→lavender gradient (was Tailwind from-white via-purple-100 to-purple-300),
   with a slow highlight sweeping across on top — both clipped to the text */
.wordmark {
  color: transparent;
  -webkit-text-fill-color: transparent;
  background-image: linear-gradient(100deg, transparent 42%, rgba(255, 255, 255, 0.65) 50%, transparent 58%),
    linear-gradient(to bottom, #ffffff, #f3e8ff 45%, #d8b4fe);
  background-repeat: no-repeat;
  background-size:
    250% 100%,
    100% 100%;
  background-position:
    130% 0,
    0 0;
  -webkit-background-clip: text;
  background-clip: text;
  animation:
    wordmark-sheen 5.5s cubic-bezier(0.4, 0, 0.2, 1) infinite,
    hero-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* CTA row rises in just after the wordmark, for a cascading load-in */
.hero-in-cta {
  animation: hero-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}

/* feature cards and footer fade/rise in once scrolled into view (see the `reveal` action) */
.reveal {
  opacity: 0;
  transform: translateY(28px);
  transition:
    opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal:global(.is-visible) {
  opacity: 1;
  transform: translateY(0);
}

@keyframes wordmark-sheen {
  0% {
    background-position:
      130% 0,
      0 0;
  }
  55%,
  100% {
    background-position:
      -80% 0,
      0 0;
  }
}

@keyframes hero-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wordmark {
    animation: none;
    background-position:
      200% 0,
      0 0;
  }
  .hero-in-cta {
    animation: none;
  }
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
</style>
