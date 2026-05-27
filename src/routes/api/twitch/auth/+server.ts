// src/routes/api/twitch/auth/+server.ts
//
// GET /api/twitch/auth/
//
// Initiates the Twitch OIDC authorization code flow.
// Mirrors the reference pattern from twitchdev/authentication-node-sample.
//
// Query params:
//   redirect_after  — URL to redirect to after successful exchange
//                     (default: /). Carried through the flow via state cookie.
//
// Flow:
//   1. Generate cryptographic state + nonce
//   2. Store in HttpOnly cookie: `{state}|{b64(redirect_after)}|{nonce}`
//   3. Redirect browser → Twitch authorize

import { oauth } from '$lib/server/twitch/auth';
import { catchy } from '$lib/utilz/polly';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Pack state + redirect_after + nonce into one cookie value
export const GET: RequestHandler = async () => redirect(302, await oauth().start());


// src/routes/api/twitch/auth/+server.ts
//
// POST /api/twitch/auth
//
// Exchanges a refresh_token for a new access_token via Twitch's token endpoint.
// Returns the new token set as JSON and rotates the session cookie.
//
// Body (JSON):
//   { string }
//
// Response 200:
//   { player: Twitch.Player, tokens: Twitch.oauth2.Token }
//
// Notes:
//   - Twitch rotates the refresh_token on each use — always persist the new one.
//   - id_token is not guaranteed in refresh responses; field is omitted if absent.
export const POST: RequestHandler = ({url}) => catchy(async () =>{
  const auth = oauth();
  const type = url.searchParams.get('type') as keyof typeof auth;
  console.log('Auth type:', type);
  return auth[type]();
});
