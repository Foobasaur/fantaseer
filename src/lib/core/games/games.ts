/**
 * Runtime registry for game modules.
 * Stores modules with erased generics for dynamic lookup.
 */
import type { Game } from '@';
import { error } from '@sveltejs/kit';
import { hs } from './HS/hs';

// Registry stores modules with erased generics for runtime lookup
export const mapping = new Map<Game.Code, Game.Client<Game.Code>>();

/** Get a game module by Game.Code (throws if not found) */
export const gg = (game: Game.Code | string) => {
  const code = game as Game.Code; // Cast to Game.Code for type safety
  return mapping.get(code) || error(404, `Game module not registered: ${code}`); //throw new Error(`Game module not registered: ${code}`);
};

/** Register a game module */
export const init = () => {
  mapping.set(hs.code, hs);
};

// $lib/svelted/ui/layout/stats.ts (or wherever fits)
export const stats = <T extends { scoreable: { title: string; icon: string }; events?: number }>(
  items: T[],
  filter: (t: T) => boolean = t => t.scoreable.icon !== '♾️'
) =>
  Array.from(
    Map.groupBy(items.filter(filter), e => e.scoreable.title),
    ([title, group]) => ({
      title,
      icon: group[0].scoreable.icon,
      value: group.reduce((n, e) => n + (e.events ?? 1), 0)
    })
  ).sort((a, b) => b.value - a.value);
