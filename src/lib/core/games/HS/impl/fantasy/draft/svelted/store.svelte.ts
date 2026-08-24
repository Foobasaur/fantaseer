import { goto } from '$app/navigation';
import { page } from '$app/state';
import ebs from '$lib/common/ebs';
import { adopt, type Filter } from '$lib/core/games/HS/impl/fantasy/draft/rules';
import { PREFIXER } from '$lib/utilz/morph';
import { faster, tc } from '$lib/utilz/polly';
import type { HS, Server } from '@';

// STATE
const cache = $state<Partial<Record<string, { filtered: HS.Card[]; picks: HS.Card[]; filter: Filter }>>>({});
const status = $state({ open: false, mechanics: {} as Record<string, string> });

// STORE
export const create = (mode: HS.Mode | (string & {}), pool: HS.Card[]) => {
  cache[mode] ||= {
    picks: [],
    filtered: [],
    filter: {
      tier: 0,
      mana: -1,
      search: '',
      radials: [],
      set: PREFIXER,
      card: PREFIXER,
      spell: PREFIXER,
      minion: PREFIXER,
      mechanic: PREFIXER,
    }
  };
  const session = cache[mode];
  const { rules, options } = adopt(mode, pool);
  $effect(() => {
    session.filtered = [];
    status.mechanics = { [PREFIXER]: options.mechanics[PREFIXER] };
    const { tier, mana, search, set, card, spell, minion, mechanic, radials } = session.filter;
    const filter: Filter = { tier, mana, search, set, card, spell, minion, mechanic, radials };
    const needle = search.toLowerCase();
    return faster(pool.length, i => {
      const card = pool[i];
      if (!rules.check(filter, card).every(Boolean)) return;
      else if (needle.length >= 4 && !options.keywords[i].haystack.includes(needle)) return;
      else {
        const reference = options.keywords[i].reference;
        for (const key of reference.filter(k => !(k in status.mechanics))) status.mechanics[key] = options.mechanics[key];
        if (mechanic.startsWith(PREFIXER) || reference.includes(mechanic)) session.filtered.push(card);
      }
    });
  });
  return {
    status,
    session,
    rules,
    options,
    get validation() {
      return {
        valid: session.picks.length === rules.length,
        errors: [`Need ${rules.length} cards`]
      };
    },
    remove: (card: HS.Card) => {
      const idx = session.picks.findIndex(c => c.id === card.id);
      if (idx > -1) session.picks.splice(idx, 1);
    },
    submit: () =>
      tc(async () => {
        const req = ebs(`/app/${page.params.game}/${page.params.mode}/fantasy/new`);
        const res = await req.post<Server.EBS.Draft<'post'>>({ picks: session.picks });
        if (res.success) {
          goto(`/app/${page.params.game}/${page.params.mode}/fantasy/`, { replaceState: true });
          delete cache[mode];
        } else throw new Error('Failed to create draft');
      })
  };
};
