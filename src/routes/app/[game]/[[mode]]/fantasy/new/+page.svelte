<script lang="ts">
import DraftView from '$lib/core/games/HS/impl/fantasy/draft/svelted/ui/Draft.svelte';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import Header from '$lib/svelted/ui/layout/Header.svelte';

let error = $state('');
let loading = $state(true);
let { data, params } = $props();
const category = $derived(data.categories.find(c => c.mode === params.mode)!);
// Settlement is surfaced from here, not the {#await} branches: state writes during branch render throw
// state_unsafe_mutation and silently never land.
$effect(() => {
  data.req.catch((e: Error) => (error = e.message)).finally(() => (loading = false));
});
</script>

<Header bind:error bind:loading />
{#await data.req}<Empty animate={true} tagline="loading..." />
{:then req}<DraftView bind:error {category} data={{ ...data, req }} />
{:catch}<Empty />{/await}
