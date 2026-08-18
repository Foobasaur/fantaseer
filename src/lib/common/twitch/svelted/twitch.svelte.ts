import { resolve } from '$app/paths';
import ebs from '$lib/common/ebs';
import { waitFor } from '$lib/utilz/polly';
import type { Server, Twitch } from '@';
import { onMount } from 'svelte';
import { Extension } from '../Extension';

export const twitch = $state<toothy<Extension>>(import.meta.env.VITE_BANG === 'twitch' && new Extension());

let viewer = $state<toothy<Twitch.Viewer>>();
const authHander = async () => {
  if (!twitch) return;
  return (viewer ||=
    (await (h => ebs(resolve('/api/configure/[kind]', { kind: 'viewer' })).post<Twitch.Viewer>(h))(await twitch.Viewer())));
};

export const init = async () => {
  if(!twitch) return;
  try {
    await waitFor(() => [twitch.auth, twitch.ctx, twitch.viewer].every(Boolean), {
      step: 300,
      timeout: import.meta.env.VITE_TARGET === 'mock' ? 3 : 30
    });
    await authHander();
    console.log('Twitch Extension Init:', twitch.auth, twitch.ctx, twitch.viewer, twitch.helixer);
    twitch.pubsub?.onBroadcast<Server.DB.FeedEntry<Server.DB.Tablekey> | Server.DB.TBatch<Server.DB.Tablekey>>(async msg => {
      if (!msg.data) return;
      else if ('events' in msg.data) twitch.emit('*', msg.data);
      else twitch.emit(msg.data.event, { payload: msg.data.payload, values: msg.data.values });
    });
  } catch (e) {
    throw new Error(`Error waiting for Twirch ext client helper initialization: ${e instanceof Error ? e.message : e}`);
  }
};

export const usePubSub = (
  handlers: {
    [K in keyof Server.DB.TMultiEvent<Server.DB.Tablekey> | '*']?: K extends '*' ?
      (batch: Server.DB.TBatch<Server.DB.Tablekey>) => void
    : (
        data:
          | Server.DB.TMultiEvent<Server.DB.Tablekey>[Exclude<K, '*'>]
          | Array<Server.DB.TMultiEvent<Server.DB.Tablekey>[Exclude<K, '*'>]>
      ) => void;
  },
  ...emmits: Array<Server.DB.TEventKey<Server.DB.Tablekey>>
) => {
  const events = Object.entries(handlers).map(([event, handler]) => ({
    event,
    handler: (data: Parameters<NonNullable<typeof handler>>[0]) =>
      (!('events' in data) || !emmits.length || emmits.some(n => data.events.includes(n))) &&
      (handler as (d: typeof data) => void)(data)
  }));
  onMount(() => {
    if(!twitch) return;
    events.forEach(({ event, handler }) => twitch.on(event, handler));
    return () => events.forEach(({ event, handler }) => twitch.off(event, handler));
  });
};

export const useAuthListener = () => {
  onMount(() => {
    if(!twitch) return;
    twitch.on('authorized', authHander);
    return () => twitch.off('authorized', authHander);
  });

  // prettier-ignore
  return {
    link: () =>twitch && twitch.actions.requestIdShare(),
    get linked() { return !twitch || twitch.viewer.isLinked; },
    get viewer() { return viewer; }
  };
};
