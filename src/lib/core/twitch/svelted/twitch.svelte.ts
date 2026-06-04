import { resolve } from '$app/paths';
import ebs from '$lib/svelted/ebs';
import { waitFor } from '$lib/utilz/polly';
import type { DB, Twitch as TT } from '@';
import { onMount } from 'svelte';
import { Twitch } from './services/Extension.svelte';

let isLinked = $state(true);
let viewer = $state<toothy<TT.Viewer>>();

const authHander = async () => {
  return (viewer ||= isLinked =
    Twitch.I.viewer.isLinked &&
    (await (h => ebs({ path: resolve('/api/configure/[kind]', { kind: 'viewer' }) }).post<TT.Viewer>(h))(
      await Twitch.I.Viewer()
    )));
};

export const init = async () => {
  if (!import.meta.env.VITE_TARGET) throw new Error('VITE_TARGET Not Set'); // only initialize in extension context
  try {
    await waitFor(() => [Twitch.I.auth, Twitch.I.ctx, Twitch.I.viewer].every(Boolean), {
      step: 300,
      timeout: import.meta.env.VITE_TARGET === 'mock' ? 3 : 30
    });
    await authHander();
    console.log('Twitch Extension Init:', Twitch.I.auth, Twitch.I.ctx, Twitch.I.viewer, Twitch.I.helixer);
    Twitch.I.pubsub?.onBroadcast<DB.FeedEntry<DB.Tablekey> | { events: Array<DB.TEventKey<DB.Tablekey>>; payload?: any }>(
      async msg => {
        if (msg.data && 'events' in msg.data) msg.data.events.forEach(e => Twitch.I.emit(e, { payload: msg.data?.payload }));
        else if (msg.data) Twitch.I.emit(msg.data.event, { payload: msg.data.payload, values: msg.data.values });
      }
    );
  } catch (e) {
    throw new Error(`Error waiting for Twirch ext client helper initialization: ${e instanceof Error ? e.message : e}`);
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
      events.push({ event, handler });
      Twitch.I.on(event, handler);
    }
    return () => events.forEach(({ event, handler }) => Twitch.I.off(event, handler));
  });
};
