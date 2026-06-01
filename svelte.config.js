import adapterSST from 'svelte-kit-sst';
import adapterTwitch from './.scripts/svelte-adapter-twitch.js';

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    adapter: adapterSST(),
    alias: { '@': 'src/@' },
    inlineStyleThreshold: Infinity,
    ...(process.env.VITE_TARGET === 'extension' && {
      adapter: adapterTwitch(),
      embedded: true,
      paths: { relative: true },
      output: { bundleStrategy: 'single' }
    })
  },
  compilerOptions: {
    runes: ({ filename }) => ((n => n.includes('node_modules'))(filename.split(/[/\\]/)) ? undefined : true)
  }
};
