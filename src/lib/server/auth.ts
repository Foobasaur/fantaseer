import { env } from '$env/dynamic/private';
import type { Server, Twitch } from '@';
import { error } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Player, Viewer } from './db/queries/identity';

export const providers = {
  twitch: {
    resolve: async (token, mode) => {
      let jwt: toothy<Twitch.Ext.JWTPayload>;
      try {
        jwt = (([header, body, signature]) =>
          JSON.parse(Buffer.from(header, 'base64url').toString()).alg === 'HS256' && // Algorithm guard
          timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(
              createHmac('sha256', Buffer.from(env.TWITCH_EXTENSION_SECRET, 'base64'))
                .update(`${header}.${body}`)
                .digest('base64url')
            )
          ) &&
          (JSON.parse(Buffer.from(body, 'base64url').toString())))(token!.split('.'));
        if (!jwt || !jwt.user_id || jwt.user_id.startsWith('A')) error(401, 'Invalid JWT');
        const opts = { platform: 'twitch', platformId: jwt.user_id };
        const player = jwt.role === 'broadcaster' && mode === 'config';
        const identity = await (player ? Player<Twitch.Player> : Viewer<Twitch.Viewer>)(opts);
        const [authenticated] = identity.length ? identity : await Viewer<Twitch.Viewer>(opts);
        return { authenticated, jwt }; // ✅ wrap only the identity case
      } catch (err) {
        if (process.env.VITE_TARGET !== 'mock') {
          console.warn('Auth provider error:', err);
          return jwt && { anonymous: {}, jwt };
        } else
          return (mock => ({
            authenticated: mock,
            jwt: {
              exp: 1778048730,
              opaque_user_id: 'UZz3YwoOd_efdBnxftIxN',
              user_id: '174152420',
              channel_id: '1480939574',
              role: 'viewer',
              is_unlinked: false,
              pubsub_perms: {
                listen: ['broadcast', 'whisper-UZz3YwoOd_efdBnxftIxN', 'global']
              }
            } as Twitch.Ext.JWTPayload
          }))((await Viewer<Twitch.Viewer>({ id: 7 }))[0]);
      }
    }
  } satisfies Server.Auth.IAuthProvider<Twitch.Viewer | Twitch.Player, Twitch.Ext.JWTPayload>
} as const;
