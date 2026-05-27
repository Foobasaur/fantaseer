import { resolve } from '$app/paths';
import ebs from '$lib/svelted/ebs';
import { waitFor } from '$lib/utilz/polly';
import type { DB, Twitch as TT } from '@';
import { onMount } from 'svelte';
import { Twitch } from './services/Extension.svelte';

let viewer = $state<toothy<TT.Viewer>>();
let isLinked = $state(import.meta.env.VITE_TARGET === 'mock');

const authHander = async () => {
  if(viewer) return;
  isLinked = Twitch.I.viewer.isLinked;
  const helixer = isLinked && (await Twitch.I.Viewer());
  return (viewer =
    helixer && (await ebs({ path: resolve('/api/configure/[kind]', { kind: 'viewer' }) }).post<TT.Viewer>(helixer)));
};

export const init = async () => {
  try {
    console.log('Initializing Twitch Extension client helper...');
    await waitFor(() => [Twitch.I.auth, Twitch.I.ctx, Twitch.I.viewer].every(Boolean), {
      timeout: isLinked ? 3 : 60,
      step: 250
    });
    await authHander();
    console.log('Twitch Extension Auth:', Twitch.I.auth);
    console.log('Twitch Extension Context:', Twitch.I.ctx);
    console.log('Twitch Extension Viewer:', Twitch.I.viewer);
    console.log('Twitch Extension User:', Twitch.I.helixer);
    Twitch.I.pubsub?.onBroadcast<DB.FeedEntry<DB.Tablekey>>(async msg => {
      Twitch.I.emit(msg.data.event, {payload: msg.data.payload, values: msg.data.values });
      console.log('Received PubSub broadcast message:', msg);
    });
  } catch (e) {
    throw new Error(
      'Error waiting for Twirch ext client helper initialization: ' + (e instanceof Error ? e.message : String(e))
    );
  }
};

export const useAuthListener = () => {
  onMount(() => {
    Twitch.I.on('authorized', authHander);
    return () => Twitch.I.off('authorized', authHander);
  });

  // prettier-ignore
  return {
    link: () => Twitch.I.actions.requestIdShare(),
    get linked() { return isLinked; },
    get viewer() { return viewer; }
  };
};

// Define the event map: event name -> payload type
export const usePubSub = <T extends DB.Tablekey>(handlers: {
  [K in keyof DB.TMultiEvent<T>]?: (data: DB.TMultiEvent<T>[K] | Array<DB.TMultiEvent<T>[K]>) => void;
}) => {
  const events = new Array<{ event: string; handler: (data: any) => void }>();
  onMount(() => {
    for (const [event, handler] of Object.entries(handlers) as [string, (data: any) => void][]) {
      if (!handler) continue;
      events.push({ event, handler });
      Twitch.I.on(event, handler);
    }
    return () => events.forEach(({ event, handler }) => Twitch.I.off(event, handler));
  });
};
