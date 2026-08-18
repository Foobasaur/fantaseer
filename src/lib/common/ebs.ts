import { error } from '@sveltejs/kit';

import { browser } from '$app/environment';
import { resolve } from '$app/paths';
import type { Pathname, ResolvedPathname, RouteId, RouteParams } from '$app/types';

import { twitch } from '$lib/common/twitch/svelted/twitch.svelte';
import { ensure } from '$lib/utilz/polly';
import type { Server } from '@';

const API = import.meta.env.VITE_EBS_URL;

interface Opts<R extends RouteId = RouteId> {
  path?: Pathname | ResolvedPathname;
  route?: { id: R };
  params?: RouteParams<R>;
  fetch?: typeof fetch;
  depends?: (...deps: Array<`${string}:${string}`>) => void;
}
export default function <R extends RouteId = RouteId>(opts: Pathname | ResolvedPathname | Opts<R>) {
  const { path, fetch, depends, route, params }: Opts<R> = typeof opts === 'object' ? opts : { path: opts };
  const url = ensure(
    path ||
      (route &&
        (resolve as unknown as (id: string, params?: Record<string, string | undefined>) => ResolvedPathname)(
          `/api${route.id}`,
          params
        ))
  );
  const input = new URL(`/api${url.replace(/^.*?\/?api\/([^#?]*).*$/, '/$1').replace(/\/undefined/g, '')}`, API || origin);

  const reply = async <T>(
    params?: Record<string, strumbol>,
    init?: RequestInit
  ): Promise<
    [R] extends ['/configure/[kind]'] ? Server.EBS.Configure
    : [R] extends ['/app/[game]/[[mode]]/fantasy/[draft]'] ? Server.EBS.Draft<'get'>
    : [R] extends ['/app/[game]/[[mode]]/fantasy'] ? Server.EBS.Fantasy
    : [R] extends ['/app/[game]/[[mode]]/pickaroo'] ? Server.EBS.Predictachu
    : [R] extends (
      [
        | '/app/[game]/[[mode]]'
        | '/app/[game]/[[mode]]/fantasy'
        | '/app/[game]/[[mode]]/fantasy/[draft]'
        | '/app/[game]/[[mode]]/pickaroo'
        | '/app/[game]/[[mode]]/scores'
      ]
    ) ?
      Server.EBS.Game
    : T & { sourcee: string | '*' }
  > => {
    Object.entries(params || {}).forEach(([k, v]) => input.searchParams.set(k, String(v)));
    console.log('EBS request:', input);
    const res = await (fetch || globalThis.fetch)(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(browser && {
          'x-ext-auth-jwt': twitch.auth?.token || '',
          'x-ext-ctx-mode': twitch.ctx?.mode || ''
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
      return {
        ...JSON.parse(json || body),
        sourcee: ((v?: `${string}:${string}`) => (v && depends?.(v), v))(route && `ebs:${route.id}`) || '*'
      };
    } else error(599, JSON.parse(body)?.message || body || 'Unknown');
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
