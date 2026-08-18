// src/routes/z/health/stream/+page.ts
export const csr = true;
export const ssr = false;
export const prerender = false;

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const t0 = Date.now();
  const res = await fetch('/api/z/health/stream', { cache: 'no-store' });
  if (!res.ok || !res.body) throw new Error(`probe fetch: ${res.status}`);
  return { body: res.body, t0 };   // headers-only await; body streams into the component
};