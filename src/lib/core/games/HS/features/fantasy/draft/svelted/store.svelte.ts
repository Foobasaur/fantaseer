import { filtrations } from '$lib/core/games/HS/hs';
import type { GameMode } from '$lib/core/games/HS/hs';
import type { Card } from '$lib/core/games/HS/types';
import { basic, bg, type Filter } from '../rules';

// PENDING — WIP drafts keyed by mode, survives create() re-entry
const pending = $state<Partial<Record<GameMode,  { picks: Card[]; filter: Filter }>>>({});

// STORE
export const create = (mode: 'Standard' | 'Arena' | 'Wild' | 'Battlegrounds' | (string & {}) = 'Standard') => {
  const key = mode as GameMode;
  const rules = [basic, bg].find(r => r.modes.includes(key)) || basic;
   const session = pending[key] ??= {
    picks: [],
    filter: {
      mana: -1,
      tier: 0,
      radials: [] as strumbol[],
      set: filtrations.sets[0][0],
      card: filtrations.types.card[0][0],
      minion: filtrations.types.minion[0][0],
      spell: filtrations.types.spell[0][0],
      mechanic: filtrations.mechanics[0][0]
    }
  };

  return {
    get picks() {
      return session.picks;
    },
    get filter() {
      return session.filter;
    },
    get rules() {
      return rules;
    },
    get validation() {
      return rules.validate(session.picks);
    },
    canAdd(candidate: Card) {
      return rules.canAdd(session.picks, candidate);
    },
    check(candidate: Card) {
      return rules.check(session.filter, candidate);
    },
    clear() {
      delete pending[key];
    }
  };
};
