// src/routes/api/z/health/slow/+server.ts
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const GET: RequestHandler = async ({ url }) => {
  await delay(1200); // the long-running check lives server-side now
  if (url.searchParams.has('fail')) error(503, 'slow dependency failed (?fail)');
  return json({ dep: 'slow-dependency', ok: true, tookMs: 1200 });
};