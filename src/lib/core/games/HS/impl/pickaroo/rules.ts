import type { Game, HS } from '@';

type Rules = Game.Pickaroo<HS.Card, HS.Mode>;
const basic: Rules = {
  modes: ['Standard', 'Arena', 'Wild'],
  describe: 'Next 3 Turn Draw',
  display(card) {
    return card.img.render['256x'];
  }
};

const bg: Rules = {
  modes: ['Battlegrounds'],
  describe: 'Next Top 4 Placement',
  display(card) {
    return card.type === 'HERO' ? card.img.hero['256x'] : card.img.render['256x'].replace('/render/', '/bgs/');
  }
};

export const create = (mode: HS.Mode | (string & {}) = 'Standard') => {
  return {
    get rules() {
      return [basic, bg].find(r => r.modes.includes(mode as HS.Mode)) || basic;
    }
  };
};
