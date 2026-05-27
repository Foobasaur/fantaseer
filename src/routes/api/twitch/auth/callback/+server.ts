import { oauth } from '$lib/server/twitch/auth';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// GET /api/twitch/auth/callback?code=XXX&state=YYY
//
// Handles the Twitch OIDC callback after user authorization.
//
// Steps:
//   1. Verify state cookie matches query param (CSRF guard)
//   2. POST to https://id.twitch.tv/oauth2/token (server-to-server, client_secret required)
//   3. Redirect to client after successful token exchange
//      — TODO?: If redirect_after is same-origin, tokens stay in the cookie only.
export const GET: RequestHandler = async () => redirect(302, await oauth().callback());
