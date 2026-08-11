import type { Game } from '@';
import type { Card, MODES } from './types';

import { Scores } from '../games.server';
import CDN from './api/cdn';

// ============================================
// Internal State
// ============================================
let cards = new Array<Card>();
let idbi = new Map<string, Card>();
const legal = {
  Arena: [] as string[],
  Standard: [] as string[],
  Wild: [] as string[],
  Battlegrounds: [] as string[]
};
// ============================================
// Module Implementation
// ============================================
type HSS = Game.Server<'HS', Card, typeof MODES>;
export const hs: HSS = {
  code: 'HS',
  name: 'Hearthstone',
  scores: Scores({
    pw: { win: { weight: 50 }, lose: { weight: 5 } },
    ew: { observed: { weight: 90 }, matched: { weight: 30 } }
  }),

  draftables: mode =>
    mode ?
      [...new Set(cards.filter(c => legal[mode].includes(c.id)).map(c => c.set as string))]
    : [...new Set(cards.map(c => c.set as string))],
  pickables: mode => (mode ? cards.filter(c => legal[mode].includes(c.id)) : cards),
  toPickable: (card => (Array.isArray(card) ? card.map(c => c.id) : card.id)) as HSS['toPickable'],
  fromPickable: (idbs => (Array.isArray(idbs) ? idbs.map(id => idbi.get(id)) : idbi.get(idbs))) as HSS['fromPickable'],

  init: async () => {
    cards = [...Object.assign(legal, await CDN()).cards];
    cards.forEach(c => idbi.set(c.id, c));
    return ((hs.loaded = true), hs);
  }
};
