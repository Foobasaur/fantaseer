import ebs from '$lib/svelted/ebs';
import type { Server } from '@';
import type { PageLoad } from './$types';
import { lbizaMap } from '$lib/utilz/lbizaMap';
import { dependz } from '$lib/svelted/app';

const news = new lbizaMap<string, { pickables: { id: string }[]; draftables: string[] }>();
export const load: PageLoad = async ({ fetch, depends, params }) => {
  depends(dependz.draft);
  const req = ebs({ fetch, path: `/app/${params.game}/${params.mode}/fantasy/${params.draft}` });
  const data = await (params.mode && params.draft === 'new' ?
    news.getOrAwait(params.mode, req.get)
  : req.get<Server.EBS.Draft<'get'>>());
  return data;
};
