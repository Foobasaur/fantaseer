import type { Game, HS } from '@';
import { Scores } from '../games.server';
import CDN from './common/cdn';

// Internal State =============================
const legal: Returnz<typeof CDN> = { Wild: [], Arena: [], Standard: [], Battlegrounds: [], cards: [] };
let idbi = new Map<string, HS.Card>();
// ============================================

type HSS = Game.Server<'HS', HS.Card, typeof HS.MODES>;
export const hs: HSS = {
  code: 'HS',
  name: 'Hearthstone',
  scores: Scores({
    pw: { win: { weight: 50 }, lose: { weight: 5 } },
    ew: { observed: { weight: 90 }, matched: { weight: 30 } }
  }),

  draftables: mode =>
    mode ?
      [...new Set(legal.cards.filter(c => legal[mode].includes(c.id)).map(c => c.set as string))]
    : [...new Set(legal.cards.map(c => c.set as string))],
  pickables: mode => (mode ? legal.cards.filter(c => legal[mode].includes(c.id)) : legal.cards),
  toPickable: (card => (Array.isArray(card) ? card.map(c => c.id) : card.id)) as HSS['toPickable'],
  fromPickable: (idbs => (Array.isArray(idbs) ? idbs.map(id => idbi.get(id)) : idbi.get(idbs))) as HSS['fromPickable'],

  init: async () => {
    Object.assign(legal, await CDN());
    idbi = new Map<string, HS.Card>(legal.cards.map(c => [c.id, c]));
    return ((hs.loaded = true), hs);
  }
};
