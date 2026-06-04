// src/hooks.client.ts
import { init as Twitch } from '$lib/core/twitch/svelted/twitch.svelte';
import { init as Games } from '$lib/core/games/games';
import type { ClientInit, HandleClientError } from '@sveltejs/kit';
import './lib/utilz/logger';

export const init: ClientInit = async () => {
  try {
    Games();
    await Twitch();
  } catch (e) {
    console.warn('Error initializing client:', e);
  }
};

// Sentry.init({/*...*/})

export const handleError: HandleClientError = async ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();
  await fetch(`${import.meta.env.VITE_EBS_URL || ''}/api/log/error`, {
    method: 'POST',
    keepalive: true,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      errorId,
      status,
      message,
      name: (error as Error)?.name,
      stack: (error as Error)?.stack,
      href: location.href,
      route: event.route?.id
    })
  }).catch(e => console.warn('Failed to log client error:', e));

  // example integration with https://sentry.io/
  // Sentry.captureException(error, {
  // 	extra: { event, errorId, status }
  // });

  return { message, errorId };
};
