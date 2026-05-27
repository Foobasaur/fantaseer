<script lang="ts">
import { goto, invalidateAll } from '$app/navigation';
import { resolve } from '$app/paths';
import { page } from '$app/state';
import Empty from '$lib/svelted/ui/layout/Empty.svelte';
</script>

<div class="flex-1 justify-center items-center flex flex-col gap-4 overflow-x-hidden">
  <button
    class="btn btn-link mt-6"
    onclick={() =>{
      goto(
        page.route.id === '/configure/[kind]' && page.params.kind ? resolve('/configure/[kind]', { kind: page.params.kind })
        : page.params.game ? resolve('/app/[game]', { game: page.params.game })
        : resolve('/app')
      )}}>
    <span class="text-5xl font-bold">Foobasaur</span>
  </button>
  <Empty icon="🙊" animate={true} title="Foobaroopsie" tagline={String(page.status)}>
    {#if page.error?.message}<p class={['opacity-70']}>{page.error?.message}</p>{/if}
  </Empty>
  <button class="btn btn-link" onclick={() => history.back()}>Back</button>
</div>
