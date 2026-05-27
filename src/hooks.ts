// src/hooks.ts (universal — both server and client)
import { page } from '$app/state';
import type { Reroute } from '@sveltejs/kit';

export const reroute: Reroute = ({ url }) => {
  // When loaded at the bare Twitch deploy URL, route to /app
  if (/\/[a-f0-9]{32}(\/index\.html)?$/.test(url.pathname)) {
    return url.hash.replace(/^#/, '').split('?')[0] || '/app';
  }
};
