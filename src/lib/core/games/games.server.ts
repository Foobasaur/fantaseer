import type { Game } from '@';

import { zipLeaves } from '$lib/utilz/morph';
import { waitFor } from '$lib/utilz/polly';
import { error } from '@sveltejs/kit';

// Registry stores modules with erased generics for runtime lookup
export const mapping = new Map<Game.Code, Game.Server<Game.Code, any, any>>();

/** Get a game module by Game.Code (throws if not found) */
export const get = <T>(game?: Game.Code | string) => {
  const code = game as Game.Code; // Cast to Game.Code for type safety
  const m = mapping.get(code) || error(404); //throw new Error(`Game module not registered: ${code}`);
  return waitFor(() => m.loaded === true, { timeout: 60, step: 500 })
    .catch((e: Error) => error(500, `${code}: ${e.message}`))
    .then(() => m as Game.Server<typeof code, T, any>);
};

export const init = async (modules: Game.Server<Game.Code, any, any>[]) => {
  for (const m of modules.filter(m => !mapping.has(m.code))) {
    console.log(`Initializing ${m.name} module...`, new Date().toLocaleTimeString());
    mapping.set(m.code, await m.init());
    console.log(`Initializing ${m.name} Done`, new Date().toLocaleTimeString());
  }
};

export const Scores = (
  weights: Game.Scores<Pick<Game.Metric, 'weight'>>,
  defs: Game.Scores<Omit<Game.Metric, 'weight'>> = {
    ew: {
      observed: { label: 'Perfect Pick', description: 'Picked card AND watched it play' },
      matched: { label: 'Matched Pick', description: 'Picked but missed the moment' }
    },
    pw: {
      win: { label: 'Win', description: 'Correctly picked a pick`em' },
      lose: { label: 'Lose', description: 'Divide points by this for bonus points' }
    }
  }
): Game.Scores => zipLeaves(defs, weights);
