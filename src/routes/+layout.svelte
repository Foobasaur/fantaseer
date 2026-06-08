<script lang="ts">
import favicon from '$lib/assets/favicon.svg';
import '../app.css';
let { children } = $props();
</script>

<svelte:head>
  <title>fantaseer</title>
  <link rel="icon" href={favicon} />
  <meta name="description" content="fantasy game drafts and pick'ems, built for Twitch streamers." />
</svelte:head>
{@render children()}
