<script lang="ts">
import { resolve } from '$app/paths';
import { page } from '$app/state';
</script>

<h1 class="text-3xl font-bold underline">Foobasaur</h1>
{#if page.data.games.length === 0}
  <p>No games found.</p>
{:else}
  <ul class="rounded-xl bg-base-200">
    {#each page.data.games as game}
      <li class="p-3">
        <a href={resolve('/app/[game]', { game: game.code })}>
          <span class="font-medium">{game.name}</span>
        </a>
      </li>
    {/each}
  </ul>
{/if}
