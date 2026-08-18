import { find, type Filter } from '$lib/core/games/HS/impl/fantasy/draft/rules';
import { PREFIXER } from '$lib/utilz/morph';
import { eqludes } from '$lib/utilz/stringz';
import type { HS } from '@';

// PENDING — WIP drafts keyed by mode, survives create() re-entry
const pending = $state<Partial<Record<string, { pool: HS.Card[]; picks: HS.Card[]; filter: Filter }>>>({});

// STORE
export const create = (mode: HS.Mode | (string & {}), pool: HS.Card[] | { id: string }[] = []) => {
  pending[mode] ||= {
    pool: (pool as HS.Card[]).sort((a, b) => a.dbfId - b.dbfId),
    picks: [],
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
  const session = pending[mode];
  const { rules, options } = (rules => ({ rules, options: rules.build(session.pool) }))(find(mode));
  // prettier-ignore
  return {
    get options() { return options; },
    get picks() { return session.picks; },
    get filter() { return session.filter; },
    get rules() { return rules; },
    get validation() { return rules.validate(session.picks); },
    canAdd: (candidate: HS.Card) => rules.canAdd(session.picks, candidate),
    check: () => {
      console.log('check', Date.now());
      const f = session.pool.filter(
        c => rules.check(session.filter, c).every(Boolean) &&
        (session.filter.search.length < 4 ||
          [c.rarity, c.name, c.flavor, c.text].some(field => eqludes(String(field), session.filter.search))))
      console.log('check', Date.now());
      return f
        },
    clear: () => delete pending[mode]
  };
};
