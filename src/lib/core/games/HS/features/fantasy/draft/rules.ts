/**
 * Hearthstone draft rules.
 * Works directly with Card type - no abstraction.
 */
import { battlegrounds, filtrations } from '$lib/core/games/HS/hs';
import type { GameMode } from '$lib/core/games/HS/hs';
import type { Card } from '$lib/core/games/HS/types';
import { blobby, checker, PREFIXER } from '$lib/utilz/morph';
import type { Game } from '@';

export interface Filter {
  mana: number;
  tier: number;
  radials: strumbol[];
  set: strumbol;
  card: strumbol;
  minion: strumbol;
  spell: strumbol;
  mechanic: strumbol;
}

type Rules = Game.Fantasy<Card, GameMode, Filter> & {
  readonly slider: 'tier' | 'mana';
  readonly mechanics: kvp<strumbol, strumbol>[];
  readonly radial: { collection: strumbol[]; imgs: Record<string, string> };
  readonly types?: typeof filtrations.types;
};
export const basic: Rules = {
  length: 12,
  slider: 'mana',
  mechanics: filtrations.mechanics,
  types: filtrations.types,
  modes: ['Standard', 'Arena', 'Wild'],
  radial: {
    collection: filtrations.classes.slice(1).map(c => c[0]),
    imgs: blobby(import.meta.glob('$lib/assets/hs/class/*.png', { eager: true }))
  },
  canAdd(current, candidate) {
    if (current.length >= this.length) return false;
    const count = current.filter(c => c.dbfId === candidate.dbfId).length;
    return count === 0;
  },
  validate(picks) {
    return {
      valid: picks.length === this.length,
      errors: [`Need ${this.length} cards`]
    };
  },
  display(card) {
    return card.img.render['256x'];
  },
  draftables(sets) {
    return [
      filtrations.sets[0],
      ...(!sets ? filtrations.sets : filtrations.sets.filter(s => sets.includes(s[0] as string)))
    ];
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
  modes: ['Battlegrounds'],
  mechanics: battlegrounds.mechanics,
  slider: 'tier',
  radial: {
    collection: battlegrounds.tribes.slice(1).map(t => t[0]),
    imgs: blobby(import.meta.glob('$lib/assets/hs/tribes/*.jpg', { eager: true }))
  },

  canAdd(current, candidate) {
    if (current.length >= this.length) return false;
    const count = current.filter(c => c.dbfId === candidate.dbfId).length;
    return count === 0;
  },
  validate(picks) {
    return {
      valid: picks.length === this.length,
      errors: [`Need ${this.length} cards`]
    };
  },
  display(card) {
    return card.type === 'HERO' ? card.img.hero['256x'] : card.img.render['256x'].replace('/render/', '/bgs/');
  },
  draftables(_) {
    return battlegrounds.units;
  },
  check(filter, c) {
    const radius = filter.set === 'MINION' || filter.set === PREFIXER ? filter.radials : PREFIXER;
    return [
      checker(filter.set, c.type) || (filter.set === 'WORP_MINION' && c.battlegroundsTimewarpCard != null),
      battlegrounds.units.some(u => u[0] === c.type),
      filter.tier < 1 || checker(filter.tier, c.techLevel),
      filter.radials.length === 0 || checker(radius, [c.race, ...(c.races || [])])
    ];
  }
};
