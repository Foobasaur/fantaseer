<script lang="ts">
import { onMount } from 'svelte';

let countdown = $state(6);

onMount(() => {
  const interval = setInterval(() => {
    countdown--;
    if (countdown <= 0) {
      clearInterval(interval);
      window.close();
    }
  }, 1000);
  return () => clearInterval(interval);
});
</script>

<div class="flex min-h-screen items-center justify-center bg-base-200">
  <div class="card mx-4 w-full max-w-md bg-base-100 shadow-xl">
    <div class="card-body items-center gap-4 text-center">
      <div class="text-6xl">👍</div>
      <h1 class="card-title text-2xl">Login Successful</h1>
      <p class="text-base-content/60">You can close this tab and return to the app.</p>
      <p class="text-sm text-base-content/40">Closing in {countdown}s&hellip;</p>
    </div>
  </div>
</div>
