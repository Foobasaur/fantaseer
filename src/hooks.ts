// src/hooks.ts (universal — both server and client)
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
  const route = () => url.hash.replace(/^#/, '').split('?')[0] || '/app';
  // Twitch deploy URL: bare 32-char hash dir, optionally with /index.html
  if (/\/[a-f0-9]{32}(\/index\.html)?$/.test(url.pathname)) {
    console.log('Reroute', url);
    return route();
  }
  // Local dev rig serves /index.html (or bare /) with the route in the hash
  // if (url.host === 'localhost:5173' && url.pathname === '/index.html') return route();
};
