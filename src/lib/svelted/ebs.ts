import { browser } from '$app/environment';
import type { Pathname, ResolvedPathname } from '$app/types';
import { Twitch } from '$lib/core/twitch/svelted/Extension.svelte';
import { error } from '@sveltejs/kit';

type Opts = { fetch?: typeof fetch; path: Pathname | ResolvedPathname };
export default function <U>({ fetch = globalThis.fetch, path }: Opts) {
  const endpoint = path.replace(/^.*?\/?api\/([^#?]*).*$/, '/$1').replace(/\/undefined/g, '');
  const input = new URL(`/api${endpoint}`, import.meta.env.VITE_EBS_URL || origin);

  const reply = async <T>(params?: Record<string, strumbol>, init?: RequestInit): Promise<T> => {
    Object.entries(params || {}).forEach(([k, v]) => input.searchParams.set(k, String(v)));
    console.log('EBS request:', input);
    const res = await fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(browser && {
          'x-ext-auth-jwt': Twitch.I.auth?.token || '',
          'x-ext-ctx-mode': Twitch.I.ctx?.mode || ''
        })
      }
    });
    const body = await res.text();
    if (res.ok) {
      // gzip magic 1f8b08 → base64 'H4sI', always
      const json =
        body.startsWith('H4sI') &&
        (await new Response(
          new Blob([Uint8Array.from(atob(body), c => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))
        ).text());
      return JSON.parse(json || body) as T;
    } else error(599, JSON.parse(body)?.message || body || 'Unknown');
  };
  return {
    async get<T = U>(params?: Record<string, strumbol>) {
      return await reply<T>(params);
    },
    async post<T = U>(body?: unknown, params?: Record<string, strumbol>) {
      return await reply<T>(params, { method: 'POST', body: JSON.stringify(body || {}) });
    }
  };
}
