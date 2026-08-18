<!-- src/routes/z/health/stream/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  let { data } = $props();

  type Row = { t: number; bytes: number; tail: string };
  let rows = $state<Row[]>([]);
  let running = $state(false);
  let done = $state(false);
  let total = $state(0);

  const verdict = $derived(
    rows.length > 1 && rows[rows.length - 1].t - rows[0].t > 300 ? 'STREAMING' : 'BUFFERED'
  );

  async function consume(body: ReadableStream<Uint8Array>, t0: number) {
    running = true;
    rows = [];
    done = false;
    total = 0;
    const reader = body.getReader();
    const dec = new TextDecoder();
    for (;;) {
      const { done: d, value } = await reader.read();
      if (d) break;
      rows.push({
        t: Date.now() - t0,
        bytes: value.length,
        tail: dec.decode(value, { stream: true }).trim().split('\n').at(-1) ?? ''
      });
    }
    total = Date.now() - t0;
    done = true;
    running = false;
  }

  async function rerun() {
    const t0 = Date.now();
    const res = await fetch('/api/z/health/stream', { cache: 'no-store' });
    if (res.ok && res.body) await consume(res.body, t0);
  }

  // consume the stream the load opened; a stream is single-consumer, so if an
  // HMR remount finds it already locked, open a fresh one instead
  onMount(() => { (data.body.locked ? rerun() : consume(data.body, data.t0)); });
</script>

<div class="probe">
  <div class="bar">
    <span>stream canary — /api/z/health/stream</span>
    <button onclick={rerun} disabled={running}>re-run</button>
  </div>
  <div class="out">
    {#each rows as r, i (i)}
      <div>+{String(r.t).padStart(5, ' ')}ms  {String(r.bytes).padStart(4, ' ')}B  {r.tail}</div>
    {/each}
    {#if done}
      <div class="verdict">END +{total}ms, {rows.length} chunks -&gt; {verdict}</div>
    {:else if running}
      <div>…</div>
    {/if}
  </div>
</div>

<style>
/* your styles unchanged */
.probe { max-width: 40rem; margin: 2rem auto; font-family: ui-monospace, monospace; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.out { white-space: pre; background: #111; color: #ddd; padding: 0.75rem 1rem; border-radius: 6px; min-height: 8rem; }
.verdict { margin-top: 0.5rem; font-weight: 700; }
</style>