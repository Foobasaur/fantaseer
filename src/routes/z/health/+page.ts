// src/routes/z/health/+page.ts
export const csr = true;
export const ssr = false;
export const prerender = false;

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
  // cheap check: awaited, blocks navigation for one quick round-trip only
  const fast = await fetch('/api/z/health', { cache: 'no-store' }).then((r) => r.json());

  // long-running check: promise handed to the page for {#await}
  const slow = fetch(`/api/z/health/slow${url.search}`, { cache: 'no-store' }).then(async (r) => {
    const body = await r.json();
    if (!r.ok) throw new Error(body?.message ?? `status ${r.status}`);
    return body as { dep: string; ok: boolean; tookMs: number };
  });
  slow.catch(() => {}); // noop guard: never let this surface as an unhandledrejection

  return { fast, slow };
};