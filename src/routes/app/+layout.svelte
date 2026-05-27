<script lang="ts">
import { useAuthListener } from '$lib/core/twitch/svelted/twitch.svelte';
import { onMount } from 'svelte';

let { children } = $props();
const store = useAuthListener();
// onMount(() => {
//   // src/hooks.client.ts (or in onMount of root +layout.svelte)
//   // document.addEventListener(
//   //   'click',
//   //   e => {
//   //     const a = (e.target as Element).closest?.('a');
//   //     if (!a) return;
//   //     const href = a.getAttribute('href');
//   //     if (!href || href.startsWith('#') || /^[a-z]+:/.test(href)) return;
//   //     if (href.startsWith('/')) {
//   //       e.preventDefault();
//   //       location.hash = href;
//   //     }
//   //   },
//   //   true
//   // ); // capture phase so it runs before SvelteKit's link handler
// });
</script>

{#if store.linked}
  {@render children()}
{:else}
  <div class="flex h-dvh items-center justify-center">
    <button class="btn btn-primary" onclick={() => store.link()}> Share Identity to Continue </button>
  </div>
{/if}
