<!-- src/routes/z/health/+page.svelte -->
<script lang="ts">
import { resolve } from '$app/paths';

let { data } = $props();

let slowAt = $state(-1);
$effect(() => {
  const p = data.slow; // re-arm per navigation/invalidation
  const start = performance.now();
  slowAt = -1;
  const settle = () => {
    if (p === data.slow) slowAt = Math.round(performance.now() - start);
  };
  p.then(settle, settle);
});
const verdict = $derived(
  slowAt < 0 ? ''
  : slowAt > 600 ? 'STREAMED'
  : 'BUFFERED'
);
</script>

<div class="probe">
  <div class="bar">
    <span>base health — /z/health</span>
    <nav>
      <a href={resolve('/z/health/stream')}>stream probe</a>
      <a href={resolve('/api/z/health')}>api</a>
    </nav>
  </div>
  <div class="out">
    <div data-fast>fast: ok={data.fast.ok} now={data.fast.now}</div>
    {#await data.slow}
      <div data-skeleton>slow: checking…</div>
    {:then v}
      <div data-slow>slow: dep={v.dep} ok={v.ok} took={v.tookMs}ms</div>
    {:catch err}
      <div data-err>slow: ERR {err.message}</div>
      <!-- :catch is mandatory once promises can reject mid-stream -->
    {/await}
    {#if slowAt >= 0}
      <div class="verdict">slow settled +{slowAt}ms after hydration -&gt; {verdict}</div>
    {/if}
  </div>
</div>

<style>
.probe {
  max-width: 40rem;
  margin: 2rem auto;
  font-family: ui-monospace, monospace;
}
.bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.bar nav {
  display: flex;
  gap: 0.75rem;
}
.out {
  white-space: pre;
  background: #111;
  color: #ddd;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  min-height: 6rem;
}
.verdict {
  margin-top: 0.5rem;
  font-weight: 700;
}
</style>
