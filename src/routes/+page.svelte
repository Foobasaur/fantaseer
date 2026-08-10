<script lang="ts">
import banner from '$lib/assets/home/banner.png';
import fantasy from '$lib/assets/home/fantasy.png';
import pickaroo from '$lib/assets/home/pickaroo.png';
import scores from '$lib/assets/home/scoring.png';
import type { Attachment } from 'svelte/attachments';

const SPRITE_PX = 96; // logical sprite box; baked-in glow has room here
const GLYPH_PX = 60;
const GITHUB = 'https://github.com/Foobasaur';
const DOWNLOAD = 'https://github.com/Foobasaur/Fantaseer.Client/releases';
const TWITCH = 'https://dashboard.twitch.tv/extensions/jlhgspyu42o9po12ppumnwv9xy38nn-0.0.1';
const EMOJIS = ['⚡', '✨', '👻', '👽', '💀', '🪙', '🎴', '🕹️', '🃏', '🌟', '🔮', '🎲'];

const TWITCH_D =
  'M2.149 0L.537 4.119v17.481h5.731V24h3.224l3.045-3.4h4.657L24 13.851V0H2.149zm2.149 2.149h17.553v10.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045H4.298V2.149zm6.418 11.149h2.149V6.418h-2.149v6.88zm5.731 0h2.149V6.418h-2.149v6.88z';
const DOWNLOAD_D = 'M11 3h2v8h3l-4 5-4-5h3V3z M5 19h14v2H5z';
const GITHUB_D =
  'M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.3v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3';

// per-button accent classes layered on top of cta-pill (Tailwind scans these string consts)
const PRIMARY =
  'bg-[#9146FF] shadow-lg shadow-purple-900/50 ring-1 ring-purple-300/30 hover:bg-[#a366ff] hover:shadow-[0_0_28px_-4px_rgba(145,70,255,0.75)] focus-visible:ring-white/70';
const GHOST_EMERALD =
  'cta-pill-ghost hover:border-emerald-400/50 hover:text-emerald-300 hover:shadow-[0_0_24px_-4px_rgba(16,185,129,0.55)] focus-visible:ring-emerald-300/60';
const GHOST_NEUTRAL =
  'cta-pill-ghost hover:border-white/40 hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.28)] focus-visible:ring-white/60';

const features = [
  {
    icon: '✨',
    img: fantasy,
    name: 'Fantasy',
    desc: 'Viewers draft a lineup before you play. When their picks show up in your run, their points stack up — your gameplay is the scoreboard.',
    alt: "Fantasy draft panel: a viewer's drafted lineup scoring points as picks appear in the stream"
  },
  {
    icon: '⚡',
    img: pickaroo,
    name: 'Pickaroo',
    desc: "Pick'ems fire mid-stream — chat calls what happens next before it happens. Nail the call, bank the points.",
    alt: "Pickaroo panel: a live pick'em with chat locking in calls on what happens next"
  },
  {
    icon: '🏆',
    img: scores,
    name: 'Scores',
    desc: 'Every draft and every call feeds one channel leaderboard. Climb it, defend it, gloat about it.',
    alt: "Channel leaderboard combining fantasy and pick'em points into one ranking"
  }
];

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phaseX: number;
  phaseY: number;
  spriteIndex: number;
};

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const seed = (w: number, h: number, n: number, spriteCount: number): Mote[] =>
  Array.from({ length: n }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.28, -0.05),
    size: rand(20, 44),
    opacity: rand(0.18, 0.5),
    phaseX: rand(0, 6.28),
    phaseY: rand(0, 6.28),
    // store the index, not the sprite canvas, so motes pick up rebuilt sprites after a DPR change
    spriteIndex: Math.floor(Math.random() * spriteCount)
  }));

