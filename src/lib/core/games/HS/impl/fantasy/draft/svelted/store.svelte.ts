import { isHttpError } from '@sveltejs/kit';

import { goto } from '$app/navigation';
import { page } from '$app/state';
import ebs from '$lib/common/ebs';
import { adopt, type Filter } from '$lib/core/games/HS/impl/fantasy/draft/rules';
import { PREFIXER } from '$lib/utilz/morph';
import { faster } from '$lib/utilz/polly';
import type { HS, Server } from '@';

// CACHE
const cache = $state<Partial<Record<string, { filtered: HS.Card[]; picks: HS.Card[]; filter: Filter }>>>({});

// STORE
export const create = (mode: HS.Mode | (string & {}), pool: HS.Card[]) => {
  cache[mode] ||= {
    picks: [],
    filtered: [],
    filter: {
      search: '',
      mana: -1,
      tier: 0,
      radials: [] as strumbol[],
      set: PREFIXER,
      card: PREFIXER,
      minion: PREFIXER,
      spell: PREFIXER,
      mechanic: PREFIXER
    }
  };
  const session = cache[mode];
  const { rules, options } = adopt(mode, pool);
  $effect(() => {
    session.filtered = [];
    const filter = { ...session.filter };
    const needle = filter.search.toLowerCase();
    return faster(
      pool.length,
      i =>
        rules.check(filter, pool[i]).every(Boolean) &&
        (needle.length < 4 || options.haystacks[i].includes(needle)) &&
        session.filtered.push(pool[i])
    );
  });
  return {
    get session() {
      return session;
    },
    get rules() {
      return rules;
    },
    get options() {
      return options;
    },
    get validate() {
      return rules.validate(session.picks);
    },
    canAdd: (candidate: HS.Card) => session.picks.length < rules.length && rules.canAdd(session.picks, candidate),
    submit: async () => {
      try {
        const req = ebs(`/app/${page.params.game}/${page.params.mode}/fantasy/${page.params.draft}`);
        const res = await req.post<Server.EBS.Draft<'post'>>({ picks: session.picks });
        if (res.success) {
          goto(`/app/${page.params.game}/${page.params.mode}/fantasy/`, { replaceState: true });
          delete cache[mode];
        } else throw new Error('Failed to create draft');
      } catch (err) {
        console.error(err);
        return isHttpError(err) ? err.body.message : (err as Error).message || `An unexpected ${err} occurred`;
      }
    }
  };
};
