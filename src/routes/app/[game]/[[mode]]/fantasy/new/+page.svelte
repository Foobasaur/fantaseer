<script lang="ts">
import DraftView from '$lib/core/games/HS/impl/fantasy/draft/svelted/ui/Draft.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';

let { data } = $props();
let error = $state('');
</script>

<Header bind:error />
{#await data.req}
  <Empty />
{:then req}
  <DraftView bind:error data={{ ...data, req }} />
{:catch err}
  {(error = err.message)}
{/await}
