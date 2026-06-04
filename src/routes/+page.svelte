<script lang="ts">
import { onMount } from 'svelte';
import banner from '$lib/assets/fantaseer_banner.png';

const GITHUB = 'https://github.com/Foobasaur';
const TWITCH = 'https://dashboard.twitch.tv/extensions/jlhgspyu42o9po12ppumnwv9xy38nn-0.0.1';

const features = [
  {
    icon: '✨',
    name: 'Fantasy',
    tagline: "Draft 'em",
    desc: 'Viewers draft lineups of game elements characters. Streamers engagements reward picks that show up in play.'
  },
  {
    icon: '⚡',
    name: 'Pickaroo',
    tagline: "Pick 'em",
    desc: "Live pick'ems on what happens next. Hit the call, collect the points."
  },
  {
    icon: '🏆',
    name: 'Scores',
    tagline: "Beatem 'em",
    desc: "Leaderboards roll fantasy engagement and pick'em points into one ranking."
  }
];

let canvas: HTMLCanvasElement;

const EMOJIS = ['⚡', '✨', '👻', '👽', '💀', '🪙', '🎴', '🕹️', '🃏', '🌟', '🔮', '🎲'];
const SPRITE_PX = 96; // logical sprite box; baked-in glow has room here
const GLYPH_PX = 60;

type Mote = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  phaseX: number;
  phaseY: number;
  sprite: HTMLCanvasElement;
};

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

const buildSprite = (emoji: string, dpr: number): HTMLCanvasElement => {
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
};

const seed = (w: number, h: number, n: number, sprites: HTMLCanvasElement[]): Mote[] =>
  Array.from({ length: n }, () => ({
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.18, 0.18),
    vy: rand(-0.28, -0.05),
    size: rand(22, 50),
    opacity: rand(0.22, 0.6),
    phaseX: rand(0, 6.28),
    phaseY: rand(0, 6.28),
    sprite: sprites[Math.floor(Math.random() * sprites.length)]
  }));

onMount(() => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let dpr = 0;
  let sprites: HTMLCanvasElement[] = [];
  let motes: Mote[] = [];
  let raf = 0;

  const sync = () => {
    const newDpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (newDpr !== dpr) {
      dpr = newDpr;
      sprites = EMOJIS.map(e => buildSprite(e, dpr));
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
      ctx.drawImage(m.sprite, m.x - half, m.y - half, m.size, m.size);
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

<svelte:head>
  <title>fantaseer</title>
  <meta name="description" content="fantasy game drafts and pick'ems, built for Twitch streamers." />
</svelte:head>

<main class="relative min-h-screen overflow-hidden bg-[#0c0418] text-white">
  <canvas bind:this={canvas} aria-hidden="true" class="pointer-events-none fixed inset-0 z-0"></canvas>

  <section class="relative z-10">
    <img src={banner} alt="" class="block aspect-5/2 max-h-125 w-full object-cover object-center" />
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-[#0c0418]"></div>
  </section>

  <section class="relative z-10 mx-auto max-w-3xl px-6 text-center -mt-[clamp(40px,8vw,128px)]">
    <h1
      class="bg-linear-to-b from-white via-purple-100 to-purple-300 bg-clip-text font-black tracking-tight text-transparent drop-shadow-[0_4px_24px_rgba(124,58,237,0.4)] text-[clamp(48px,7vw,112px)] leading-none">
      fantaseer
    </h1>
    <p class="mt-4 text-purple-100 text-[clamp(18px,1.6vw,22px)]">Draft 'em. Pick 'em. Beat `em`.</p>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <a
        href={TWITCH}
        target="_blank"
        rel="noopener"
        class="rounded-xl bg-[#9146FF] px-6 py-3 font-semibold shadow-lg shadow-purple-900/50 ring-1 ring-purple-300/30 transition hover:-translate-y-0.5 hover:bg-[#a366ff]">
        <span class="inline-flex items-center gap-2">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M2.149 0L.537 4.119v17.481h5.731V24h3.224l3.045-3.4h4.657L24 13.851V0H2.149zm2.149 2.149h17.553v10.612l-3.582 3.582h-5.731l-3.045 3.045v-3.045H4.298V2.149zm6.418 11.149h2.149V6.418h-2.149v6.88zm5.731 0h2.149V6.418h-2.149v6.88z" />
          </svg>
          Install on Twitch
        </span>
      </a>
      <a
        href={GITHUB}
        target="_blank"
        rel="noopener"
        class="rounded-xl border border-white/15 bg-white/4 px-6 py-3 font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/8">
        <span class="inline-flex items-center gap-2">
          <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path
              d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.3v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" />
          </svg>
          Source on GitHub
        </span>
      </a>
    </div>
  </section>

  <section class="relative z-10 mx-auto mt-20 grid max-w-5xl gap-4 px-6 pb-20 sm:grid-cols-3">
    {#each features as f (f.name)}
      <article
        class="group rounded-2xl border border-white/10 bg-white/4 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-purple-400/40 hover:bg-white/[0.07]">
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

  <footer class="relative z-10 pb-8 text-center text-xs text-purple-300/40">
    fantaseer · a league of extraordinary fantasy meta brews
  </footer>
</main>
