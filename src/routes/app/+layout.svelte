<script lang="ts">
import { useAuthListener } from '$lib/common/twitch/svelted/twitch.svelte';

let { children } = $props();
const store = useAuthListener();
</script>

{#if store.linked}
  {@render children()}
{:else}
  <div class="flex h-dvh items-center justify-center">
    <button class="btn btn-primary" onclick={() => store.link()}> Share Identity to Continue </button>
  </div>
{/if}
