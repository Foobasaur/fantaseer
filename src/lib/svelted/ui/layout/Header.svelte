<script lang="ts" generics="T">
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
import { err } from '$lib/utilz/polly';
import type { Snippet } from 'svelte';

interface Props {
  error?: toothy<string>;
  loading?: boolean;
  promise?: Promise<T>;
  children?: Snippet<[T]>;
}
let { loading = $bindable(), error = $bindable(), children, ...props }: Props = $props();

$effect(() => {
  props.promise?.catch(e => (error = err(e))).finally(() => (loading = false));
});
</script>

{#if loading}<span class="loading loading-spinner loading-xl fixed inset-0 m-auto z-69"></span>{/if}
{#if error}
  <div class="ml-3 my-4 alert flex justify-between alert-error">
    <span>{error}</span>
    <button class="btn btn-ghost btn-sm" onclick={() => (error = undefined)}> ✕ </button>
  </div>
{/if}
{#if props.promise}
  {#await props.promise}<Empty animate={true} icon='⏳' tagline="loading..." />
  {:then req}{@render children?.(req)}
  {:catch}<Empty icon='🙊' tagline='Foo Bar Oops?' />{/await}
{/if}
