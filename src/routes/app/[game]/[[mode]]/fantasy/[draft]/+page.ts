import { dependz } from '$lib/svelted/app';
import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';

const newz: Partial<Record<string, Server.EBS.Draft<'get'>>> = {};
export const load: PageLoad = async ({ fetch, depends, untrack, params }) => {
  const req = ebs<Server.EBS.Draft<'get'>>({ fetch, path: `/app/${params.game}/${params.mode}/fantasy/${params.draft}` });
  return await (async news => (news ? (newz[news] ??= await req.get()) : req.get()))(
    untrack(() => params.draft === 'new' && params.mode) || depends(dependz.draft)
  );
};
