import { SETS } from '$lib/core/games/HS/hs';
import { blobby, checker, collect, defs, drawable, PREFIXER } from '$lib/utilz/morph';
import type { Game, HS } from '@';

export interface Filter extends Game.Filter {
  mana: number;
  tier: number;
  radials: strumbol[];
  set: string;
  card: string;
  minion: string;
  spell: string;
  mechanic: string;
}

interface Rules extends Game.Fantasy<HS.Card, HS.Mode | (string & {}), Filter> {
  readonly slider: 'tier' | 'mana';
  build(pool: HS.Card[]): {
    haystack: { needles: string; daggers: string[] }[];
    draftables: Record<string, string>;
    radials: ReturnType<typeof drawable>;
    mechanics: Record<string, string>;
    types?: Record<'card' | 'minion' | 'spell' | 'rarity', Record<string, string>>;
  };
}

const keywordz = (pool: HS.Card[], values: Iterable<unknown> = []) => {
  const pairs = [...values].map(value => (key => [key, `<b>${key.toLowerCase()}`] as const)(String(value)));
  return pool.map(c => {
    const text = c.text?.toLowerCase();
    return {
      needles: [c.rarity, c.name, c.flavor, c.text].join('').toLowerCase(),
      daggers: pairs
        .filter(([key, bold]) => c.mechanics?.includes(key) || c.referencedTags?.includes(key) || text?.includes(bold))
        .map(([key]) => key)
    };
  });
};

export const basic: Rules = {
  length: 12,
  slider: 'mana',
  modes: ['Standard', 'Arena', 'Wild'],
  display: card => card.img.render['256x'],
  build(pool) {
    const it = collect(pool, c => ({
      set: c.set,
      card: c.type,
      mechanic: c.mechanics,
      class: [c.cardClass, ...(c.classes ?? [])],
      minion: [c.race, ...(c.races ?? [])],
      spell: c.spellSchool,
      rarity: c.rarity
    }));
    return {
      radials: drawable(blobby(import.meta.glob('$lib/assets/hs/class/*.png', { eager: true })), defs('Class', it.class)),
      haystack: keywordz(pool, it.mechanic),
      draftables: defs('Set', it.set, key => SETS[key], null),
      mechanics: defs('Mechanic', it.mechanic),
      types: {
        card: defs('Card Type', it.card),
        minion: defs('Minion Type', it.minion),
        spell: defs('Spell School', it.spell),
        rarity: defs('Rarity', it.rarity)
      }
    };
  },
  check(filter, c) {
    const race = filter.card === 'MINION' ? filter.minion : PREFIXER;
    const spell = filter.card === 'SPELL' ? filter.spell : PREFIXER;
    return [
      filter.mana < 0 || (filter.mana >= 9 && Number(c.cost) >= 9) || checker(filter.mana, c.cost),
      filter.radials.length === 0 || checker(filter.radials, [c.cardClass, ...(c.classes || [])]),
      checker(filter.set, c.set),
      checker(filter.card, c.type),
      checker(race, c.race),
      checker(spell, c.spellSchool)
    ];
  }
};

export const bg: Rules = {
  length: 8,
  slider: 'tier',
  modes: ['Battlegrounds'],
  display: card => (card.type === 'HERO' ? card.img.hero['256x'] : card.img.render['256x'].replace('/render/', '/bgs/')),
  build(pool) {
    const it = collect(pool, c => ({
      unit: [c.type, c.battlegroundsTimewarpCard != null ? 'TIMEWARPED' : undefined],
      tribe: [c.race, ...(c.races ?? [])],
      mechanic: c.mechanics
    }));
    return {
      radials: drawable(blobby(import.meta.glob('$lib/assets/hs/tribes/*.jpg', { eager: true })), defs('Tribe', it.tribe)),
      haystack: keywordz(pool, it.mechanic),
      draftables: defs('Unit Type', it.unit),
      mechanics: defs('Mechanic', it.mechanic)
    };
  },
  check(filter, c) {
    const radius = filter.set === 'MINION' || filter.set === PREFIXER ? filter.radials : PREFIXER;
    return [
      checker(filter.set, c.type) || (filter.set === 'TIMEWARPED' && c.battlegroundsTimewarpCard != null),
      filter.tier < 1 || checker(filter.tier, c.techLevel),
      filter.radials.length === 0 || checker(radius, [c.race, ...(c.races || [])])
    ];
  }
};

export const adopt = (mode: string, pool: HS.Card[]) => {
  const rules = [basic, bg].find(r => r.modes.includes(mode)) || basic;
  const options = rules.build(pool);
  return { rules, options };
};