const moteField: Attachment<HTMLCanvasElement> = canvas => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let sprites: HTMLCanvasElement[] = [];
  let motes: Mote[] = [];
  let dpr = 0;
  let lastW = 0;
  let lastH = 0;
  let last = 0;
  let raf = 0;

  const sync = () => {
    const newDpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    // mobile URL-bar show/hide fires resize storms; skip the expensive backing-store realloc
    // whenever nothing actually changed
    if (w === lastW && h === lastH && newDpr === dpr) return;

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

    // rescale positions into the new bounds so rotations don't strand half the field off-canvas
    if (lastW && (w !== lastW || h !== lastH)) {
      for (const m of motes) {
        m.x *= w / lastW;
        m.y *= h / lastH;
      }
    }
    lastW = w;
    lastH = h;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(32, Math.max(14, Math.round((w * h) / 65000)));
    if (motes.length === 0) motes = seed(w, h, target, sprites.length);
    else if (motes.length < target) motes.push(...seed(w, h, target - motes.length, sprites.length));
    else motes.length = target;
  };

  const draw = () => {
    ctx.clearRect(0, 0, lastW, lastH);
    for (const m of motes) {
      ctx.globalAlpha = m.opacity;
      const half = m.size / 2;
      ctx.drawImage(sprites[m.spriteIndex], m.x - half, m.y - half, m.size, m.size);
    }
  };

  const frame = (t: number) => {
    // normalize drift to a 60fps step so speed matches across 60/120/144Hz displays
    const dt = last ? Math.min((t - last) / 16.667, 3) : 1;
    last = t;
    const pad = 60;
    for (const m of motes) {
      m.x += (m.vx + Math.sin(t / 2400 + m.phaseX) * 0.18) * dt;
      m.y += (m.vy + Math.cos(t / 2600 + m.phaseY) * 0.14) * dt;
      if (m.x < -pad) m.x = lastW + pad;
      else if (m.x > lastW + pad) m.x = -pad;
      if (m.y < -pad) m.y = lastH + pad;
      else if (m.y > lastH + pad) m.y = -pad;
    }
    draw();
    raf = requestAnimationFrame(frame);
  };

  // reduced motion gets one static field — no rAF loop redrawing an unchanging scene
  const start = () => {
    cancelAnimationFrame(raf);
    last = 0;
    if (mq.matches) draw();
    else raf = requestAnimationFrame(frame);
  };

  const resize = () => {
    sync();
    if (mq.matches) draw();
  };

  sync();
  start();
  window.addEventListener('resize', resize);
  mq.addEventListener('change', start);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    mq.removeEventListener('change', start);
  };
};
</script>

{#snippet PILL(href: string, label: string, d: string, txt: string, extra = '')}
  <!-- the anchor IS the pill, so the whole padded surface is clickable; the label expands via
       grid-template-columns 0fr→1fr, which tracks real content width (no max-width dead zones) -->
  <a {href} target="_blank" rel="noopener" aria-label={label} class="group cta-pill {extra}">
    <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path {d} />
    </svg>
    <span
      class="grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
       group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr]
       pointer-coarse:grid-cols-[1fr] motion-reduce:grid-cols-[1fr] motion-reduce:transition-none">
      <span
        class="min-w-0 overflow-hidden whitespace-nowrap pl-2 opacity-0 transition-opacity duration-200
         group-hover:opacity-100 group-hover:delay-100 group-focus-visible:opacity-100
         pointer-coarse:opacity-100 motion-reduce:opacity-100 motion-reduce:transition-none">{txt}</span>
    </span>
  </a>
{/snippet}

