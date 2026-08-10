import { resolve } from '$app/paths';
import { getRequestEvent } from '$app/server';
import { env } from '$env/dynamic/private';
import { $Player, Player } from '$lib/server/db/queries/identity';
import { delay } from '$lib/utilz/polly';
import type { Server, Twitch } from '@';
import { error } from '@sveltejs/kit';
import { PubSub } from './PubSub';
import { $update } from '../db/kit';

// In-memory store for pending oidc logins
const pending = new Map<string, Twitch.oauth2.Token | undefined>();
const req = () => {
  const { fetch, ...event } = getRequestEvent();
  return {
    event,
    fetch: async <T>(url: string, init: RequestInit) => {
      const res = await fetch(url, init);
      if (res.ok) return res.json() as Promise<T>;
      else error(res.status, `${url} request failed: ${res.status} ${await res.text()}`);
    }
  };
};

// ── Get | Upsert identity + player in DB ────────────────────────────────────
export const authenticate = async (token?: string) => {
  const { event, fetch } = req();

  const authorization = () => event.request.headers.get('Authorization') || error(400, 'Missing Authorization header');
  const validated = await fetch<Twitch.oauth2.Validated>('https://id.twitch.tv/oauth2/validate', {
    // NOTE You may also use the Bearer prefix in place of OAuth in the Authorization header.
    headers: { Authorization: token ? `OAuth ${token}` : authorization() } // https://dev.twitch.tv/docs/authentication/validate-tokens/
  });
  const authorize = (player: Server.Auth.Identity<Twitch.Player>) => {
    event.locals.user = { authenticated: player, oauth: validated };
    return player;
  };
  return {
    get opts() {
      return { platform: 'twitch', platformId: validated.user_id };
    },
    async get() {
      const player = await Player<Twitch.Player>(this.opts);
      return authorize(player[0]);
    },
    async set() {
      const user = await fetch<Twitch.oauth2.UserInfo>('https://id.twitch.tv/oauth2/userinfo', {
        headers: { Authorization: token ? `Bearer ${token}` : authorization() }
      });
      const identity = await $Player<Twitch.Player>({ ...this.opts, meta: { validated: validated, user } });
      const player = authorize(identity[0]);
      await $update('players')({ id: player.id })({
        meta: { avatar: player.meta.user.picture, username: player.meta.user.preferred_username }
      }); // Keep avatar + email up-to-date
      PubSub.I.broadcast<'players'>(player.platformId, { event: 'players:updated', payload: player }); // Notify any active sessions of updated identity
      return player;
    }
  };
};

export const oauth = () => {
  const { event, fetch } = req();
  const key = 'twitch_oauth_state';
  const path = '/api/twitch/auth';

  const token = async (grant_type: 'authorization_code' | 'refresh_token', params: Record<string, string>) => {
    const data = await fetch<Twitch.oauth2.Token>('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.TWITCH_CLIENT_ID,
        client_secret: env.TWITCH_CLIENT_SECRET,
        grant_type,
        ...params
      })
    });
    return data;
  };
  return {
    async init() {
      const nonce = await event.request.json();
      pending.set(nonce, undefined); // Mark session as pending
      return { url: `${event.url.origin}/api/twitch/auth?nonce=${nonce}` };
    },
    async start() {
      // Store state in HttpOnly cookie
      const nonce = event.url.searchParams.get('nonce')!;
      if (!pending.has(nonce)) error(400, 'Invalid nonce'); // Ensure session was initialized

      const state = crypto.randomUUID().replace(/-/g, '');
      event.cookies.set(key, state, {
        path,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 10 // 10 minutes
      });

      const url = new URL('https://id.twitch.tv/oauth2/authorize');
      Object.entries({
        state,
        nonce,
        response_type: 'code',
        client_id: env.TWITCH_CLIENT_ID,
        redirect_uri: `${event.url.origin}/api/twitch/auth/callback`,
        claims: JSON.stringify({
          id_token: { email: null, email_verified: null, preferred_username: null },
          userinfo: { picture: null, email: null, preferred_username: null }
        }),
        scope: ['openid user:read:email', 'moderator:read:chatters'].join(' ')
      }).forEach(([k, v]) => url.searchParams.set(k, v));
      return url.toString();
    },
    async callback() {
      // ── Handle Twitch error response ──────────────────────────────────
      const qerror = event.url.searchParams.get('error_description') ?? event.url.searchParams.get('error');
      if (qerror) error(401, `Twitch authorization denied: ${qerror}`);

      const state = event.cookies.get(key) || error(400, `Missing oauth_state cookie`);
      if (event.url.searchParams.get('state') !== state) error(400, 'State mismatch — possible CSRF attempt');

      // ── Exchange authorization code for tokens ─────────────────────────
      const tokens = await token('authorization_code', {
        code: event.url.searchParams.get('code') ?? error(400, 'Missing code parameter'),
        redirect_uri: `${event.url.origin}${event.url.pathname}`
      });
      pending.set(tokens.nonce, tokens); // Store tokens in-memory keyed by nonce
      event.cookies.delete(key, { path });
      await delay(600); // Ensure client receives pending status before polling succeeds
      return resolve('/web/authed');
    },
    async refresh() {
      // ── Resolve refresh_token: body takes priority over cookie ───────────────
      const refresh_token = await event.request.json();
      const tokens = await token('refresh_token', { refresh_token });

      // ── Exchange with Twitch ──────────────────────────────────────────────────
      // ── Upsert identity + viewer in DB ────────────────────────────────────
      const authenticated = await authenticate(tokens.access_token);
      const player = await authenticated.set();

      // ── Return new tokens ─────────────────────────────────────────────────────
      return { player, tokens };
    },
    async poll() {
      const nonce = await event.request.json();
      if (!pending.has(nonce)) error(404, 'Pending OAuth not found');

      const tokens = pending.get(nonce);
      if (!tokens) error(404, 'OAuth tokens not found oidc still pending');
      else pending.delete(nonce); // Clean up pending oidc nonce

      const authenticated = await authenticate(tokens.access_token);
      const player = await authenticated.set();
      return { player, tokens };
    }
  };
};
