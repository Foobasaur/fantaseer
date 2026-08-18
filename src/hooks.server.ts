import { init as Games } from '$lib/core/games/games.server';
import { hs } from '$lib/core/games/HS/hs.server';
import { providers } from '$lib/server/auth';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { gzipSync } from 'node:zlib';

// const ALLOWED_ORIGIN = ['Access-Control-Allow-Origin', `https://${env.TWITCH_EXTENSION_CLIENT_ID}.ext-twitch.tv`];
export const init: ServerInit = async () => {
  if (process.env.VITE_TARGET === 'extension') return;
  else Games([hs]);
};

export const handle: Handle = async ({ event, resolve }) => {
  const jwt = event.request.headers.get('x-ext-auth-jwt');
  const mode = event.request.headers.get('x-ext-ctx-mode');
  const client = event.request.headers.get('x-game-client');
  event.locals.user = client !== 'HDT' && (await providers.twitch.resolve(jwt, mode));

  const response = await resolve(event);
  if (client !== 'HDT' && response.body && response.headers.get('content-type')?.startsWith('application/json')) {
    const raw = Buffer.from(await response.arrayBuffer());
    return raw.byteLength < 999_999 ?
        new Response(raw, response) // small → passthrough
      : new Response(gzipSync(raw).toString('base64'), (response.headers.delete('content-length'), response)); // large → gzip + base64
  } else return response; // passthrough
};

// Sentry.init({/*...*/})
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  if (event.url.pathname === '/favicon.ico') return;

  const errorId = crypto.randomUUID();

  // example integration with https://sentry.io/
  // Sentry.captureException(error, {
  // 	extra: { event, errorId, status }
  // });

  // This single line is what SST Issues hooks onto.
  // Keep the original error as `cause` so the stack survives & source-maps resolve.
  console.error(
    Object.assign(new Error(`[${errorId}] ${event.route?.id ?? event.url.pathname} → ${message}`), {
      errorId,
      status,
      cause: error,
      route: event.route?.id,
      method: event.request.method,
      awsRequestId: event.request.headers.get('x-amzn-requestid'),
      userId: event.locals.user && event.locals.user.authenticated?.id
    })
  );

  return {
    errorId,
    ...(error instanceof Error ?
      { message: error.message || 'Foobaroopsis', cause: 'cause' in error ? (error as any).cause : undefined }
    : { message })
  };
};
