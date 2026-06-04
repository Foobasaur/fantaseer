import { waitFor } from '$lib/utilz/polly';
import type { Game } from '@';
import CDN from './api/cdn';
import type { Card } from './types';
import { MODES } from './hs';

// ============================================
// Internal State
// ============================================
let initialized = false;
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
type HSS = Game.IGame<'HS', Card, typeof MODES>;
export const hs: HSS = {
  code: 'HS',
  name: 'Hearthstone',
  scores: {
    // Engagement weights (90:30:10 ratio)
    ew: {
      observed: {
        weight: 90,
        label: 'Perfect Picks',
        description: 'Picked card AND watched it play - best outcome'
      },
      picked: {
        weight: 30,
        label: 'Missed Watches',
        description: 'Picked card but missed the moment'
      },
      unpicked: {
        weight: 10,
        label: 'Unpicked Watches',
        description: "Was just there for the moment, but didn't pick the card"
      }
    },

    // pickaroo  weights
    pw: {
      win: {
        weight: 50,
        label: 'Correct Pickaroo',
        description: 'Correctly picked a pick`em'
      },
      lose: {
        weight: 2,
        label: 'Missed Pickaroo',
        description: 'Divide points by this for bonus points'
      }
    }
  },

  get initializeer() {
    return waitFor(() => initialized, { timeout: 60, step: 500 }).catch(() => {
      console.warn('Failed to initialize HS module: cards did not load in time');
      return initialized;
    });
  },
  async init() {
    initialized = false;
    console.log('Initializing HS module...', new Date().toLocaleTimeString());
    const contents = await CDN();
    Object.assign(legal, contents);
    cards = [...contents.cards];
    cards.forEach(c => idbi.set(c.id, c));
    console.log('Initializing HS Done', new Date().toLocaleTimeString());
    initialized = true;
    return this;
  },
  draftables: mode =>
    mode ?
      [...new Set(cards.filter(c => legal[mode].includes(c.id)).map(c => c.set as string))]
    : [...new Set(cards.map(c => c.set as string))],
  pickables: mode => (mode ? cards.filter(c => legal[mode].includes(c.id)) : cards),
  toPickable: (card => (Array.isArray(card) ? card.map(c => c.id) : card.id)) as HSS['toPickable'],
  fromPickable: (idbs =>
    Array.isArray(idbs) ? idbs.map(id => idbi.get(id)).filter(Boolean) : idbi.get(idbs)) as HSS['fromPickable']
};
