import { providers } from '$lib/server/auth';
import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';

// const ALLOWED_ORIGIN = ['Access-Control-Allow-Origin', `https://${env.TWITCH_EXTENSION_CLIENT_ID}.ext-twitch.tv`];
export const init: ServerInit = async () => {
  if (process.env.VITE_TARGET !== 'extension') await import('$lib/core/games/games.server').then(async m => await m.init());
};

export const handle: Handle = async ({ event, resolve }) => {
  const jwt = event.request.headers.get('x-ext-auth-jwt');
  const mode = event.request.headers.get('x-ext-ctx-mode');
  event.locals.user = await providers.twitch.resolve(jwt, mode);
  return resolve(event);
};

// Sentry.init({/*...*/})
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
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
