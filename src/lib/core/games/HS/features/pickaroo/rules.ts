/**
 * Hearthstone draft rules.
 * Works directly with Card type - no abstraction.
 */
import type { Game } from '@';
import type { GameMode } from '../../hs';
import type { Card } from '../../types';

// FILTER STORE: Manages filtration state for card browser

type Rules = Game.Pickaroo<Card, GameMode>;
const basic: Rules = {
  modes: ['Standard', 'Arena', 'Wild'],
  describe: "Next 3 Turn Draw",
  display(card) {
    return card.img.render['256x'];
  }
};

const bg: Rules = {
  modes: ['Battlegrounds'],
  describe: "Next Top 4 Placement",
  display(card) {
    return card.type === 'HERO' ? card.img.hero['256x'] : card.img.render['256x'].replace('/render/', '/bgs/');
  }
};

export const create = (mode: 'Standard' | 'Arena' | 'Wild' | 'Battlegrounds' | (string & {}) = 'Standard') => {
  return {
    get rules() {
      return [basic, bg].find(r => r.modes.includes(mode as GameMode)) || basic;
    }
  };
};
