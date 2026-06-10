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
  try {
    await waitFor(() => [Twitch.I.auth, Twitch.I.ctx, Twitch.I.viewer].every(Boolean), {
      step: 300,
      timeout: import.meta.env.VITE_TARGET === 'mock' ? 3 : 30
    });
    await authHander();
    console.log('Twitch Extension Init:', Twitch.I.auth, Twitch.I.ctx, Twitch.I.viewer, Twitch.I.helixer);
    Twitch.I.pubsub?.onBroadcast<DB.FeedEntry<DB.Tablekey> | DB.TBatch<DB.Tablekey>>(async msg => {
      if (msg.data && 'events' in msg.data) Twitch.I.emit('*', msg.data);
      else if (msg.data) Twitch.I.emit(msg.data.event, { payload: msg.data.payload, values: msg.data.values });
    });
  } catch (e) {
    throw new Error(`Error waiting for Twirch ext client helper initialization: ${e instanceof Error ? e.message : e}`);
  }
};

export const usePubSub = (handlers: {
  [K in keyof DB.TMultiEvent<DB.Tablekey> | '*']?: K extends '*' ? (batch: DB.TBatch<DB.Tablekey>) => void
  : (data: DB.TMultiEvent<DB.Tablekey>[Exclude<K, '*'>] | Array<DB.TMultiEvent<DB.Tablekey>[Exclude<K, '*'>]>) => void;
}) => {
  const events = Object.entries(handlers).map(([event, handler]) => ({ event, handler: handler as (data: any) => void }));
  onMount(() => {
    events.forEach(({ event, handler }) => Twitch.I.on(event, handler));
    return () => events.forEach(({ event, handler }) => Twitch.I.off(event, handler));
  });
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
