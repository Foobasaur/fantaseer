<script lang="ts">
import Draft from '$lib/core/games/HS/impl/fantasy/draft/svelted/ui/Draft.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';

let { data } = $props();
let { loading, error } = $state({ loading: false, error: '' });
</script>

<Header bind:loading bind:error promise={data.req}>
  {#snippet children(req)}<Draft bind:loading bind:error data={{ ...data, req }} />
  {/snippet}</Header>
