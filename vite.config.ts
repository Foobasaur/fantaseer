import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  ...(process.env.VITE_TARGET === 'extension' ?
    { build: { sourcemap: true, minify: false } }
  : { build: { sourcemap: false } })
});
