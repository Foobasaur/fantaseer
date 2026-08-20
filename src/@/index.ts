export type * from '$lib/core/types';
export type * from '$lib/core/games/HS/types';
export type * from '$lib/common/twitch/types';
export type * from '$lib/server/types';
export type * from './basic';

import type { PageData } from '../routes/app/[game]/[[mode]]/fantasy/new/$types';
export type FantasyDraftPageData = R3place<PageData, 'req', Awaited<PageData['req']>>;

export const fabio = [
  { route: '/app/[game]/[[mode]]', title: 'home', icon: '🕹️' },
  { route: '/app/[game]/[[mode]]/fantasy', title: 'fantasy', icon: '✨' },
  { route: '/app/[game]/[[mode]]/pickaroo', title: 'pickaroo', icon: '⚡' },
  { route: '/app/[game]/[[mode]]/scores', title: 'scores', icon: '🏆' }
] as const;