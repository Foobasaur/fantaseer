export type * from '$lib/core/games/types';
export type * from '$lib/core/twitch/types';
export type * from '$lib/server/types';
export type * from './basic';

export type { PageData as FantasyPageData } from '../routes/app/[game]/[[mode]]/fantasy/$types';
export type { PageData as FantasyDraftPageData } from '../routes/app/[game]/[[mode]]/fantasy/[draft]/$types';

export const CODES = ['HS'] as const; // add more as needed ie: 'LOL', 'DOTA'
export const identify = <T>(x: T): T => x;