{#snippet CTA(href: string, d: string, txt: string, extra = '')}
  <a {href} target="_blank" rel="noopener" class="cta-pill {extra}">
    <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path {d} />
    </svg>
    <span class="pl-2">{txt}</span>
  </a>
{/snippet}

<main
  class="relative flex min-h-svh flex-col overflow-x-clip bg-[#0c0418] text-white selection:bg-purple-500/40
   sm-tall:h-svh sm-tall:overflow-hidden">
  <canvas {@attach moteField} aria-hidden="true" class="pointer-events-none fixed inset-0 z-0"></canvas>
  <!-- vignette keeps the motes lively at the hero and lets them recede behind the content column -->
  <div
    aria-hidden="true"
    class="pointer-events-none fixed inset-0 z-[1] bg-[radial-gradient(ellipse_at_top,transparent_40%,rgba(12,4,24,0.55))]">
  </div>

  <!-- corner pill row parked for now; when restored: viewport-bounded and wrapping on phones
       (where it also scrolls away with the hero), fixed on sm+
  <div
    class="hero-in absolute inset-x-4 top-4 z-50 flex flex-wrap items-center justify-end gap-2 sm:fixed sm:inset-x-auto sm:right-4"
    style="--rise-delay: 150ms">
    {@render PILL(TWITCH, 'Install the Twitch extension', TWITCH_D, 'Install', PRIMARY)}
    {@render PILL(DOWNLOAD, 'Download the Fantaseer companion plugin', DOWNLOAD_D, 'Plugin', GHOST_EMERALD)}
    {@render PILL(GITHUB, 'View Fantaseer on GitHub', GITHUB_D, 'GitHub', GHOST_NEUTRAL)}
  </div>
  -->

  <!-- the banner is a see-through backdrop now, not a content band: masked to nothing before it
       reaches the pitch line, so the hero art peeks through without costing vertical space -->
  <img
    src={banner}
    alt=""
    aria-hidden="true"
    fetchpriority="high"
    class="pointer-events-none absolute inset-x-0 top-0 z-0 h-[clamp(280px,max(min(26vw,56svh),33svh),max(560px,45svh))] w-full object-cover object-center opacity-50
     [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9)_35%,transparent)]" />

  <!-- glowing planet-horizon arc grounding the scene's bottom edge -->
  <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-36 overflow-hidden">
    <div
      class="absolute left-1/2 top-10 h-[clamp(240px,33vw,800px)] w-[170%] -translate-x-1/2 rounded-[50%] bg-[#0e0520]
       shadow-[0_-10px_70px_-6px_rgba(145,70,255,0.5),inset_0_1px_0_rgba(216,180,254,0.4)]">
    </div>
  </div>

  <!-- the same curve mirrored as a ceiling: its underside dips across the banner top, rim-lit
       below with the glow bleeding down, so the scene sits framed between two planet arcs.
       strip/anchor pairs keep the dip at 64px on phones (clear of the title) and 104px from sm
       up (the approved desktop crossing), while giving the 90px-blur glow room to fade fully
       inside the strip instead of clipping into a seam -->
  <div aria-hidden="true" class="pointer-events-none absolute inset-x-0 top-0 z-[2] h-32 overflow-hidden sm:h-48">
    <div
      class="absolute bottom-16 left-1/2 h-[clamp(240px,33vw,800px)] w-[170%] -translate-x-1/2 rounded-[50%] bg-[#0e0520] sm:bottom-22
       shadow-[0_14px_90px_-4px_rgba(145,70,255,0.65),0_4px_30px_-6px_rgba(216,180,254,0.35),inset_0_-2px_0_rgba(216,180,254,0.55)]">
    </div>
  </div>

  <div class="relative z-10 flex min-h-0 flex-1 flex-col px-4 sm:px-6">
    <!-- hero + showcase center as ONE block with clamped internal gaps: extreme viewport
         heights pool their slack at the edges (over the banner art and horizon glow) instead
         of inflating the composition's internal spacing without bound -->
    <div class="flex min-h-0 flex-1 flex-col justify-center pt-[clamp(32px,8svh,88px)] pb-[clamp(12px,3svh,40px)]">
    <header class="text-center">
      <div class="wordmark-glow">
        <h1 class="wordmark font-black tracking-tight text-[clamp(44px,6.5vw,104px)] leading-none">fantaseer</h1>
      </div>
      <p class="hero-in mx-auto mt-3 max-w-xl text-pretty text-base text-purple-200/80 sm:text-lg xl:max-w-2xl xl:text-xl" style="--rise-delay: 120ms">
        Fantasy drafts and live pick'ems, right inside your Twitch stream.
        <span class="font-semibold text-white/90"> Your gameplay becomes their fantasy league. </span>
      </p>
      <div class="hero-in mt-5 flex flex-wrap items-center justify-center gap-3" style="--rise-delay: 240ms">
        {@render CTA(TWITCH, TWITCH_D, 'Add to Twitch', PRIMARY)}
        {@render CTA(DOWNLOAD, DOWNLOAD_D, 'Get the plugin', GHOST_EMERALD)}
      </div>
    </header>

    <section
      class="hero-in mx-auto mt-[clamp(16px,5svh,72px)] flex w-full max-w-5xl flex-col xl-tall:max-w-6xl xxl-tall:max-w-7xl"
      style="--rise-delay: 340ms">
      <h2 class="text-center text-sm font-bold uppercase tracking-[0.2em] text-purple-100 sm:text-base xl-tall:text-lg">
        What's inside
      </h2>
      <!-- stacked cards on phones (the page scrolls there); three equal columns from sm up -->
      <div
        class="mt-[clamp(12px,2.5svh,24px)] flex flex-col gap-3
         sm:grid sm:grid-cols-3 sm:gap-4 lg:gap-5">
        {#each features as f, i (f.name)}
          <article
            class="group relative isolate flex items-center gap-3 overflow-hidden rounded-2xl p-3.5 sm:block sm:p-4 xl-tall:p-5
             border border-white/8 border-t-white/15 bg-linear-to-b from-[#221040]/65 via-[#160a2a]/40 to-[#0e0520]/40
             shadow-[0_24px_70px_-32px_rgba(124,58,237,0.4)]
             transition-[translate,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
             hover:-translate-y-1 hover:border-purple-400/30 hover:shadow-[0_28px_80px_-28px_rgba(124,58,237,0.55)]
             motion-reduce:transition-none motion-reduce:hover:translate-y-0
             {i === 1 ? 'sm:-translate-y-3 sm:hover:-translate-y-4' : ''}">
            <div class="w-36 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 sm:w-full">
              <img
                src={f.img}
                alt={f.alt}
                decoding="async"
                class="aspect-video w-full object-cover transition-[filter] duration-300 ease-out group-hover:brightness-110 motion-reduce:transition-none" />
            </div>
            <div class="min-w-0 flex-1 sm:mt-3 sm:flex-none xl-tall:mt-4">
              <div class="flex items-center gap-2">
                <span class="text-xl drop-shadow-[0_0_10px_rgba(250,204,21,0.45)] xl-tall:text-2xl" aria-hidden="true">{f.icon}</span>
                <h3 class="text-base font-bold sm:text-lg xl-tall:text-xl">{f.name}</h3>
              </div>
              <p class="mt-1 text-xs leading-relaxed text-pretty text-purple-100/70 sm:mt-1.5 sm:text-sm xl-tall:text-base">
                {f.desc}
              </p>
            </div>
          </article>
        {/each}
      </div>
    </section>
    </div>

    <footer class="hero-in py-3 text-center text-xs text-purple-300/40" style="--rise-delay: 440ms">
      fantaseer · brewed by Foobasaur · side effects may include chat chaos
    </footer>
  </div>
</main>

<style>
/* base white→lavender gradient with a highlight glint sweeping across — both clipped to the text;
   the glint travels in ~1s then dwells, instead of smearing across the whole cycle */
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
    wordmark-sheen 7s linear infinite,
    hero-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* dark shadow separates the glyphs from the banner art; purple aura keeps the glow — shadows
   live on a wrapper because WebKit has a history of breaking background-clip: text when the
   clipped element itself carries a filter */
.wordmark-glow {
  filter: drop-shadow(0 3px 14px rgba(12, 4, 24, 0.9)) drop-shadow(0 6px 28px rgba(124, 58, 237, 0.35));
}

/* hero elements cascade in top-to-bottom; each sets --rise-delay inline */
.hero-in {
  animation: hero-rise 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
  animation-delay: var(--rise-delay, 0ms);
}

@keyframes wordmark-sheen {
  0% {
    background-position:
      130% 0,
      0 0;
    animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1);
  }
  14%,
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
  .hero-in {
    animation: none;
  }
}
</style>
