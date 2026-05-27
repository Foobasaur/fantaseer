import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import type { Twitch } from '@';
import { error } from '@sveltejs/kit';

// Twitch API helpers for server routes. These wrap fetch with the appropriate headers and error handling.
// ── ex: Fetch full Helix user profile ─────────────────────────────────────
// const {
//   data: [user]
// } = await helix<TT.Helix.User>('users');
export const helix = async <T>(init?: RequestInit & { endpoint?: string; search?: URLSearchParams }) => {
  const { fetch, request, url, params } = getRequestEvent();
  const endpoint = init?.endpoint || params.endpoint;
  const search = init?.search || url.searchParams;
  const origin = request.headers.get('mock') ? 'http://localhost:8080/mock' : 'https://api.twitch.tv/helix';

  const reply = await fetch(`${origin}/${endpoint}?${search}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'client-id': request.headers.get('client-id') || env.TWITCH_CLIENT_ID,
      authorization: request.headers.get('authorization')!,
      ...init?.headers
    },
    body: init?.method === 'POST' ? JSON.stringify(await request.json()) : undefined
  });
  if (!reply.ok) error(reply.status, `Twitch Helix API error (${endpoint}): ${await reply.text()}`);
  return reply.json() as Promise<Twitch.Helix.IResponse<T>>;
};

// ── Player Chatters ie Viewers
// const helixer = resolve('/api/twitch/helix/[...endpoint]', { endpoint: 'chat/chatters' });
// https://dev.twitch.tv/docs/api/reference/#get-chatters
export const chatters = async (channelId: string) => {
  const chatters: Twitch.Helix.Chatter[] = [];
  const search = new URLSearchParams({ broadcaster_id: channelId, moderator_id: channelId, first: '1000' });
  while (
    (page => (chatters.push(...page.data), page.pagination?.cursor && (search.set('after', page.pagination.cursor), true)))(
      await helix<Twitch.Helix.Chatter>({ endpoint: 'chat/chatters', search })
    )
  );
  return chatters;
};
