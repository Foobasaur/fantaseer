import adapterSST from 'svelte-kit-sst';
import adapterTwitch from './.scripts/svelte-adapter-twitch.js';

/** @type {import('@sveltejs/kit').Config} */
export default {
  compilerOptions: {
    runes: ({ filename }) =>
      (n => n.includes('node_modules') || n.includes('.sst'))(filename.split(/[/\\]/)) ? undefined : true
  },
  kit: {
    adapter: adapterSST(),
    inlineStyleThreshold: Infinity,
    alias: { '@': 'src/@' },
    typescript: {
      config: config => ({
        ...config,
        include: [...config.include, '../drizzle.config.ts']
      })
    },
    ...(process.env.VITE_TARGET === 'extension' && {
      adapter: adapterTwitch(),
      embedded: true,
      paths: { relative: true },
      output: { bundleStrategy: 'single' }
    })
  }
};
