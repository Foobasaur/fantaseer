/**
 * Runtime registry for game modules.
 * Stores modules with erased generics for dynamic lookup.
 */
import type { Game } from '@';
import { error } from '@sveltejs/kit';
import { hs } from './HS/hs.server';

// Registry stores modules with erased generics for runtime lookup
export const mapping = new Map<Game.Code, Game.Server<Game.Code, any, any>>();

/** Get a game module by Game.Code (throws if not found) */
export const gg = async <T>(game?: Game.Code | string) => {
  const code = game as Game.Code; // Cast to Game.Code for type safety
  const m = mapping.get(code) || error(404); //throw new Error(`Game module not registered: ${code}`);
  await m.initialized; // Ensure the module is initialized before returning
  return m as Game.Server<typeof code, T>;
};
export const init = async () => {
  if(!mapping.get(hs.code)) mapping.set(hs.code, await hs.init());
};
