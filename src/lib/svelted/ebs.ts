import { browser } from '$app/environment';
import type { Pathname, ResolvedPathname } from '$app/types';
import { Twitch } from '$lib/core/twitch/svelted/services/Extension.svelte';
import { error } from '@sveltejs/kit';

type Opts = { fetch?: typeof fetch; path: Pathname | ResolvedPathname };
export default function ({ fetch = globalThis.fetch, path }: Opts) {
  const endpoint = path.replace(/^.*?\/?api\/([^#?]*).*$/, '/$1').replace(/\/undefined/g, '');
  const input = new URL(`/api${endpoint}`, import.meta.env.VITE_EBS_URL || origin);

  const reply = async <T>(params?: Record<string, strumbol>, init?: RequestInit): Promise<T> => {
    const headers = {
      'Content-Type': 'application/json',
      ...(browser && {
        'x-ext-auth-jwt': Twitch.I.auth?.token || '',
        'x-ext-ctx-mode': Twitch.I.ctx?.mode || ''
      })
    };
    Object.entries(params || {}).forEach(([k, v]) => input.searchParams.set(k, String(v)));
    console.log('EBS request:', input);
    const res = await fetch(input, { ...init, headers });
    if (!res.ok) {
      const body = await res.text();
      return error(599, JSON.parse(body)?.message || body || 'Unknown');
    }
    const data = await res.json();
    if (res.headers.get('x-gz')) {
      const bytes = Uint8Array.from(atob(data.gz), c => c.charCodeAt(0));
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      return JSON.parse(await new Response(stream).text()) as T;
    }
    return data as T;
  };
  return {
    async get<T>(params?: Record<string, strumbol>) {
      return await reply<T>(params);
    },
    async post<T>(body?: unknown, params?: Record<string, strumbol>) {
      return await reply<T>(params, { method: 'POST', body: JSON.stringify(body || {}) });
    }
  };
}
