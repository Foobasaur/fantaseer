import { zipLeaves } from '$lib';
import type { Game } from '@';

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
