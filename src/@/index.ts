export type * from '$lib/core/types';
export type * from '$lib/core/games/HS/types';
export type * from '$lib/common/twitch/types';
export type * from '$lib/server/types';
export type * from './basic';

import type { PageData } from '../routes/app/[game]/[[mode]]/fantasy/new/$types';
export type FantasyDraftPageData = R3place<PageData, 'req', Awaited<PageData['req']>>;
